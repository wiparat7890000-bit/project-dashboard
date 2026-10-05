"use client";

import { useSyncExternalStore } from "react";
import { DEPT_LIST_DEFAULT, DEV_LIST_DEFAULT, STORAGE_KEYS } from "./constants";
import { DEFAULT_PHASES } from "./types";
import { mergePhases } from "./utils";
import { createSampleData } from "./sampleData";
import { normalizeProject, normalizeTask, normalizeUpdate } from "./importExport";
import { diffData, EMPTY_DATA } from "./sync";
import type { DashboardData } from "./types";

/**
 * Tiny external store persisted to localStorage.
 * The server snapshot is `null`, so the dashboard renders only on the client
 * (localStorage and "today" are browser-only).
 */
let state: DashboardData | null = null;
const listeners = new Set<() => void>();

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function nonEmptyStringArray(v: unknown): string[] | null {
  return Array.isArray(v) && v.length ? v.map(String) : null;
}

function load(): DashboardData {
  const storedProjects = readJSON<unknown[]>(STORAGE_KEYS.projects);
  const storedTasks = readJSON<unknown[]>(STORAGE_KEYS.tasks);
  const storedUpdates = readJSON<unknown[]>(STORAGE_KEYS.updates);
  const devList = nonEmptyStringArray(readJSON(STORAGE_KEYS.devList)) ?? [...DEV_LIST_DEFAULT];
  const deptList = nonEmptyStringArray(readJSON(STORAGE_KEYS.deptList)) ?? [...DEPT_LIST_DEFAULT];
  const storedPhases = readJSON<unknown>(STORAGE_KEYS.phaseList);
  // An empty saved list is valid (the user removed every phase); only a missing list gets the defaults.
  const phaseList = Array.isArray(storedPhases) ? storedPhases.map(String) : [...DEFAULT_PHASES];

  if (Array.isArray(storedProjects) && storedProjects.length) {
    const projects = storedProjects.map((p, i) => normalizeProject(p, i));
    const tasks = Array.isArray(storedTasks) ? storedTasks.map((t) => normalizeTask(t, phaseList)) : [];
    const updates = Array.isArray(storedUpdates) ? storedUpdates.map(normalizeUpdate) : [];
    return { projects, tasks, updates, devList, deptList, phaseList: mergePhases(phaseList, tasks) };
  }
  const data = { ...createSampleData(), devList, deptList, phaseList };
  persist(data);
  return data;
}

function persist(data: DashboardData) {
  try {
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(data.projects));
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(data.tasks));
    localStorage.setItem(STORAGE_KEYS.updates, JSON.stringify(data.updates));
    localStorage.setItem(STORAGE_KEYS.devList, JSON.stringify(data.devList));
    localStorage.setItem(STORAGE_KEYS.deptList, JSON.stringify(data.deptList));
    localStorage.setItem(STORAGE_KEYS.phaseList, JSON.stringify(data.phaseList));
  } catch {
    // storage full or unavailable — keep working in memory
  }
}

function getSnapshot(): DashboardData {
  if (!state) state = load();
  return state;
}

const getServerSnapshot = () => null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateData(updater: (prev: DashboardData) => DashboardData) {
  state = updater(getSnapshot());
  persist(state);
  listeners.forEach((l) => l());
  void flush();
}

export function useDashboardData(): DashboardData | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Postgres sync (DATABASE_URL) ──────────────────────────────────────────────
//
// When the server has a database, it becomes the source of truth: the app loads
// from GET /api/data and every change is sent to POST /api/sync as a diff against
// the last state the server confirmed. localStorage stays as an offline cache.
// Without a database (or when it can't be reached) the app works as before,
// browser-only.

export interface SyncState {
  /** "remote" once the database is in use; "local" = browser storage only. */
  mode: "local" | "remote";
  status: "connecting" | "saving" | "saved" | "error" | "idle";
  message?: string;
  savedAt?: number;
}

let sync: SyncState = { mode: "local", status: "idle" };
const syncListeners = new Set<() => void>();
const setSync = (next: Partial<SyncState>) => {
  sync = { ...sync, ...next };
  syncListeners.forEach((l) => l());
};

/** Last state the server confirmed; diffs are computed against it. */
let serverState: DashboardData | null = null;
let inflight = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let connectStarted = false;

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (l) => {
      syncListeners.add(l);
      return () => syncListeners.delete(l);
    },
    () => sync,
    () => sync,
  );
}

async function flush(): Promise<void> {
  if (sync.mode !== "remote" || inflight || !state || !serverState) return;
  const target = state;
  const payload = diffData(serverState, target);
  if (!payload) {
    setSync({ status: "saved" });
    return;
  }
  inflight = true;
  clearTimeout(retryTimer);
  setSync({ status: "saving", message: undefined });
  try {
    const res = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    serverState = target;
    setSync({ status: "saved", savedAt: Date.now() });
  } catch (e) {
    // Keep serverState as-is: the next attempt re-sends everything not yet confirmed.
    setSync({ status: "error", message: (e as Error).message });
    retryTimer = setTimeout(() => void flush(), 10_000);
    return;
  } finally {
    inflight = false;
  }
  if (state !== target) void flush(); // more edits arrived while saving
}

/** Use the server's data, keeping this browser's pick-lists where the database has none yet. */
function adoptRemote(remote: DashboardData) {
  const local = getSnapshot();
  serverState = remote;
  const tasks = remote.tasks.map((t) => normalizeTask(t, remote.phaseList));
  const phaseList = remote.phaseList.length ? remote.phaseList : local.phaseList;
  state = {
    ...remote,
    tasks,
    devList: remote.devList.length ? remote.devList : local.devList,
    deptList: remote.deptList.length ? remote.deptList : local.deptList,
    phaseList: mergePhases(phaseList, tasks),
  };
  persist(state);
  listeners.forEach((l) => l());
}

async function fetchRemote(): Promise<{ data?: DashboardData; configured: boolean; error?: string }> {
  try {
    const res = await fetch("/api/data", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as { configured?: boolean; data?: DashboardData; error?: string };
    return { configured: body.configured ?? false, data: res.ok ? body.data : undefined, error: body.error };
  } catch (e) {
    return { configured: true, error: (e as Error).message };
  }
}

/**
 * Connect to the database once per page load. Returns how many projects were
 * uploaded when the database was empty (this browser's data seeds it).
 */
export async function connectRemote(): Promise<{ uploaded: number }> {
  if (connectStarted) return { uploaded: 0 };
  connectStarted = true;
  setSync({ status: "connecting" });
  const { data, configured, error } = await fetchRemote();
  if (!configured) {
    setSync({ mode: "local", status: "idle" });
    return { uploaded: 0 };
  }
  if (!data) {
    setSync({ mode: "local", status: "error", message: error ?? "Database unavailable" });
    connectStarted = false; // allow a later retry (e.g. on focus)
    return { uploaded: 0 };
  }

  setSync({ mode: "remote" });
  window.addEventListener("focus", () => void refreshFromServer());
  if (!data.projects.length && !data.tasks.length && !data.updates.length) {
    serverState = EMPTY_DATA;
    await flush();
    return { uploaded: getSnapshot().projects.length };
  }
  adoptRemote(data);
  await flush(); // push pick-lists filled in from this browser, if any
  return { uploaded: 0 };
}

/** Pick up other people's changes (on window focus) when nothing local is waiting to be saved. */
export async function refreshFromServer(): Promise<void> {
  if (sync.mode !== "remote") {
    if (sync.status === "error") void connectRemote();
    return;
  }
  if (inflight || (state && serverState && diffData(serverState, state))) return;
  const { data } = await fetchRemote();
  if (!data || inflight || (state && serverState && diffData(serverState, state))) return;
  if (serverState && !diffData(serverState, data)) return;
  adoptRemote(data);
}
