"use client";

import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import { useDashboard } from "../DashboardContext";
import TaskList, { NO_PHASE, TaskFilters, phasesOf, useTaskFilters } from "./TaskList";

export default function TasksView() {
  const { data, isAll, activeProject, activeProjectId, openTaskDialog } = useDashboard();
  const { filters, setFilters, apply } = useTaskFilters();
  const scope = isAll ? data.tasks : data.tasks.filter((t) => t.projectId === activeProjectId);
  const tasks = apply(scope);
  const phaseCounts = Object.fromEntries(phasesOf(scope).map((p) => [p, scope.filter((t) => (p === NO_PHASE ? !t.phase : t.phase === p)).length]));

  return (
    <div className="animate-slide-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">{isAll ? "All Tasks" : `${activeProject?.name ?? ""} — Tasks`}</h2>
        <div className="flex flex-wrap gap-2">
          <TaskFilters filters={filters} onChange={setFilters} phases={phasesOf(scope)} phaseCounts={phaseCounts} />
          {!isAll && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openTaskDialog()}>
              Add Task
            </Button>
          )}
        </div>
      </div>
      <TaskList
        tasks={tasks}
        showProject={isAll}
        empty={
          <>
            <div className="font-medium">No tasks found</div>
            {!isAll && (
              <button type="button" onClick={() => openTaskDialog()} className="mt-3 text-sm text-sky-500 underline">
                Add a task
              </button>
            )}
          </>
        }
      />
    </div>
  );
}
