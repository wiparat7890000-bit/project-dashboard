import { COLORS } from "./constants";
import { STATUSES, type Project, type ProjectStats, type Status, type Task } from "./types";

const DAY_MS = 86_400_000;

export const toISODate = (d: Date) => d.toISOString().split("T")[0];
export const todayISO = () => toISODate(new Date());

export function uid(prefix: string) {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function colorFor(index: number) {
  return COLORS[index % COLORS.length];
}

export function isClosed(t: Task) {
  return t.status === "Done" || t.status === "Cancelled";
}

export function isOverdue(t: Task, today = todayISO()) {
  return !!t.endDate && t.endDate < today && !isClosed(t);
}

export function daysUntil(date: string): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS);
}

export function avgProgress(tasks: Task[]) {
  if (!tasks.length) return 0;
  return Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length);
}

export function countByStatus(tasks: Task[]): Record<Status, number> {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const t of tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
  return counts;
}

export function getProjectStats(project: Project, allTasks: Task[]): ProjectStats {
  const today = todayISO();
  const tasks = allTasks.filter((t) => t.projectId === project.id);
  return {
    tasks,
    total: tasks.length,
    counts: countByStatus(tasks),
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
    avg: avgProgress(tasks),
    daysLeft: daysUntil(project.endDate),
  };
}

/** Color scale for a project's average progress. */
export function projectProgressColor(p: number) {
  return p >= 70 ? "#22c55e" : p >= 40 ? "#0ea5e9" : p >= 1 ? "#f59e0b" : "#cbd5e1";
}

/** Color scale for a single task's (or phase's) progress. */
export function taskProgressColor(p: number) {
  return p >= 100 ? "#22c55e" : p >= 60 ? "#0ea5e9" : p >= 30 ? "#f59e0b" : "#94a3b8";
}

/** Color scale for the large overall-progress donut. */
export function donutColor(p: number) {
  return p >= 70 ? "#22c55e" : p >= 40 ? "#f59e0b" : "#0ea5e9";
}

export function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${dt.getUTCFullYear()}`;
}

export function pct(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

export function firstName(name: string) {
  return name.split(" ")[0];
}

/** Trigger a browser download of text content (UTF-8 with BOM so Excel reads Thai correctly). */
export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob(["﻿" + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
