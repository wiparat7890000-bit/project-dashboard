import { ALL_PROJECTS, type ViewTab } from "./types";

/**
 * URL scheme (one path per menu):
 *   /                          All projects — Dashboard
 *   /tasks, /timeline          All projects — Tasks / Timeline
 *   /history                   Project History
 *   /projects/:id              Project — Dashboard
 *   /projects/:id/tasks        Project — Tasks
 *   /projects/:id/timeline     Project — Timeline
 */
export interface Route {
  projectId: string;
  tab: ViewTab;
}

const SUB_TABS: ViewTab[] = ["tasks", "timeline"];

/** Parse a pathname into a view; `null` for paths the app doesn't know. */
export function parsePath(pathname: string): Route | null {
  let segments: string[];
  try {
    segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return null; // malformed percent-encoding
  }
  const [first, second, third, ...rest] = segments;
  if (rest.length) return null;

  if (!first) return { projectId: ALL_PROJECTS, tab: "dashboard" };
  if (first === "history" && !second) return { projectId: ALL_PROJECTS, tab: "history" };
  if (SUB_TABS.includes(first as ViewTab) && !second) return { projectId: ALL_PROJECTS, tab: first as ViewTab };
  if (first === "projects" && second) {
    if (!third) return { projectId: second, tab: "dashboard" };
    if (SUB_TABS.includes(third as ViewTab)) return { projectId: second, tab: third as ViewTab };
  }
  return null;
}

export function buildPath(projectId: string, tab: ViewTab): string {
  if (tab === "history") return "/history";
  if (projectId === ALL_PROJECTS) return tab === "dashboard" ? "/" : `/${tab}`;
  const base = `/projects/${encodeURIComponent(projectId)}`;
  return tab === "dashboard" ? base : `${base}/${tab}`;
}

export const TAB_LABEL: Record<ViewTab, string> = {
  dashboard: "Dashboard",
  tasks: "Tasks",
  timeline: "Timeline",
  history: "Project History",
};

/** True for clicks that should open a link natively (new tab/window, download). */
export function isModifiedClick(e: React.MouseEvent) {
  return e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
}
