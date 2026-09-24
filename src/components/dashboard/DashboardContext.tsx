"use client";

import { createContext, useContext } from "react";
import type { DashboardData, IssueStatus, Project, ProjectUpdate, Task, ViewTab } from "@/lib/types";

export type ProjectInput = Omit<Project, "id">;
export type TaskInput = Omit<Task, "id" | "projectId">;
export type ProjectUpdateInput = Omit<ProjectUpdate, "id" | "projectId" | "createdAt">;

export interface DashboardContextValue {
  data: DashboardData;
  /** Projects still in progress (shown in the sidebar and overview). */
  activeProjects: Project[];
  /** Projects whose tasks are all Done — listed in the Project History tab. */
  historyProjects: Project[];
  /** Tasks of active projects only. */
  activeTasks: Task[];
  isInHistory: (projectId: string) => boolean;
  activeProjectId: string;
  activeProject: Project | undefined;
  isAll: boolean;
  tab: ViewTab;
  presentMode: boolean;

  selectProject: (id: string) => void;
  setTab: (tab: ViewTab) => void;
  togglePresentMode: () => void;

  openProjectDialog: (id?: string) => void;
  openTaskDialog: (id?: string) => void;
  openImportDialog: () => void;
  openUpdateDialog: () => void;
  notify: (message: string) => void;

  saveProject: (input: ProjectInput, id: string | null) => void;
  deleteProject: (id: string) => void;
  saveTask: (input: TaskInput, id: string | null) => void;
  deleteTask: (id: string) => void;
  saveProjectUpdate: (input: ProjectUpdateInput) => void;
  deleteProjectUpdate: (id: string) => void;
  setIssueStatus: (updateId: string, status: IssueStatus) => void;
  setDevList: (list: string[]) => void;
  setDeptList: (list: string[]) => void;
  setPhaseList: (list: string[]) => void;
  /** Remove a phase from the list and clear it from tasks (asks for confirmation). Returns whether it was deleted. */
  deletePhase: (phase: string) => boolean;
  /** Rename a phase in the list and on every task that uses it (keeps its position). */
  renamePhase: (from: string, to: string) => void;
  replaceData: (data: DashboardData, resetSelection: boolean) => void;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside <Dashboard>");
  return ctx;
}
