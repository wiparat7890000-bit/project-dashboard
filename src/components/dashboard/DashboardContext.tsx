"use client";

import { createContext, useContext } from "react";
import type { DashboardData, IssueStatus, Project, ProjectUpdate, Task, ViewTab } from "@/lib/types";

export type ProjectInput = Omit<Project, "id">;
export type TaskInput = Omit<Task, "id" | "projectId">;
export type ProjectUpdateInput = Omit<ProjectUpdate, "id" | "projectId" | "createdAt">;

export interface DashboardContextValue {
  data: DashboardData;
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
  replaceData: (data: DashboardData, resetSelection: boolean) => void;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside <Dashboard>");
  return ctx;
}
