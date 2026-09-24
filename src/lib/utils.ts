import { COLORS, NO_ISSUE_TEXT } from "./constants";
import {
  PHASES,
  STATUSES,
  type HealthStatus,
  type Phase,
  type Project,
  type ProjectStats,
  type ProjectStatus,
  type ProjectUpdate,
  type Status,
  type Task,
} from "./types";

const DAY_MS = 86_400_000;

export const toISODate = (d: Date) => d.toISOString().split("T")[0];
export const todayISO = () => toISODate(new Date());

export function uid(prefix: string) {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function colorFor(index: number) {
  return COLORS[index % COLORS.length];
}

/** A task is delayed when its end date has passed and it is not at 100% (cancelled tasks are exempt). */
export function isDelayed(t: Task, today = todayISO()) {
  return !!t.endDate && t.endDate < today && t.progress < 100 && t.status !== "Cancelled";
}

/** Whole days between a task's end date and today (0 if not delayed). */
export function daysDelayed(t: Task, today = todayISO()) {
  if (!isDelayed(t, today)) return 0;
  return Math.round((new Date(today).getTime() - new Date(t.endDate).getTime()) / DAY_MS);
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
    completed: tasks.filter((t) => t.progress >= 100).length,
    delayed: tasks.filter((t) => isDelayed(t, today)).length,
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-09-24` → `24 Sep 2026`. */
export function formatLongDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return `${String(dt.getUTCDate()).padStart(2, "0")} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
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

/** Group tasks by phase, in PHASES order, with tasks that have no phase last. */
export function groupByPhase(tasks: Task[]): [Phase | "", Task[]][] {
  const groups = new Map<Phase | "", Task[]>();
  for (const t of tasks) groups.set(t.phase, [...(groups.get(t.phase) ?? []), t]);
  const order: (Phase | "")[] = [...PHASES, ""];
  return order.filter((p) => groups.has(p)).map((p) => [p, groups.get(p)!]);
}

// ── Project status & updates ──────────────────────────────────────────────────

/** Suggest a project status from its tasks. Never applied automatically. */
export function suggestProjectStatus(tasks: Task[]): ProjectStatus {
  if (tasks.length && tasks.every((t) => t.progress >= 100)) return "Completed";
  if (tasks.some((t) => isDelayed(t))) return "Delayed";
  if (tasks.some((t) => t.progress > 0 || t.status === "In Progress")) return "In Progress";
  return "Not Started";
}

export function suggestHealth(tasks: Task[]): HealthStatus {
  return tasks.some((t) => isDelayed(t)) ? "Delayed" : "On Track";
}

/** Updates for one project, newest first. */
export function projectUpdates(updates: ProjectUpdate[], projectId: string) {
  return updates
    .filter((u) => u.projectId === projectId)
    .sort((a, b) => b.updateDate.localeCompare(a.updateDate) || b.createdAt.localeCompare(a.createdAt));
}

/** Whether an Issue / Risk text describes an actual issue (not blank or "No outstanding issue"). */
export function hasIssue(issueRisk: string) {
  const text = issueRisk.trim().toLowerCase().replace(/\.$/, "");
  return !!text && text !== NO_ISSUE_TEXT.toLowerCase() && text !== "-" && text !== "none";
}

export function isOpenIssue(u: ProjectUpdate) {
  return hasIssue(u.issueRisk) && u.issueStatus === "Open";
}

export interface ProjectOverview {
  stats: ProjectStats;
  updates: ProjectUpdate[];
  latest: ProjectUpdate | undefined;
  status: ProjectStatus;
  health: HealthStatus;
  /** True when status/health come from task data because no update has been saved yet. */
  isAuto: boolean;
  openIssues: number;
  lastUpdated: string;
}

export function getProjectOverview(project: Project, tasks: Task[], allUpdates: ProjectUpdate[]): ProjectOverview {
  const stats = getProjectStats(project, tasks);
  const updates = projectUpdates(allUpdates, project.id);
  const latest = updates[0];
  return {
    stats,
    updates,
    latest,
    status: latest?.projectStatus ?? suggestProjectStatus(stats.tasks),
    health: latest?.healthStatus ?? suggestHealth(stats.tasks),
    isAuto: !latest,
    openIssues: updates.filter(isOpenIssue).length,
    lastUpdated: latest?.updateDate ?? "",
  };
}

// ── Project history (finished projects) ───────────────────────────────────────

/**
 * A project is finished when it has at least one Done task and every task is Done
 * (Cancelled tasks don't block it). Derived from tasks, so reopening a task
 * brings the project back to the active list.
 */
export function isProjectFinished(projectTasks: Task[]) {
  return projectTasks.some((t) => t.status === "Done") && projectTasks.every((t) => t.status === "Done" || t.status === "Cancelled");
}

/** Latest end date among Done tasks — used as the project's finish date. */
export function finishDate(projectTasks: Task[]) {
  return projectTasks
    .filter((t) => t.status === "Done" && t.endDate)
    .map((t) => t.endDate)
    .sort()
    .at(-1) ?? "";
}

export function splitProjects(projects: Project[], tasks: Task[]) {
  const finished = new Set(projects.filter((p) => isProjectFinished(tasks.filter((t) => t.projectId === p.id))).map((p) => p.id));
  return {
    activeProjects: projects.filter((p) => !finished.has(p.id)),
    historyProjects: projects.filter((p) => finished.has(p.id)),
    /** Tasks that belong to active (not finished) projects. */
    activeTasks: tasks.filter((t) => !finished.has(t.projectId)),
    isInHistory: (id: string) => finished.has(id),
  };
}
