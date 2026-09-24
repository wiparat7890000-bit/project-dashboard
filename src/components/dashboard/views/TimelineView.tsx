"use client";

import { STATUS_STYLE } from "@/lib/constants";
import { PHASES, STATUSES, type Phase } from "@/lib/types";
import { firstName, formatDate, isDelayed, todayISO } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { PhaseBadge } from "../ui/Badges";
import { Panel } from "../ui/Primitives";

const DAY_MS = 86_400_000;
const PAD_DAYS = 5;
const phaseRank = (p: Phase | "") => (p ? PHASES.indexOf(p) : PHASES.length);

export default function TimelineView() {
  const { data, isAll, activeProject, activeProjectId, openTaskDialog } = useDashboard();
  const tasks = isAll ? data.tasks : data.tasks.filter((t) => t.projectId === activeProjectId);
  const title = isAll ? "All Projects Timeline" : `${activeProject?.name ?? ""} — Timeline`;

  const dates = [
    ...tasks.flatMap((t) => [t.startDate, t.endDate]),
    ...data.projects.flatMap((p) => [p.startDate, p.endDate]),
  ]
    .filter(Boolean)
    .sort();

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
  const pos = (d: Date | string) =>
    Math.max(0, Math.min(100, ((new Date(d).getTime() - start.getTime()) / DAY_MS / totalDays) * 100));

  const months: { label: string; left: number }[] = [];
  for (const m = new Date(start.getFullYear(), start.getMonth() + 1, 1); m <= maxDate; m.setMonth(m.getMonth() + 1)) {
    months.push({ label: m.toLocaleDateString("en-GB", { month: "short", year: "numeric" }), left: pos(m) });
  }

  const today = todayISO();
  const todayPos = pos(new Date());
  const sorted = [...tasks].sort(
    (a, b) => phaseRank(a.phase) - phaseRank(b.phase) || a.startDate.localeCompare(b.startDate),
  );

  return (
    <div className="animate-slide-in">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px] p-4">
            {/* Month header */}
            <div className="mb-2 flex">
              <div className="w-[220px] shrink-0 pr-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Task</div>
              <div className="relative h-[22px] flex-1">
                {months.map((m) => (
                  <span key={m.label} className="absolute whitespace-nowrap text-[10px] font-semibold text-slate-400" style={{ left: `${m.left}%` }}>
                    {m.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Rows */}
            {sorted.map((t, i) => {
              const proj = data.projects.find((p) => p.id === t.projectId);
              const left = pos(t.startDate || start);
              const right = pos(t.endDate || maxDate);
              const width = Math.max(0.5, right - left);
              const color = STATUS_STYLE[t.status].bar;
              const overdue = isDelayed(t, today);
              const done = t.status === "Done";
              const sub = isAll && proj ? proj.name : t.dev.map(firstName).join(", ") || t.owner;

              return (
                <div key={t.id} className="mb-1 flex min-h-9 items-center">
                  <div className="w-[220px] shrink-0 overflow-hidden pr-3">
                    <div className={`truncate text-xs font-semibold ${overdue ? "text-red-500" : "text-slate-700"}`} title={t.name}>
                      {t.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      {t.phase && <PhaseBadge phase={t.phase} size="sm" />}
                      {sub && <span className="truncate text-[10px] text-slate-400">{sub}</span>}
                    </div>
                  </div>

                  <div className={`relative h-9 flex-1 rounded-md ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
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

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-2.5 text-[10px] text-slate-500">
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
        </div>
      </Panel>
    </div>
  );
}
