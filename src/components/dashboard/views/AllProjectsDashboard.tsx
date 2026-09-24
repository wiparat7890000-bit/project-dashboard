"use client";

import Button from "@mui/material/Button";
import { STATUS_STYLE } from "@/lib/constants";
import { STATUSES } from "@/lib/types";
import {
  avgProgress,
  countByStatus,
  donutColor,
  formatDate,
  getProjectOverview,
  isDelayed,
  projectProgressColor,
  todayISO,
} from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { ColorDot, HealthIndicator, ProjectStatusBadge } from "../ui/Badges";
import { DaysLeft, Donut, KpiCard, Panel, ProgressBar, SectionHeading, StackedBar, type Kpi } from "../ui/Primitives";
import TaskTable from "./TaskTable";

const TABLE_LIMIT = 15;

export default function AllProjectsDashboard() {
  const { data, activeProjects: projects, activeTasks: tasks, historyProjects, selectProject, openProjectDialog, setTab } = useDashboard();
  const today = todayISO();
  const counts = countByStatus(tasks);
  const delayed = tasks.filter((t) => isDelayed(t, today)).length;
  const avg = avgProgress(tasks);
  const stats = projects.map((p) => {
    const overview = getProjectOverview(p, tasks, data.updates);
    return { project: p, stats: overview.stats, overview };
  });

  const kpis: Kpi[] = [
    { label: "Active Projects", value: projects.length, icon: "🗂️", bg: "bg-indigo-50", border: "border-indigo-200" },
    { label: "Total Tasks", value: tasks.length, icon: "📋", bg: "bg-blue-50", border: "border-blue-200" },
    { label: "Completed", value: counts.Done, icon: "✅", bg: "bg-green-50", border: "border-green-200" },
    { label: "In Progress", value: counts["In Progress"], icon: "⚙️", bg: "bg-sky-50", border: "border-sky-200" },
    { label: "Delayed Tasks", value: delayed, icon: "⚠️", bg: "bg-red-50", border: "border-red-200" },
  ];

  return (
    <div className="animate-slide-in">
      <div className="mb-5 flex items-center gap-3">
        <SectionHeading>All Projects Overview</SectionHeading>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{projects.length} Active Projects</span>
        {historyProjects.length > 0 && (
          <button type="button" onClick={() => setTab("history")} className="ml-auto text-xs font-semibold text-slate-500 hover:text-sky-600">
            📦 {historyProjects.length} finished in Project History →
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} compact />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="flex flex-col items-center p-6">
          <div className="mb-3 self-start text-sm font-semibold text-slate-600">Overall Avg. Progress</div>
          <Donut value={avg} color={donutColor(avg)} caption="All Tasks Avg" />
          <div className="mt-3 grid w-full grid-cols-2 gap-x-5 gap-y-1.5 text-xs">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <ColorDot color={STATUS_STYLE[s].bar} size="xs" />
                <span className="text-slate-600">
                  {s} <b>{counts[s]}</b>
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6 lg:col-span-2">
          <div className="mb-4 text-sm font-semibold text-slate-600">Progress by Project</div>
          <div className="space-y-4">
            {stats.map(({ project: p, stats: s }) => (
              <button key={p.id} type="button" className="block w-full text-left" onClick={() => selectProject(p.id)}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ColorDot color={p.color} />
                    <span className="text-sm font-medium text-slate-700 hover:text-sky-600">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400">
                      {s.counts.Done}/{s.total}
                    </span>
                    <DaysLeft days={s.daysLeft} />
                    <span className="font-bold text-slate-700">{s.avg}%</span>
                  </div>
                </div>
                <ProgressBar value={s.avg} color={projectProgressColor(s.avg)} className="h-2.5" />
              </button>
            ))}
            {!projects.length && <div className="py-4 text-center text-sm text-slate-400">No projects yet</div>}
          </div>
        </Panel>
      </div>

      <div className="mb-4">
        <SectionHeading as="h3" accent="bg-indigo-500">
          Project Cards
        </SectionHeading>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {stats.map(({ project: p, stats: s, overview }) => (
          <Panel
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => selectProject(p.id)}
            onKeyDown={(e) => e.key === "Enter" && selectProject(p.id)}
            className="cursor-pointer p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)]"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <ColorDot color={p.color} size="md" />
                <div className="text-sm font-semibold text-slate-800">{p.name}</div>
              </div>
              <Donut value={s.avg} color={projectProgressColor(s.avg)} size="sm" />
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={overview.status} />
              <HealthIndicator health={overview.health} />
            </div>
            <div className="mb-3 space-y-0.5 text-xs text-slate-400">
              {p.owner && <div>👤 {p.owner}</div>}
              <div>
                📅 {formatDate(p.startDate)} → {formatDate(p.endDate)}
              </div>
              <div>
                <DaysLeft days={s.daysLeft} />
              </div>
            </div>
            <StackedBar
              className="mb-3 h-2"
              segments={STATUSES.map((st) => ({ label: st, count: s.counts[st], color: STATUS_STYLE[st].bar }))}
            />
            <div className="flex justify-between text-xs">
              <div className="flex gap-3 text-slate-500">
                <span>
                  <b className="text-slate-700">{s.counts.Done}</b> Done
                </span>
                <span>
                  <b className="text-slate-700">{s.counts["In Progress"]}</b> Active
                </span>
              </div>
              <span className="text-slate-400">{s.total} tasks</span>
            </div>
            {s.delayed > 0 && (
              <div className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-500">⚠ {s.delayed} delayed</div>
            )}
          </Panel>
        ))}
        {!projects.length && (
          <div className="col-span-full py-16 text-center text-slate-400">
            <div className="mb-3 text-5xl">🗂️</div>
            <div className="mb-3 text-lg font-medium">No projects yet</div>
            <Button variant="contained" onClick={() => openProjectDialog()}>
              Create First Project
            </Button>
          </div>
        )}
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 rounded-full bg-sky-400" />
            <div className="text-sm font-semibold text-slate-700">All Tasks Summary</div>
          </div>
          <div className="flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">✓ {counts.Done} Done</span>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">⚙ {counts["In Progress"]} Active</span>
            {delayed > 0 && <span className="rounded-full bg-red-100 px-2 py-1 text-red-600">⚠ {delayed} Delayed</span>}
          </div>
        </div>
        <TaskTable
          tasks={tasks.slice(0, TABLE_LIMIT)}
          projects={projects}
          onRowClick={(t) => selectProject(t.projectId)}
          empty="No tasks yet."
        />
        {tasks.length > TABLE_LIMIT && (
          <div className="bg-slate-50 px-6 py-3 text-center text-xs text-slate-400">
            Showing {TABLE_LIMIT} of {tasks.length} tasks
          </div>
        )}
      </Panel>
    </div>
  );
}
