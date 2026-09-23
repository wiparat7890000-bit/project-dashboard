"use client";

import { useState } from "react";
import Collapse from "@mui/material/Collapse";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { PRIORITY_STYLE, STATUS_STYLE } from "@/lib/constants";
import { PHASES, PRIORITIES, STATUSES, type Phase, type Project, type Task } from "@/lib/types";
import { avgProgress, countByStatus, donutColor, formatDate, getProjectStats, pct, taskProgressColor } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { PhaseBadge } from "../ui/Badges";
import { Donut, KpiCard, Panel, ProgressBar, type Kpi } from "../ui/Primitives";
import TaskTable from "./TaskTable";

type SectionId = "phase" | "tasks";

export default function ProjectDashboard({ project }: { project: Project }) {
  const { data, openProjectDialog, openTaskDialog, setTab } = useDashboard();
  const s = getProjectStats(project, data.tasks);
  // Collapsed state is remembered per project for the session.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const isOpen = (id: SectionId) => !collapsed[`${project.id}_${id}`];
  const toggle = (id: SectionId) => setCollapsed((c) => ({ ...c, [`${project.id}_${id}`]: !c[`${project.id}_${id}`] }));

  const kpis: Kpi[] = [
    { label: "Total Tasks", value: s.total, icon: "📋", bg: "bg-blue-50", border: "border-blue-200" },
    { label: "Completed", value: s.counts.Done, icon: "✅", bg: "bg-green-50", border: "border-green-200" },
    { label: "In Progress", value: s.counts["In Progress"], icon: "⚙️", bg: "bg-sky-50", border: "border-sky-200" },
    { label: "Overdue", value: s.overdue, icon: "⚠️", bg: "bg-red-50", border: "border-red-200" },
  ];

  const activeTasks = s.tasks.filter((t) => t.status === "Not Start" || t.status === "Plan" || t.status === "In Progress");
  const hiddenCount = s.tasks.length - activeTasks.length;

  return (
    <div className="animate-slide-in">
      {/* Banner */}
      <div
        className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, #0f172a, ${project.color})` }}
      >
        <div>
          <div className="mb-1 text-xs uppercase tracking-widest text-white/60">Project</div>
          <h2 className="text-xl font-bold">{project.name}</h2>
          {project.description && <div className="mt-1 text-sm text-white/70">{project.description}</div>}
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/60">
            {project.owner && <span>👤 {project.owner}</span>}
            {project.department && <span>🏢 {project.department}</span>}
            <span>
              📅 {formatDate(project.startDate)} → {formatDate(project.endDate)}
            </span>
          </div>
        </div>
        <div className="text-right">
          {s.daysLeft != null && (
            <>
              <div className="text-3xl font-bold">{Math.abs(s.daysLeft)}</div>
              <div className="text-xs text-white/60">{s.daysLeft < 0 ? "days overdue" : "days left"}</div>
            </>
          )}
          <button type="button" onClick={() => openProjectDialog(project.id)} className="mt-2 text-xs text-white/60 underline hover:text-white">
            Edit Project
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="flex flex-col items-center p-6">
          <div className="mb-4 self-start text-sm font-semibold text-slate-600">Overall Progress</div>
          <Donut value={s.avg} color={donutColor(s.avg)} caption="Complete" />
        </Panel>

        <Panel className="p-6">
          <div className="mb-4 text-sm font-semibold text-slate-600">Status Breakdown</div>
          <div className="space-y-2.5">
            {STATUSES.map((st) => (
              <div key={st}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{st}</span>
                  <span className="text-slate-400">
                    {s.counts[st]}/{s.total}
                  </span>
                </div>
                <ProgressBar value={pct(s.counts[st], s.total)} color={STATUS_STYLE[st].bar} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="mb-4 text-sm font-semibold text-slate-600">Priority Distribution</div>
          <div className="space-y-3">
            {PRIORITIES.map((pr) => {
              const count = s.tasks.filter((t) => t.priority === pr).length;
              const style = PRIORITY_STYLE[pr];
              return (
                <div key={pr} className="flex items-center gap-3">
                  <div className="w-16 rounded-full px-2.5 py-1 text-center text-xs font-semibold" style={{ background: style.bg, color: style.color }}>
                    {pr}
                  </div>
                  <ProgressBar value={pct(count, s.total)} color={style.bar} className="h-2 flex-1" />
                  <div className="w-4 text-xs text-slate-400">{count}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Phase summary */}
      <Panel className="mb-6 overflow-hidden">
        <CollapsibleHeader title="📐 Phase Summary" open={isOpen("phase")} onToggle={() => toggle("phase")} />
        <Collapse in={isOpen("phase")}>
          <PhaseSummary tasks={s.tasks} />
        </Collapse>
      </Panel>

      {/* Active task overview */}
      <Panel className="overflow-hidden">
        <CollapsibleHeader
          title="Task Overview"
          open={isOpen("tasks")}
          onToggle={() => toggle("tasks")}
          extra={
            <div className="hidden gap-1.5 text-xs font-semibold sm:flex">
              {(["Not Start", "Plan", "In Progress"] as const).map((st) => (
                <span key={st} className="rounded-full px-2 py-0.5" style={{ background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].color }}>
                  {STATUS_STYLE[st].icon} {st}
                </span>
              ))}
            </div>
          }
          action={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTab("tasks");
              }}
              className="text-xs font-medium text-sky-500 hover:text-sky-700"
            >
              View All →
            </button>
          }
        />
        <Collapse in={isOpen("tasks")}>
          <TaskTable
            tasks={activeTasks}
            onRowClick={(t) => openTaskDialog(t.id)}
            empty={
              s.tasks.length ? (
                "🎉 ทุก task เสร็จสิ้นหรือยกเลิกแล้ว"
              ) : (
                <>
                  No tasks yet.{" "}
                  <button type="button" onClick={() => openTaskDialog()} className="text-sky-500 underline">
                    Add your first task
                  </button>
                </>
              )
            }
          />
          {hiddenCount > 0 && activeTasks.length > 0 && (
            <div className="bg-slate-50 px-6 py-3 text-center text-xs text-slate-400">
              แสดง {activeTasks.length} tasks ที่ยังดำเนินการอยู่ · ซ่อน {hiddenCount} tasks (Done/Cancelled) ·{" "}
              <button type="button" onClick={() => setTab("tasks")} className="text-sky-500 hover:underline">
                ดูทั้งหมด
              </button>
            </div>
          )}
        </Collapse>
      </Panel>
    </div>
  );
}

function CollapsibleHeader({
  title,
  open,
  onToggle,
  extra,
  action,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
      className="flex cursor-pointer select-none items-center justify-between border-b border-slate-100 px-6 py-4"
    >
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        {extra}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <ExpandMoreIcon className={`text-slate-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} fontSize="small" />
      </div>
    </div>
  );
}

function PhaseSummary({ tasks }: { tasks: Task[] }) {
  const groups = new Map<Phase | "", Task[]>();
  for (const t of tasks) groups.set(t.phase, [...(groups.get(t.phase) ?? []), t]);
  const ordered: (Phase | "")[] = [...PHASES.filter((p) => groups.has(p)), ...(groups.has("") ? [""] : [])] as (Phase | "")[];

  const th = "px-4 py-3 text-center";
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr className="text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 text-left">Phase</th>
            <th className={th}>Total</th>
            {STATUSES.map((s) => (
              <th key={s} className={th}>
                {s}
              </th>
            ))}
            <th className="min-w-[140px] px-4 py-3 text-left">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {!ordered.length && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                ยังไม่มี task
              </td>
            </tr>
          )}
          {ordered.map((ph) => {
            const pt = groups.get(ph)!;
            const counts = countByStatus(pt);
            const avg = avgProgress(pt);
            return (
              <tr key={ph || "none"} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <PhaseBadge phase={ph} />
                </td>
                <td className="px-4 py-3 text-center text-sm font-bold text-slate-700">{pt.length}</td>
                {STATUSES.map((st) => (
                  <td key={st} className="px-4 py-3 text-center text-xs font-medium" style={{ color: STATUS_STYLE[st].color }}>
                    {counts[st] || "—"}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={avg} color={taskProgressColor(avg)} className="h-2 flex-1" />
                    <span className="w-8 text-xs font-semibold text-slate-600">{avg}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
