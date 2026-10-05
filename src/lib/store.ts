"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_PHASES } from "./types";
import { mergePhases } from "./utils";
import { normalizeTask } from "./importExport";
import { diffData } from "./sync";
import type { DashboardData } from "./types";

/**
 * Client store for the dashboard. The Postgres database (GET /api/data) is the only
 * source of data: the store stays empty (null) until it has loaded, and every change
 * is sent to POST /api/sync as a diff against the last state the server confirmed.
 */
let state: DashboardData | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Apply a change and save it to the database. Ignored until the data has loaded. */
export function updateData(updater: (prev: DashboardData) => DashboardData) {
  if (!state) return;
  state = updater(state);
  emit();
  void flush();
}

/** The dashboard data, or null while it is loading (or could not be loaded). */
export function useDashboardData(): DashboardData | null {
  return useSyncExternalStore(subscribe, () => state, () => null);
}

// ── Database sync ─────────────────────────────────────────────────────────────

export interface SyncState {
  /**
   * loading: first fetch in progress · unconfigured: server has no DATABASE_URL ·
   * error: loading or saving failed · saving / saved: changes being / all written.
   */
  status: "loading" | "unconfigured" | "saving" | "saved" | "error";
  message?: string;
  savedAt?: number;
}

let sync: SyncState = { status: "loading" };
const syncListeners = new Set<() => void>();
const setSync = (next: Partial<SyncState>) => {
  sync = { ...sync, ...next };
  syncListeners.forEach((l) => l());
};

/** Last state the server confirmed; diffs are computed against it. */
let serverState: DashboardData | null = null;
let inflight = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let loading: Promise<void> | null = null;
let focusListener = false;

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
  if (inflight || !state || !serverState) return;
  const target = state;
  const payload = diffData(serverState, target);
  if (!payload) {
    setSync({ status: "saved", message: undefined });
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

/** Show the server's data; a brand-new database gets the standard phase list. */
function adopt(remote: DashboardData) {
  serverState = remote;
  const tasks = remote.tasks.map((t) => normalizeTask(t, remote.phaseList));
  const fresh = !remote.projects.length && !remote.phaseList.length;
  const phaseList = fresh ? [...DEFAULT_PHASES] : remote.phaseList;
  state = { ...remote, tasks, phaseList: mergePhases(phaseList, tasks) };
  emit();
}

async function fetchRemote(): Promise<{ data?: DashboardData; configured: boolean; error?: string }> {
  try {
    const res = await fetch("/api/data", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as { configured?: boolean; data?: DashboardData; error?: string };
    return { configured: body.configured ?? true, data: res.ok ? body.data : undefined, error: body.error ?? (res.ok ? undefined : `HTTP ${res.status}`) };
  } catch (e) {
    return { configured: true, error: (e as Error).message };
  }
}

/** Old builds kept a copy of the data in localStorage; it is no longer used. */
function clearLegacyCache() {
  try {
    for (const key of ["isd_projects", "isd_tasks", "isd_project_updates", "isd_dev_list", "isd_dept_list", "isd_phase_list"]) localStorage.removeItem(key);
  } catch {
    // storage unavailable — nothing to clear
  }
}

/** Load the dashboard from the database. Safe to call repeatedly (e.g. a Retry button). */
export function loadData(): Promise<void> {
  if (state) return Promise.resolve();
  loading ??= (async () => {
    setSync({ status: "loading", message: undefined });
    clearLegacyCache();
    const { data, configured, error } = await fetchRemote();
    loading = null;
    if (!configured) return setSync({ status: "unconfigured", message: undefined });
    if (!data) return setSync({ status: "error", message: error ?? "Database unavailable" });
    adopt(data);
    if (!focusListener) {
      focusListener = true;
      window.addEventListener("focus", () => void refreshFromServer());
    }
    await flush(); // saves the default phase list of a brand-new database
  })();
  return loading;
}

/** Pick up other people's changes (on window focus) when nothing local is waiting to be saved. */
export async function refreshFromServer(): Promise<void> {
  if (!state) return loadData();
  const pending = () => inflight || (state && serverState && diffData(serverState, state));
  if (pending()) return;
  const { data } = await fetchRemote();
  if (!data || pending()) return;
  if (serverState && !diffData(serverState, data)) return;
  adopt(data);
}
