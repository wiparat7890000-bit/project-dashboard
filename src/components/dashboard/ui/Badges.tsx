import { NEUTRAL_TAG, PHASE_STYLE, PRIORITY_STYLE, STATUS_STYLE, type TagStyle } from "@/lib/constants";
import type { Phase, Priority, Status } from "@/lib/types";

function Tag({ tag, children, className = "" }: { tag: TagStyle; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${className}`}
      style={{ background: tag.bg, color: tag.color }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return <Tag tag={s}>{s.icon} {status}</Tag>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Tag tag={PRIORITY_STYLE[priority]}>{priority}</Tag>;
}

export function PhaseBadge({ phase, size = "md" }: { phase: Phase | ""; size?: "sm" | "md" }) {
  const tag = phase ? PHASE_STYLE[phase] : { ...NEUTRAL_TAG, color: "#94a3b8" };
  return (
    <Tag tag={tag} className={size === "sm" ? "!px-1.5 !py-px !text-[9px] font-bold" : "!text-[10px]"}>
      {phase || "—"}
    </Tag>
  );
}

export function OverdueBadge() {
  return <Tag tag={{ bg: "#fee2e2", color: "#dc2626" }}>⚠ Overdue</Tag>;
}

export function DevTags({ devs, short = false }: { devs: string[]; short?: boolean }) {
  if (!devs.length) return <>—</>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {devs.map((d) => (
        <span key={d} className="rounded-full bg-sky-100 px-1.5 py-px text-[10px] font-semibold text-sky-700">
          {short ? d.split(" ")[0] : d}
        </span>
      ))}
    </span>
  );
}

export function ColorDot({ color, size = "sm" }: { color: string; size?: "xs" | "sm" | "md" }) {
  const cls = size === "xs" ? "h-2 w-2" : size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";
  return <span className={`${cls} inline-block shrink-0 rounded-full`} style={{ background: color }} />;
}
