"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { updateData, useDashboardData } from "@/lib/store";
import { ALL_PROJECTS, type DashboardData, type ViewTab } from "@/lib/types";
import { splitProjects, uid } from "@/lib/utils";
import { DashboardContext, type DashboardContextValue } from "./DashboardContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ImportDialog from "./dialogs/ImportDialog";
import ProjectDialog from "./dialogs/ProjectDialog";
import TaskDialog from "./dialogs/TaskDialog";
import UpdateProjectDialog from "./dialogs/UpdateProjectDialog";
import AllProjectsDashboard from "./views/AllProjectsDashboard";
import ProjectHistoryView from "./views/ProjectHistoryView";
import ProjectDashboard from "./views/ProjectDashboard";
import TasksView from "./views/TasksView";
import TimelineView from "./views/TimelineView";

export default function Dashboard() {
  const data = useDashboardData();
  if (!data) {
    // Server render / first paint: data lives in localStorage, so wait for the client.
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <CircularProgress />
      </div>
    );
  }
  return <DashboardShell data={data} />;
}

/** Dialog state; `key` changes on every open so the form re-initializes. */
interface DialogState {
  open: boolean;
  id: string | null;
  key: number;
}
const closedDialog: DialogState = { open: false, id: null, key: 0 };

function DashboardShell({ data }: { data: DashboardData }) {
  const [selectedId, setSelectedId] = useState<string>(ALL_PROJECTS);
  const [tab, setTab] = useState<ViewTab>("dashboard");
  const [presentMode, setPresentMode] = useState(false);
  const [projectDialog, setProjectDialog] = useState<DialogState>(closedDialog);
  const [taskDialog, setTaskDialog] = useState<DialogState>(closedDialog);
  const [importDialog, setImportDialog] = useState<DialogState>(closedDialog);
  const [updateDialog, setUpdateDialog] = useState<DialogState>(closedDialog);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: "" });

  // Fall back to "All" if the selected project was deleted or replaced by an import.
  const activeProject = data.projects.find((p) => p.id === selectedId);
  const activeProjectId = activeProject ? selectedId : ALL_PROJECTS;
  const isAll = activeProjectId === ALL_PROJECTS;
  const split = useMemo(() => splitProjects(data.projects, data.tasks), [data.projects, data.tasks]);

  const value = useMemo<DashboardContextValue>(() => {
    const open = (set: typeof setProjectDialog, id?: string) => set((d) => ({ open: true, id: id ?? null, key: d.key + 1 }));

    return {
      data,
      ...split,
      activeProjectId,
      activeProject,
      isAll,
      tab,
      presentMode,

      selectProject: (id) => {
        setSelectedId(id);
        setTab("dashboard");
      },
      setTab,
      togglePresentMode: () => {
        setPresentMode((p) => !p);
        setTab("dashboard");
      },

      openProjectDialog: (id) => open(setProjectDialog, id),
      openTaskDialog: (id) => {
        if (!id && isAll) return alert("Please select a specific project to add tasks.");
        open(setTaskDialog, id);
      },
      openImportDialog: () => open(setImportDialog),
      openUpdateDialog: () => {
        if (!isAll) open(setUpdateDialog, activeProjectId);
      },
      notify: (message) => setToast({ open: true, message }),

      saveProject: (input, id) => {
        if (id) {
          updateData((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, ...input } : p)) }));
        } else {
          const newId = uid("p");
          updateData((d) => ({ ...d, projects: [...d.projects, { id: newId, ...input }] }));
          setSelectedId(newId);
        }
      },
      deleteProject: (id) => {
        if (!confirm("Delete this project and all its tasks?")) return;
        updateData((d) => ({
          ...d,
          projects: d.projects.filter((p) => p.id !== id),
          tasks: d.tasks.filter((t) => t.projectId !== id),
          updates: d.updates.filter((u) => u.projectId !== id),
        }));
      },
      saveTask: (input, id) => {
        if (id) {
          updateData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...input } : t)) }));
        } else {
          updateData((d) => ({ ...d, tasks: [...d.tasks, { id: uid("t"), projectId: activeProjectId, ...input }] }));
        }
      },
      deleteTask: (id) => {
        if (!confirm("Delete this task?")) return;
        updateData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
      },
      saveProjectUpdate: (input) => {
        if (isAll) return;
        const update = { ...input, id: uid("u"), projectId: activeProjectId, createdAt: new Date().toISOString() };
        updateData((d) => ({ ...d, updates: [...d.updates, update] }));
        setToast({ open: true, message: "Project update saved successfully." });
      },
      deleteProjectUpdate: (id) => {
        if (!confirm("Delete this project update from the history?")) return;
        updateData((d) => ({ ...d, updates: d.updates.filter((u) => u.id !== id) }));
      },
      setIssueStatus: (updateId, issueStatus) =>
        updateData((d) => ({ ...d, updates: d.updates.map((u) => (u.id === updateId ? { ...u, issueStatus } : u)) })),
      setDevList: (devList) => updateData((d) => ({ ...d, devList })),
      setDeptList: (deptList) => updateData((d) => ({ ...d, deptList })),
      replaceData: (next, resetSelection) => {
        updateData(() => next);
        if (resetSelection) setSelectedId(ALL_PROJECTS);
      },
    };
  }, [data, split, activeProjectId, activeProject, isAll, tab, presentMode]);

  return (
    <DashboardContext.Provider value={value}>
      <div className="flex min-h-screen flex-col bg-slate-100">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          {!presentMode && <Sidebar />}
          <main className="min-w-0 flex-1 overflow-auto">
            <div className="border-b border-slate-200 bg-white px-6 shadow-sm">
              <Tabs value={tab} onChange={(_, v: ViewTab) => setTab(v)} variant="scrollable">
                <Tab value="dashboard" label="📊 Dashboard" />
                <Tab value="tasks" label="📋 Tasks" />
                <Tab value="timeline" label="📅 Timeline" />
                <Tab
                  value="history"
                  label={
                    <span className="flex items-center gap-2">
                      📦 Project History
                      {split.historyProjects.length > 0 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{split.historyProjects.length}</span>
                      )}
                    </span>
                  }
                />
              </Tabs>
            </div>
            <div className="p-6">
              {tab === "dashboard" && (activeProject ? <ProjectDashboard project={activeProject} /> : <AllProjectsDashboard />)}
              {tab === "tasks" && <TasksView />}
              {tab === "timeline" && <TimelineView />}
              {tab === "history" && <ProjectHistoryView />}
            </div>
          </main>
        </div>
      </div>

      <ProjectDialog
        key={`project-${projectDialog.key}`}
        open={projectDialog.open}
        projectId={projectDialog.id}
        onClose={() => setProjectDialog((d) => ({ ...d, open: false }))}
      />
      <TaskDialog
        key={`task-${taskDialog.key}`}
        open={taskDialog.open}
        taskId={taskDialog.id}
        onClose={() => setTaskDialog((d) => ({ ...d, open: false }))}
      />
      {activeProject && (
        <UpdateProjectDialog
          key={`update-${updateDialog.key}`}
          open={updateDialog.open && updateDialog.id === activeProjectId}
          project={activeProject}
          onClose={() => setUpdateDialog((d) => ({ ...d, open: false }))}
        />
      )}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ color: "#fff" }}>
          {toast.message}
        </Alert>
      </Snackbar>
      <ImportDialog
        key={`import-${importDialog.key}`}
        open={importDialog.open}
        onClose={() => setImportDialog((d) => ({ ...d, open: false }))}
      />
    </DashboardContext.Provider>
  );
}
