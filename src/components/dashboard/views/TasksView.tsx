"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { PRIORITIES, STATUSES, type Priority, type Status } from "@/lib/types";
import { formatDate, isOverdue, taskProgressColor, todayISO } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { DevTags, OverdueBadge, PhaseBadge, PriorityBadge, StatusBadge } from "../ui/Badges";
import { Panel, ProgressBar } from "../ui/Primitives";

export default function TasksView() {
  const { data, isAll, activeProject, activeProjectId, openTaskDialog, deleteTask } = useDashboard();
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "">("");
  const today = todayISO();

  const tasks = (isAll ? data.tasks : data.tasks.filter((t) => t.projectId === activeProjectId))
    .filter((t) => !statusFilter || t.status === statusFilter)
    .filter((t) => !priorityFilter || t.priority === priorityFilter);

  return (
    <div className="animate-slide-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">{isAll ? "All Tasks" : `${activeProject?.name ?? ""} — Tasks`}</h2>
        <div className="flex flex-wrap gap-2">
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status | "")}
            className="min-w-36 bg-white"
            slotProps={{ select: { displayEmpty: true } }}
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
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | "")}
            className="min-w-36 bg-white"
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value="">All Priority</MenuItem>
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          {!isAll && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openTaskDialog()}>
              Add Task
            </Button>
          )}
        </div>
      </div>

      {!tasks.length ? (
        <div className="py-16 text-center text-slate-400">
          <div className="mb-3 text-4xl">📭</div>
          <div className="font-medium">No tasks found</div>
          {!isAll && (
            <button type="button" onClick={() => openTaskDialog()} className="mt-3 text-sm text-sky-500 underline">
              Add a task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => {
            const overdue = isOverdue(t, today);
            const proj = data.projects.find((p) => p.id === t.projectId);
            const color = taskProgressColor(t.progress);
            return (
              <Panel
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => openTaskDialog(t.id)}
                onKeyDown={(e) => e.key === "Enter" && openTaskDialog(t.id)}
                className="cursor-pointer p-5 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <PhaseBadge phase={t.phase} />
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      {overdue && <OverdueBadge />}
                      {isAll && proj && (
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `${proj.color}22`, color: proj.color }}>
                          {proj.name}
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
                      {t.endDate && <span className={overdue ? "font-semibold text-red-400" : ""}>◀ {formatDate(t.endDate)}</span>}
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
          })}
        </div>
      )}
    </div>
  );
}
