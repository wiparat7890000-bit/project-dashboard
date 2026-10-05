import type { DashboardData, Project, ProjectUpdate, Task } from "./types";

/** Rows to write and ids to delete for one table. */
export interface TableChanges<T> {
  upsert: (T & { position: number })[];
  delete: string[];
}

/** What changed between two dashboard states; sent to POST /api/sync. */
export interface SyncPayload {
  projects?: TableChanges<Project>;
  tasks?: TableChanges<Task>;
  updates?: TableChanges<ProjectUpdate>;
  devList?: string[];
  deptList?: string[];
  phaseList?: string[];
}

function diffTable<T extends { id: string }>(prev: T[], next: T[]): TableChanges<T> | undefined {
  const before = new Map(prev.map((r) => [r.id, JSON.stringify(r)]));
  const nextIds = new Set(next.map((r) => r.id));
  const upsert = next.flatMap((r, position) => (before.get(r.id) === JSON.stringify(r) ? [] : [{ ...r, position }]));
  const del = prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id);
  return upsert.length || del.length ? { upsert, delete: del } : undefined;
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Minimal set of changes that turns `prev` into `next`, or null if nothing changed. */
export function diffData(prev: DashboardData, next: DashboardData): SyncPayload | null {
  const payload: SyncPayload = {
    projects: diffTable(prev.projects, next.projects),
    tasks: diffTable(prev.tasks, next.tasks),
    updates: diffTable(prev.updates, next.updates),
    devList: sameList(prev.devList, next.devList) ? undefined : next.devList,
    deptList: sameList(prev.deptList, next.deptList) ? undefined : next.deptList,
    phaseList: sameList(prev.phaseList, next.phaseList) ? undefined : next.phaseList,
  };
  return Object.values(payload).some((v) => v !== undefined) ? payload : null;
}
