import { STATUS_STYLE } from "@/lib/constants";
import { STATUSES, type Project, type ProjectStats } from "@/lib/types";
import { formatDate, projectProgressColor } from "@/lib/utils";
import { ColorDot } from "./ui/Badges";
import { DaysLeft, ProgressBar, StackedBar } from "./ui/Primitives";

/** Dark summary card shown when hovering a project in the sidebar. */
export default function ProjectHoverCard({ project: p, stats: s }: { project: Project; stats: ProjectStats }) {
  const tiles: [string, number, string][] = [
    ["Total", s.total, "#f1f5f9"],
    ["Done", s.counts.Done, "#22c55e"],
    ["Active", s.counts["In Progress"], "#38bdf8"],
    ["Delayed", s.delayed, s.delayed > 0 ? "#f87171" : "#64748b"],
  ];

  return (
    <div className="w-60 text-[11px] text-slate-400">
      <div className="mb-2 flex items-center gap-2">
        <ColorDot color={p.color} size="md" />
        <span className="text-[13px] font-bold text-slate-100">{p.name}</span>
      </div>
      {p.department && <div className="mb-2 font-semibold text-sky-300">🏢 {p.department}</div>}
      {p.description && <div className="mb-2 leading-normal">{p.description}</div>}
      {p.owner && (
        <div className="mb-1.5 text-slate-300">
          👤 <span className="text-slate-200">{p.owner}</span>
        </div>
      )}
      <div className="mb-1">
        📅 {formatDate(p.startDate)} → {formatDate(p.endDate)}
      </div>
      <div className="mb-2.5">
        <DaysLeft days={s.daysLeft} variant="long" />
      </div>
      <div className="mb-1 flex items-center justify-between">
        <span>Progress</span>
        <span className="text-xs font-bold text-slate-100">{s.avg}%</span>
      </div>
      <ProgressBar value={s.avg} color={projectProgressColor(s.avg)} className="h-[5px] !bg-slate-700" />
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {tiles.map(([label, value, color]) => (
          <div key={label} className="rounded-lg bg-slate-900 px-2 py-1.5 text-center">
            <div className="text-sm font-bold" style={{ color }}>
              {value}
            </div>
            <div className="text-[10px] text-slate-500">{label}</div>
          </div>
        ))}
      </div>
      {s.total > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Status</div>
          <StackedBar
            className="h-1.5"
            segments={STATUSES.map((st) => ({ label: st, count: s.counts[st], color: STATUS_STYLE[st].bar }))}
          />
        </div>
      )}
    </div>
  );
}
