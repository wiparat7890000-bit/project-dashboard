"use client";

import { useMemo, useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseIcon from "@mui/icons-material/Close";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { ALL_PROJECTS } from "@/lib/types";
import { getProjectStats } from "@/lib/utils";
import { useDashboard } from "./DashboardContext";
import ProjectHoverCard from "./ProjectHoverCard";
import { ColorDot } from "./ui/Badges";

export default function Sidebar() {
  const { data, activeProjects, historyProjects, isInHistory, activeProjectId, tab, setTab, selectProject, openProjectDialog, deleteProject } =
    useDashboard();
  const [deptFilter, setDeptFilter] = useState("");

  const usedDepts = useMemo(
    () => [...new Set(activeProjects.map((p) => p.department).filter(Boolean))].sort(),
    [activeProjects],
  );
  // Drop a stale filter if its department no longer has projects.
  const filter = usedDepts.includes(deptFilter) ? deptFilter : "";
  const visible = filter ? activeProjects.filter((p) => p.department === filter) : activeProjects;
  const isAll = activeProjectId === ALL_PROJECTS;
  const historyActive = tab === "history" || isInHistory(activeProjectId);

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 py-4 text-white shadow-xl md:flex">
      <div className="px-4">
        <button
          type="button"
          onClick={() => selectProject(ALL_PROJECTS)}
          className={`mb-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
            isAll && tab !== "history" ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <span>🌐</span>
          <span className="flex-1">All Projects</span>
        </button>

        <label className="mb-3 block">
          <span className="mb-1.5 block px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Department</span>
          <select
            value={filter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
          >
            <option value="">— All Departments —</option>
            {usedDepts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Projects</div>
        <div className="max-h-[calc(100vh-280px)] space-y-1 overflow-y-auto">
          {!visible.length && (
            <div className="px-3 py-2 text-xs text-slate-500">
              {filter ? "ไม่มีโปรเจกต์ใน Department นี้" : historyProjects.length ? "All projects are finished" : "No projects yet"}
            </div>
          )}
          {visible.map((p) => {
            const active = activeProjectId === p.id;
            return (
              <Tooltip
                key={p.id}
                title={<ProjectHoverCard project={p} stats={getProjectStats(p, data.tasks)} />}
                placement="right"
                arrow
                enterDelay={150}
                slotProps={{
                  tooltip: {
                    sx: {
                      bgcolor: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "14px",
                      p: "14px",
                      maxWidth: "none",
                      boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                    },
                  },
                  arrow: { sx: { color: "#1e293b" } },
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => selectProject(p.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && selectProject(p.id)}
                  className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    active && tab !== "history" ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <ColorDot color={p.color} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{p.name}</div>
                    {p.department && <div className="mt-0.5 truncate text-xs text-slate-500">{p.department}</div>}
                  </div>
                  <button
                    type="button"
                    aria-label={`Edit ${p.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openProjectDialog(p.id);
                    }}
                    className="shrink-0 text-slate-400 opacity-0 transition hover:text-sky-300 group-hover:opacity-100 focus:opacity-100"
                  >
                    <EditOutlinedIcon sx={{ fontSize: 14 }} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${p.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(p.id);
                    }}
                    className="shrink-0 text-slate-400 opacity-0 transition hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>
              </Tooltip>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => openProjectDialog()}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-400 transition hover:bg-slate-800 hover:text-sky-400"
        >
          <AddIcon sx={{ fontSize: 14 }} /> Add Project
        </button>

        <div className="mt-4 border-t border-slate-800 pt-4">
          <Tooltip title="Projects whose tasks are all Done" placement="right">
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                historyActive ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />
              <span className="flex-1">Project History</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">{historyProjects.length}</span>
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
