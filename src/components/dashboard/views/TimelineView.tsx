"use client";

import { STATUS_STYLE } from "@/lib/constants";
import { STATUSES } from "@/lib/types";
import { firstName, formatDate, isDelayed, phaseRank, todayISO } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { PhaseBadge } from "../ui/Badges";
import { Panel } from "../ui/Primitives";

const DAY_MS = 86_400_000;
/** Width of the frozen task column. */
const LABEL_W = 240;
/** Minimum width per month so long timelines scroll sideways instead of squashing. */
const MONTH_MIN_W = 110;
const PAD_DAYS = 5;

export default function TimelineView() {
  const { data, activeProjects, activeTasks, isAll, activeProject, activeProjectId, openTaskDialog } = useDashboard();
  const tasks = isAll ? activeTasks : data.tasks.filter((t) => t.projectId === activeProjectId);
  const scopeProjects = isAll ? activeProjects : activeProject ? [activeProject] : [];
  const title = isAll ? "All Projects Timeline" : `${activeProject?.name ?? ""} — Timeline`;

  const dates = [...tasks.flatMap((t) => [t.startDate, t.endDate]), ...scopeProjects.flatMap((p) => [p.startDate, p.endDate])].filter(Boolean).sort();

  if (!tasks.length || !dates.length) {
    return (
      <div className="animate-slide-in">
        <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>
        <Panel className="py-16 text-center text-sm text-slate-400">No tasks to display.</Panel>
      </div>
    );
  }

  const minDate = new Date(dates[0]);
  const maxDate = new Date(dates[dates.length - 1]);
  const start = new Date(minDate.getTime() - PAD_DAYS * DAY_MS);
  const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / DAY_MS) + PAD_DAYS * 2;
  const pos = (d: Date | string) => Math.max(0, Math.min(100, ((new Date(d).getTime() - start.getTime()) / DAY_MS / totalDays) * 100));

  const months: { label: string; left: number }[] = [];
  for (const m = new Date(start.getFullYear(), start.getMonth() + 1, 1); m <= maxDate; m.setMonth(m.getMonth() + 1)) {
    months.push({ label: m.toLocaleDateString("en-GB", { month: "short", year: "numeric" }), left: pos(m) });
  }

  const today = todayISO();
  const todayPos = pos(new Date());
  const chartMinWidth = Math.max(900, LABEL_W + (months.length + 1) * MONTH_MIN_W);
  const sorted = [...tasks].sort((a, b) => phaseRank(a.phase, data.phaseList) - phaseRank(b.phase, data.phaseList) || a.startDate.localeCompare(b.startDate));

  return (
    <div className="animate-slide-in">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>
      <Panel className="overflow-hidden">
        {/* The chart scrolls inside its own box so the month header (top) and task column (left) stay frozen. */}
        <div className="max-h-[calc(100vh-280px)] overflow-auto" role="region" aria-label="Timeline chart" tabIndex={0}>
          <div style={{ minWidth: chartMinWidth }}>
            {/* Frozen month header */}
            <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-white shadow-[0_4px_8px_-6px_rgba(15,23,42,0.3)]">
              <div
                className="sticky left-0 z-10 flex shrink-0 items-center border-r border-slate-100 bg-white px-4 text-[11px] font-bold uppercase tracking-wide text-slate-500"
                style={{ width: LABEL_W }}
              >
                Task <span className="ml-1.5 font-semibold normal-case tracking-normal text-slate-400">({sorted.length})</span>
              </div>
              <div className="relative mr-4 h-10 flex-1">
                {months.map((m) => (
                  <span
                    key={m.label}
                    className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap border-l border-slate-200 pl-1.5 text-[10px] font-semibold text-slate-400"
                    style={{ left: `${m.left}%` }}
                  >
                    {m.label}
                  </span>
                ))}
                {todayPos > 0 && todayPos < 100 && (
                  <span
                    className="absolute bottom-0 -translate-x-1/2 rounded-t bg-red-500 px-1.5 py-px text-[9px] font-bold uppercase text-white"
                    style={{ left: `${todayPos}%` }}
                  >
                    Today
                  </span>
                )}
              </div>
            </div>

            {/* Rows */}
            <div className="pb-2">
              {sorted.map((t, i) => {
                const proj = data.projects.find((p) => p.id === t.projectId);
                const left = pos(t.startDate || start);
                const right = pos(t.endDate || maxDate);
                const width = Math.max(0.5, right - left);
                const color = STATUS_STYLE[t.status].bar;
                const overdue = isDelayed(t, today);
                const done = t.status === "Completed";
                const sub = isAll && proj ? proj.name : t.dev.map(firstName).join(", ") || t.owner;

                return (
                  <div key={t.id} className="group flex min-h-10 items-stretch">
                    {/* Frozen task column */}
                    <div
                      className={`sticky left-0 z-20 flex shrink-0 flex-col justify-center overflow-hidden border-r border-slate-100 px-4 py-1 transition-colors group-hover:bg-sky-50 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50"
                      }`}
                      style={{ width: LABEL_W }}
                    >
                      <div className={`truncate text-xs font-semibold ${overdue ? "text-red-500" : "text-slate-700"}`} title={t.name}>
                        {t.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1">
                        {t.phase && <PhaseBadge phase={t.phase} size="sm" />}
                        {sub && <span className="truncate text-[10px] text-slate-400">{sub}</span>}
                      </div>
                    </div>

                    <div className={`relative mr-4 flex-1 transition-colors group-hover:bg-sky-50/60 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                      {months.map((m) => (
                        <div key={m.label} className="absolute inset-y-0 w-px bg-slate-200" style={{ left: `${m.left}%` }} />
                      ))}
                      {todayPos > 0 && todayPos < 100 && (
                        <div className="absolute inset-y-0 z-[5] w-0.5 rounded-sm bg-red-500" style={{ left: `${todayPos}%` }} title="Today" />
                      )}
                      <button
                        type="button"
                        onClick={() => openTaskDialog(t.id)}
                        title={`${t.name} | ${t.status} | ${t.progress}% | ${formatDate(t.startDate)} → ${formatDate(t.endDate)}`}
                        className="absolute top-1/2 flex h-5 min-w-1 -translate-y-1/2 items-center overflow-hidden rounded-full px-2"
                        style={{ left: `${left}%`, width: `${width}%`, background: color, opacity: done ? 0.6 : 0.85 }}
                      >
                        {width > 4 && <span className="whitespace-nowrap text-[10px] font-bold text-white">{t.progress}%</span>}
                      </button>
                      {/* start dot */}
                      <div
                        className="pointer-events-none absolute top-1/2 z-[3] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
                        style={{ left: `${left}%`, borderColor: color }}
                      />
                      {/* end milestone */}
                      <div
                        className="pointer-events-none absolute top-1/2 z-[3] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-2"
                        style={{ left: `${Math.min(right, 99.5)}%`, borderColor: color, background: done ? color : "#fff" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend stays visible below the scroll area */}
        <div className="border-t border-slate-100 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
            <span className="font-semibold uppercase text-slate-400">Legend:</span>
            {STATUSES.map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-[3px] opacity-85" style={{ background: STATUS_STYLE[s].bar }} />
                {s}
              </span>
            ))}
            <span className="ml-2 flex items-center gap-1">
              <span className="h-3.5 w-0.5 rounded-sm bg-red-500" /> Today
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full border-2 border-slate-500 bg-white" /> Start
            </span>
            <span className="flex items-center gap-1">
              <span className="h-[7px] w-[7px] rotate-45 rounded-[1px] border-2 border-slate-500 bg-white" /> End
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
