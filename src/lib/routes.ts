import { ALL_PROJECTS, type Project, type ViewTab } from "./types";

/**
 * URL scheme (one readable path per menu):
 *   /                              All projects — Dashboard
 *   /tasks, /timeline              All projects — Tasks / Timeline
 *   /project-history               Project History
 *   /projects/:slug                Project — Dashboard      e.g. /projects/website-redesign
 *   /projects/:slug/tasks          Project — Tasks
 *   /projects/:slug/timeline       Project — Timeline
 *
 * The slug comes from the project name. Older links that use the project id
 * (/projects/p1) or /history still resolve and are redirected to the new path.
 */
export interface Route {
  /** ALL_PROJECTS, or a project slug / legacy id as it appears in the URL. */
  projectKey: string;
  tab: ViewTab;
}

const SUB_TABS: ViewTab[] = ["tasks", "timeline"];
const HISTORY_SEGMENT = "project-history";
const LEGACY_HISTORY_SEGMENT = "history";

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

  if (!first) return { projectKey: ALL_PROJECTS, tab: "dashboard" };
  if ((first === HISTORY_SEGMENT || first === LEGACY_HISTORY_SEGMENT) && !second) return { projectKey: ALL_PROJECTS, tab: "history" };
  if (SUB_TABS.includes(first as ViewTab) && !second) return { projectKey: ALL_PROJECTS, tab: first as ViewTab };
  if (first === "projects" && second) {
    if (!third) return { projectKey: second, tab: "dashboard" };
    if (SUB_TABS.includes(third as ViewTab)) return { projectKey: second, tab: third as ViewTab };
  }
  return null;
}

/** "Website Redesign" → "website-redesign". Keeps Thai and other letters; falls back to "project". */
export function slugify(name: string) {
  return (
    name
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/, "") || "project"
  );
}

/** Unique slug per project id; duplicates get -2, -3… in list order (so earlier projects keep the plain slug). */
export function projectSlugs(projects: Project[]): Map<string, string> {
  const taken = new Set<string>();
  const slugs = new Map<string, string>();
  for (const p of projects) {
    const base = slugify(p.name);
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    slugs.set(p.id, slug);
  }
  return slugs;
}

/**
 * Find the project a URL key refers to: by current slug, then by id (old links),
 * then by a slug the project had before being renamed (`aliases`: old slug → id).
 */
export function resolveProjectKey(
  key: string,
  projects: Project[],
  slugs: Map<string, string>,
  aliases: Record<string, string> = {},
): Project | undefined {
  const lower = key.toLowerCase();
  return (
    projects.find((p) => slugs.get(p.id) === lower) ??
    projects.find((p) => p.id === key) ??
    projects.find((p) => p.id === aliases[lower])
  );
}

export function buildPath(projectSlug: string | null, tab: ViewTab): string {
  if (tab === "history") return `/${HISTORY_SEGMENT}`;
  if (!projectSlug) return tab === "dashboard" ? "/" : `/${tab}`;
  const base = `/projects/${encodeURIComponent(projectSlug)}`;
  return tab === "dashboard" ? base : `${base}/${tab}`;
}

/** Compare paths ignoring percent-encoding differences (e.g. Thai slugs). */
export function samePath(a: string, b: string) {
  try {
    return decodeURIComponent(a) === decodeURIComponent(b);
  } catch {
    return a === b;
  }
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
