import { NEUTRAL_TAG, PHASE_STYLE } from "@/lib/constants";
import type { Task } from "@/lib/types";
import { avgProgress, formatDate, groupByPhase, isOverdue, taskProgressColor, todayISO } from "@/lib/utils";
import { DevTags, OverdueBadge, PhaseBadge, PriorityBadge, StatusBadge } from "../ui/Badges";
import { ProgressBar } from "../ui/Primitives";

interface PhaseTaskCardsProps {
  tasks: Task[];
  onCardClick: (task: Task) => void;
  empty: React.ReactNode;
}

/** Tasks shown as cards, grouped under a header per phase. */
export default function PhaseTaskCards({ tasks, onCardClick, empty }: PhaseTaskCardsProps) {
  const today = todayISO();
  const groups = groupByPhase(tasks);

  if (!groups.length) return <div className="py-12 text-center text-sm text-slate-400">{empty}</div>;

  return (
    <div className="space-y-6 p-6">
      {groups.map(([phase, phaseTasks]) => {
        const accent = (phase ? PHASE_STYLE[phase] : NEUTRAL_TAG).color;
        const avg = avgProgress(phaseTasks);
        return (
          <section key={phase || "none"}>
            <div className="mb-3 flex items-center gap-3">
              <PhaseBadge phase={phase} />
              <span className="whitespace-nowrap text-xs text-slate-400">
                {phaseTasks.length} {phaseTasks.length === 1 ? "task" : "tasks"}
              </span>
              <div className="h-px flex-1 bg-slate-100" />
              <div className="flex w-32 items-center gap-2">
                <ProgressBar value={avg} color={taskProgressColor(avg)} className="h-1.5 flex-1" />
                <span className="w-8 text-right text-xs font-semibold text-slate-600">{avg}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {phaseTasks.map((t) => {
                const overdue = isOverdue(t, today);
                const color = taskProgressColor(t.progress);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onCardClick(t)}
                    className="flex flex-col rounded-xl border border-l-4 border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    style={{ borderLeftColor: accent }}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className={`text-sm font-semibold ${overdue ? "text-red-500" : "text-slate-800"}`}>{t.name}</div>
                      <div className="shrink-0 text-base font-bold" style={{ color }}>
                        {t.progress}%
                      </div>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      {overdue && <OverdueBadge />}
                    </div>
                    <div className="mb-3 space-y-1 text-xs text-slate-400">
                      <div>👤 {t.owner || "—"}</div>
                      {t.dev.length > 0 && (
                        <div>
                          💻 <DevTags devs={t.dev} short />
                        </div>
                      )}
                      <div className={overdue ? "font-semibold text-red-400" : ""}>
                        📅 {formatDate(t.startDate) || "—"} → {formatDate(t.endDate) || "—"}
                      </div>
                    </div>
                    <ProgressBar value={t.progress} color={color} className="mt-auto h-1.5" />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
