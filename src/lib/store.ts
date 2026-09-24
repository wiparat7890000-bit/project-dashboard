"use client";

import { useSyncExternalStore } from "react";
import { DEPT_LIST_DEFAULT, DEV_LIST_DEFAULT, STORAGE_KEYS } from "./constants";
import { DEFAULT_PHASES } from "./types";
import { mergePhases } from "./utils";
import { createSampleData } from "./sampleData";
import { normalizeProject, normalizeTask, normalizeUpdate } from "./importExport";
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
}

export function useDashboardData(): DashboardData | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
