"use client";

import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { PRIORITIES, STATUSES, type Priority, type Project, type Status, type Task } from "@/lib/types";
import { avgProgress, daysDelayed, formatDate, groupByPhase, taskProgressColor, todayISO } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { DelayedBadge, DevTags, PhaseBadge, PriorityBadge, StatusBadge } from "../ui/Badges";
import { Panel, ProgressBar } from "../ui/Primitives";

export interface TaskFilterState {
  status: Status | "";
  priority: Priority | "";
}

export function useTaskFilters() {
  const [filters, setFilters] = useState<TaskFilterState>({ status: "", priority: "" });
  const apply = (tasks: Task[]) =>
    tasks.filter((t) => (!filters.status || t.status === filters.status) && (!filters.priority || t.priority === filters.priority));
  return { filters, setFilters, apply };
}

export function TaskFilters({ filters, onChange }: { filters: TaskFilterState; onChange: (f: TaskFilterState) => void }) {
  return (
    <>
      <TextField
        select
        size="small"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as Status | "" })}
        className="min-w-36 bg-white"
        slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Filter by status" } }}
      >
        <MenuItem value="">All Status</MenuItem>
        {STATUSES.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value as Priority | "" })}
        className="min-w-36 bg-white"
        slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Filter by priority" } }}
      >
        <MenuItem value="">All Priority</MenuItem>
        {PRIORITIES.map((p) => (
          <MenuItem key={p} value={p}>
            {p}
          </MenuItem>
        ))}
      </TextField>
    </>
  );
}

export function TaskCard({ task: t, project }: { task: Task; project?: Project }) {
  const { openTaskDialog, deleteTask } = useDashboard();
  const delayedDays = daysDelayed(t, todayISO());
  const delayed = delayedDays > 0;
  const color = taskProgressColor(t.progress);

  return (
    <Panel
      role="button"
      tabIndex={0}
      onClick={() => openTaskDialog(t.id)}
      onKeyDown={(e) => e.key === "Enter" && openTaskDialog(t.id)}
      className={`cursor-pointer p-5 transition hover:shadow-md ${delayed ? "!border-red-200" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <PhaseBadge phase={t.phase} />
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
            {delayed && <DelayedBadge days={delayedDays} />}
            {project && (
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `${project.color}22`, color: project.color }}>
                {project.name}
              </span>
            )}
          </div>
          <div className="mb-1 text-sm font-semibold text-slate-800">{t.name}</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            {t.owner && <span>👤 {t.owner}</span>}
            {t.dev.length > 0 && (
              <span>
                💻 <DevTags devs={t.dev} />
              </span>
            )}
            {t.startDate && <span>▶ {formatDate(t.startDate)}</span>}
            {t.endDate && <span className={delayed ? "font-semibold text-red-400" : ""}>◀ {formatDate(t.endDate)}</span>}
          </div>
          {t.notes && <div className="mt-1 text-xs italic text-slate-400">{t.notes}</div>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-lg font-bold" style={{ color }}>
            {t.progress}%
          </div>
          <IconButton
            size="small"
            aria-label={`Delete ${t.name}`}
            onClick={(e) => {
              e.stopPropagation();
              deleteTask(t.id);
            }}
            className="text-slate-300 hover:text-red-400"
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </div>
      </div>
      <ProgressBar value={t.progress} color={color} className="mt-3 h-2" />
    </Panel>
  );
}

interface TaskListProps {
  tasks: Task[];
  /** Show each task's project chip (used when listing tasks across projects). */
  showProject?: boolean;
  /** Group cards under a header per phase. */
  grouped?: boolean;
  empty: React.ReactNode;
}

export default function TaskList({ tasks, showProject = false, grouped = false, empty }: TaskListProps) {
  const { data } = useDashboard();
  const projectOf = (t: Task) => (showProject ? data.projects.find((p) => p.id === t.projectId) : undefined);

  if (!tasks.length) {
    return (
      <div className="py-12 text-center text-slate-400">
        <div className="mb-3 text-4xl">📭</div>
        {empty}
      </div>
    );
  }

  if (!grouped) {
    return (
      <div className="space-y-3">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} project={projectOf(t)} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groupByPhase(tasks).map(([phase, phaseTasks]) => {
        const avg = avgProgress(phaseTasks);
        return (
          <section key={phase || "none"}>
            <div className="mb-2 flex items-center gap-3">
              <PhaseBadge phase={phase} />
              <span className="whitespace-nowrap text-xs text-slate-400">
                {phaseTasks.length} {phaseTasks.length === 1 ? "task" : "tasks"}
              </span>
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-600">{avg}%</span>
            </div>
            <div className="space-y-3">
              {phaseTasks.map((t) => (
                <TaskCard key={t.id} task={t} project={projectOf(t)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
