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

export const PROJECT_STATUSES = ["Not Started", "In Progress", "At Risk", "Delayed", "Completed", "On Hold"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const HEALTH_STATUSES = ["On Track", "At Risk", "Delayed"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const ISSUE_STATUSES = ["Open", "Resolved", "Closed"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/** Dates are stored as ISO `YYYY-MM-DD` strings (or "" when unset). */
export interface Project {
  id: string;
  name: string;
  description: string;
  owner: string;
  department: string;
  priority: Priority;
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

/** A periodic status report on a project. The latest one drives the project's status and health. */
export interface ProjectUpdate {
  id: string;
  projectId: string;
  updateDate: string;
  /** Overall progress calculated from tasks at the time of the update. */
  progress: number;
  projectStatus: ProjectStatus;
  healthStatus: HealthStatus;
  achievement: string;
  issueRisk: string;
  /** Only meaningful when `issueRisk` describes an issue. */
  issueStatus: IssueStatus;
  nextAction: string;
  nextMilestone: string;
  nextMilestoneDate: string;
  remark: string;
  updatedBy: string;
  /** ISO timestamp; breaks ties between updates on the same date. */
  createdAt: string;
}

export interface DashboardData {
  projects: Project[];
  tasks: Task[];
  updates: ProjectUpdate[];
  devList: string[];
  deptList: string[];
}

export const ALL_PROJECTS = "__all__";

export type ViewTab = "dashboard" | "tasks" | "timeline" | "history";

export interface ProjectStats {
  tasks: Task[];
  total: number;
  counts: Record<Status, number>;
  /** Tasks at 100% progress. */
  completed: number;
  delayed: number;
  avg: number;
  daysLeft: number | null;
}
