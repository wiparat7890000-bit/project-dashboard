"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import type { Project } from "@/lib/types";
import { finishDate, formatDate, getProjectOverview, type ProjectOverview } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { ColorDot, ProjectStatusBadge } from "../ui/Badges";
import { KpiCard, Panel, SectionHeading, type Kpi } from "../ui/Primitives";

type SortKey = "finished-desc" | "finished-asc" | "name";

const DAY_MS = 86_400_000;

interface HistoryRow {
  project: Project;
  overview: ProjectOverview;
  finished: string;
  /** Days finished after the target end date (negative = early); null if either date is missing. */
  lateBy: number | null;
  durationDays: number | null;
}

function daysBetween(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS);
}

export default function ProjectHistoryView() {
  const { data, historyProjects, selectProject } = useDashboard();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("");
  const [sort, setSort] = useState<SortKey>("finished-desc");

  const rows: HistoryRow[] = historyProjects.map((p) => {
    const overview = getProjectOverview(p, data.tasks, data.updates);
    const finished = finishDate(overview.stats.tasks);
    return {
      project: p,
      overview,
      finished,
      lateBy: finished && p.endDate ? daysBetween(p.endDate, finished) : null,
      durationDays: finished && p.startDate ? daysBetween(p.startDate, finished) : null,
    };
  });

  const departments = [...new Set(historyProjects.map((p) => p.department).filter(Boolean))].sort();
  const q = query.trim().toLowerCase();
  const visible = rows
    .filter((r) => !dept || r.project.department === dept)
    .filter((r) => !q || [r.project.name, r.project.owner, r.project.department].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) =>
      sort === "name"
        ? a.project.name.localeCompare(b.project.name)
        : sort === "finished-asc"
          ? a.finished.localeCompare(b.finished)
          : b.finished.localeCompare(a.finished),
    );

  const delivered = rows.reduce((n, r) => n + r.overview.stats.counts.Done, 0);
  const scheduled = rows.filter((r) => r.lateBy != null);
  const onTime = scheduled.filter((r) => r.lateBy! <= 0).length;
  const durations = rows.map((r) => r.durationDays).filter((d): d is number => d != null);
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  const kpis: Kpi[] = [
    { label: "Finished Projects", value: rows.length, icon: "📦", bg: "bg-indigo-50", border: "border-indigo-200", hint: "Projects whose tasks are all Done" },
    { label: "Tasks Delivered", value: delivered, icon: "✅", bg: "bg-green-50", border: "border-green-200", hint: "Done tasks across finished projects" },
    {
      label: "Finished On Time",
      value: (
        <>
          {onTime} <span className="text-base font-semibold text-slate-400">/ {scheduled.length}</span>
        </>
      ),
      icon: "🎯",
      bg: "bg-sky-50",
      border: "border-sky-200",
      hint: "Last Done task ended on or before the project's target end date",
    },
    {
      label: "Avg. Duration",
      value: avgDuration == null ? "—" : `${avgDuration}d`,
      icon: "⏱️",
      bg: "bg-amber-50",
      border: "border-amber-200",
      hint: "Average days from project start to its last Done task",
    },
  ];

  return (
    <div className="animate-slide-in">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <SectionHeading>Project History</SectionHeading>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">{rows.length} Finished</span>
      </div>
      <p className="mb-5 ml-4 text-sm text-slate-500">
        Projects move here automatically when all their tasks are Done. Reopen a task and the project returns to the active list.
      </p>

      {!rows.length ? (
        <Panel className="py-16 text-center text-slate-400">
          <div className="mb-3 text-5xl">📦</div>
          <div className="text-lg font-medium">No finished projects yet</div>
          <div className="mt-1 text-sm">When every task in a project is Done, it will appear here.</div>
        </Panel>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpis.map((k) => (
              <KpiCard key={k.label} kpi={k} compact />
            ))}
          </div>

          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
              <TextField
                size="small"
                placeholder="Search project, owner, department…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-64 flex-1"
                slotProps={{
                  htmlInput: { "aria-label": "Search finished projects" },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" className="text-slate-400" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              {departments.length > 0 && (
                <TextField
                  select
                  size="small"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="min-w-44"
                  slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Filter by department" } }}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                select
                size="small"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="min-w-44"
                slotProps={{ htmlInput: { "aria-label": "Sort" } }}
              >
                <MenuItem value="finished-desc">Finished: newest first</MenuItem>
                <MenuItem value="finished-asc">Finished: oldest first</MenuItem>
                <MenuItem value="name">Name A–Z</MenuItem>
              </TextField>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px]">
                <thead className="bg-slate-50">
                  <tr className="whitespace-nowrap text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Project</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">Target End</th>
                    <th className="px-4 py-3">Finished</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Tasks</th>
                    <th className="px-4 py-3">Latest Update</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {!visible.length && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-sm text-slate-400">
                        No finished projects match the search.
                      </td>
                    </tr>
                  )}
                  {visible.map((r) => (
                    <HistoryTableRow key={r.project.id} row={r} onOpen={() => selectProject(r.project.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function HistoryTableRow({ row, onOpen }: { row: HistoryRow; onOpen: () => void }) {
  const { project: p, overview, finished, lateBy } = row;
  const { stats, latest } = overview;
  const cancelled = stats.counts.Cancelled;

  return (
    <tr className="group transition hover:bg-slate-50">
      <td className="min-w-64 px-5 py-3">
        <button type="button" onClick={onOpen} className="flex items-start gap-2 text-left">
          <span className="mt-1.5">
            <ColorDot color={p.color} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-800 group-hover:text-sky-700">{p.name}</span>
            {p.department && <span className="block text-xs text-slate-400">{p.department}</span>}
          </span>
        </button>
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">{p.owner || "—"}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(p.startDate) || "—"}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(p.endDate) || "—"}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-700">
        <Tooltip title="End date of the last Done task">
          <span>{formatDate(finished) || "—"}</span>
        </Tooltip>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {lateBy == null ? (
          <span className="text-xs text-slate-300">—</span>
        ) : lateBy <= 0 ? (
          <Tooltip title={lateBy < 0 ? `Finished ${-lateBy} days before target` : "Finished on the target date"}>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">✓ On time</span>
          </Tooltip>
        ) : (
          <Tooltip title={`Finished ${lateBy} days after the target end date`}>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              {lateBy} {lateBy === 1 ? "day" : "days"} late
            </span>
          </Tooltip>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
        <Tooltip title={cancelled ? `${stats.counts.Done} Done, ${cancelled} Cancelled` : `${stats.counts.Done} Done`}>
          <span>
            <b className="text-slate-800">{stats.counts.Done}</b> done{cancelled > 0 && <span className="text-slate-400"> · {cancelled} cancelled</span>}
          </span>
        </Tooltip>
      </td>
      <td className="max-w-64 px-4 py-3">
        {latest ? (
          <Tooltip title={latest.achievement || "No achievement recorded"}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ProjectStatusBadge status={latest.projectStatus} />
                <span className="whitespace-nowrap text-[11px] text-slate-400">{formatDate(latest.updateDate)}</span>
              </div>
              {latest.achievement && <div className="mt-1 truncate text-xs text-slate-500">{latest.achievement}</div>}
            </div>
          </Tooltip>
        ) : (
          <span className="text-xs text-slate-300">No updates</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Tooltip title="Open the project dashboard">
          <Button size="small" variant="outlined" endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} onClick={onOpen}>
            Open
          </Button>
        </Tooltip>
      </td>
    </tr>
  );
}
