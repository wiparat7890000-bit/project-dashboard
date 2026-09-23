export const STATUSES = ["Not Start", "Plan", "In Progress", "Done", "Cancelled"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["High", "Medium", "Low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PHASES = [
  "Master & Config",
  "Functional Requirement",
  "Design Screen",
  "Development",
  "Deployment",
  "Unit Test",
  "UAT",
  "Re-Develop",
  "Golive",
  "Support",
] as const;
export type Phase = (typeof PHASES)[number];

/** Dates are stored as ISO `YYYY-MM-DD` strings (or "" when unset). */
export interface Project {
  id: string;
  name: string;
  description: string;
  owner: string;
  department: string;
  startDate: string;
  endDate: string;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  owner: string;
  dev: string[];
  phase: Phase | "";
  startDate: string;
  endDate: string;
  status: Status;
  priority: Priority;
  progress: number;
  notes: string;
}

export interface DashboardData {
  projects: Project[];
  tasks: Task[];
  devList: string[];
  deptList: string[];
}

export const ALL_PROJECTS = "__all__";

export type ViewTab = "dashboard" | "tasks" | "timeline";

export interface ProjectStats {
  tasks: Task[];
  total: number;
  counts: Record<Status, number>;
  overdue: number;
  avg: number;
  daysLeft: number | null;
}
