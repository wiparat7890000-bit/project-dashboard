"use client";

import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { PHASES, PRIORITIES, STATUSES, type Phase, type Priority, type Project, type Status, type Task } from "@/lib/types";
import { avgProgress, daysDelayed, formatDate, groupByPhase, taskProgressColor, todayISO } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { DelayedBadge, DevTags, PhaseBadge, PriorityBadge, StatusBadge } from "../ui/Badges";
import { Panel, ProgressBar } from "../ui/Primitives";

/** `NO_PHASE` selects tasks without a phase; "" means all phases. */
export const NO_PHASE = "__none__";
type PhaseFilter = Phase | typeof NO_PHASE | "";

export interface TaskFilterState {
  phase: PhaseFilter;
  status: Status | "";
  priority: Priority | "";
}

const EMPTY_FILTERS: TaskFilterState = { phase: "", status: "", priority: "" };

export function useTaskFilters() {
  const [filters, setFilters] = useState<TaskFilterState>(EMPTY_FILTERS);
  const apply = (tasks: Task[]) =>
    tasks.filter(
      (t) =>
        (!filters.phase || (filters.phase === NO_PHASE ? !t.phase : t.phase === filters.phase)) &&
        (!filters.status || t.status === filters.status) &&
        (!filters.priority || t.priority === filters.priority),
    );
  const active = !!(filters.phase || filters.status || filters.priority);
  return { filters, setFilters, apply, active, reset: () => setFilters(EMPTY_FILTERS) };
}

/** Phases used by `tasks`, in phase order (tasks without a phase last). */
export function phasesOf(tasks: Task[]): PhaseFilter[] {
  const used = new Set(tasks.map((t) => t.phase));
  const phases: PhaseFilter[] = PHASES.filter((p) => used.has(p));
  if (used.has("")) phases.push(NO_PHASE);
  return phases;
}

interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (f: TaskFilterState) => void;
  /** Phases to offer in the Phase filter; hide the filter when omitted. */
  phases?: PhaseFilter[];
  /** Count of tasks per phase option, shown next to each option. */
  phaseCounts?: Partial<Record<string, number>>;
}

export function TaskFilters({ filters, onChange, phases, phaseCounts = {} }: TaskFiltersProps) {
  // Keep a selected phase visible in the menu even if no task uses it any more.
  const phaseOptions = phases && filters.phase && !phases.includes(filters.phase) ? [...phases, filters.phase] : phases;
  return (
    <>
      {phaseOptions && (
        <TextField
          select
          size="small"
          value={filters.phase}
          onChange={(e) => onChange({ ...filters, phase: e.target.value as PhaseFilter })}
          className="min-w-40 bg-white"
          slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Filter by phase" } }}
        >
          <MenuItem value="">All Phase</MenuItem>
          {phaseOptions.map((p) => (
            <MenuItem key={p} value={p}>
              <span className="flex w-full items-center justify-between gap-3">
                {p === NO_PHASE ? "No phase" : p}
                {phaseCounts[p] != null && <span className="text-xs text-slate-400">{phaseCounts[p]}</span>}
              </span>
            </MenuItem>
          ))}
        </TextField>
      )}
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
      aria-label={`Edit task ${t.name}`}
      onClick={() => openTaskDialog(t.id)}
      onKeyDown={(e) => e.key === "Enter" && openTaskDialog(t.id)}
      className={`group cursor-pointer p-5 transition hover:-translate-y-px hover:shadow-md ${delayed ? "!border-red-200" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <PhaseBadge phase={t.phase} />
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
            {delayed && (
              <Tooltip title={`End date ${formatDate(t.endDate)} passed ${delayedDays} day${delayedDays === 1 ? "" : "s"} ago and progress is ${t.progress}%`}>
                <span>
                  <DelayedBadge days={delayedDays} />
                </span>
              </Tooltip>
            )}
            {project && (
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `${project.color}22`, color: project.color }}>
                {project.name}
              </span>
            )}
          </div>
          <div className="mb-1 text-sm font-semibold text-slate-800 group-hover:text-sky-700">{t.name}</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            {t.owner && (
              <Tooltip title="Owner">
                <span>👤 {t.owner}</span>
              </Tooltip>
            )}
            {t.dev.length > 0 && (
              <Tooltip title={`Developers: ${t.dev.join(", ")}`}>
                <span>
                  💻 <DevTags devs={t.dev} />
                </span>
              </Tooltip>
            )}
            {t.startDate && (
              <Tooltip title="Start date">
                <span>▶ {formatDate(t.startDate)}</span>
              </Tooltip>
            )}
            {t.endDate && (
              <Tooltip title={delayed ? "End date (passed)" : "End date"}>
                <span className={delayed ? "font-semibold text-red-400" : ""}>◀ {formatDate(t.endDate)}</span>
              </Tooltip>
            )}
          </div>
          {t.notes && <div className="mt-1 text-xs italic text-slate-400">{t.notes}</div>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Tooltip title="Task progress">
            <div className="text-lg font-bold" style={{ color }}>
              {t.progress}%
            </div>
          </Tooltip>
          <Tooltip title="Delete task">
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
          </Tooltip>
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
              <Tooltip title={`Average progress of ${phase || "tasks without a phase"}`}>
                <span className="text-xs font-semibold text-slate-600">{avg}%</span>
              </Tooltip>
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
