import type { Phase, Priority, Status } from "./types";

export const DEV_LIST_DEFAULT = [
  "Apinya W.",
  "Chai P.",
  "Dr. Wanchai S.",
  "Mongkol R.",
  "Nattaya P.",
  "Pimchanok T.",
  "Siriporn K.",
  "Somchai K.",
];

export const DEPT_LIST_DEFAULT = [
  "Information Technology",
  "Finance",
  "Human Resources",
  "Operations",
  "Marketing",
  "Sales",
  "Engineering",
  "Management",
];

/** Default colors assigned to new/imported projects in rotation. */
export const COLORS = [
  "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981",
  "#ef4444", "#ec4899", "#f97316", "#06b6d4",
];

/** Swatches offered in the project color picker. */
export const SWATCH_COLORS = [
  "#0ea5e9", "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#10b981", "#14b8a6", "#06b6d4",
  "#84cc16", "#64748b", "#0f172a", "#7c3aed", "#be185d",
];

export interface TagStyle {
  bg: string;
  color: string;
}

export const PHASE_STYLE: Record<Phase, TagStyle> = {
  "Master & Config": { bg: "#ede9fe", color: "#6d28d9" },
  "Functional Requirement": { bg: "#dbeafe", color: "#1d4ed8" },
  "Design Screen": { bg: "#fce7f3", color: "#be185d" },
  Development: { bg: "#d1fae5", color: "#065f46" },
  Deployment: { bg: "#fef3c7", color: "#92400e" },
  "Unit Test": { bg: "#e0f2fe", color: "#0369a1" },
  UAT: { bg: "#f0fdf4", color: "#15803d" },
  "Re-Develop": { bg: "#fee2e2", color: "#b91c1c" },
  Golive: { bg: "#dcfce7", color: "#166534" },
  Support: { bg: "#f1f5f9", color: "#475569" },
};

export const NEUTRAL_TAG: TagStyle = { bg: "#f1f5f9", color: "#64748b" };

export interface StatusStyle extends TagStyle {
  icon: string;
  /** Solid color used for bars, legends and the timeline. */
  bar: string;
}

export const STATUS_STYLE: Record<Status, StatusStyle> = {
  "Not Start": { bg: "#f1f5f9", color: "#64748b", icon: "○", bar: "#94a3b8" },
  Plan: { bg: "#ede9fe", color: "#7c3aed", icon: "◈", bar: "#a78bfa" },
  "In Progress": { bg: "#dbeafe", color: "#2563eb", icon: "⟳", bar: "#0ea5e9" },
  Done: { bg: "#dcfce7", color: "#16a34a", icon: "✓", bar: "#22c55e" },
  Cancelled: { bg: "#fef3c7", color: "#92400e", icon: "✕", bar: "#fbbf24" },
};

export const PRIORITY_STYLE: Record<Priority, TagStyle & { bar: string; emoji: string }> = {
  High: { bg: "#fee2e2", color: "#dc2626", bar: "#ef4444", emoji: "🔴" },
  Medium: { bg: "#fef3c7", color: "#d97706", bar: "#fbbf24", emoji: "🟡" },
  Low: { bg: "#dcfce7", color: "#16a34a", bar: "#22c55e", emoji: "🟢" },
};

export const STATUS_EMOJI: Record<Status, string> = {
  "Not Start": "⚪",
  Plan: "🟣",
  "In Progress": "🔵",
  Done: "🟢",
  Cancelled: "🟡",
};

export const STORAGE_KEYS = {
  projects: "isd_projects",
  tasks: "isd_tasks",
  devList: "isd_dev_list",
  deptList: "isd_dept_list",
} as const;
