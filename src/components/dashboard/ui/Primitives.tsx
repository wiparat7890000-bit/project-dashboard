import Tooltip from "@mui/material/Tooltip";

export function Panel({ className = "", children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white/95 shadow ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function ProgressBar({
  value,
  color,
  className = "h-2",
}: {
  value: number;
  color: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

/** A stacked bar showing how many items fall in each segment. */
export function StackedBar({
  segments,
  className = "h-2",
}: {
  segments: { label: string; count: number; color: string }[];
  className?: string;
}) {
  const visible = segments.filter((s) => s.count > 0);
  if (!visible.length) return <div className={`rounded-full bg-slate-100 ${className}`} />;
  return (
    <div className={`flex gap-px overflow-hidden rounded-full ${className}`}>
      {visible.map((s) => (
        <div key={s.label} style={{ flex: s.count, background: s.color }} title={`${s.label}: ${s.count}`} />
      ))}
    </div>
  );
}

export function Donut({
  value,
  color,
  caption,
  size = "lg",
}: {
  value: number;
  color: string;
  caption?: string;
  size?: "lg" | "sm";
}) {
  const lg = size === "lg";
  const r = lg ? 50 : 24;
  const box = lg ? 120 : 60;
  const stroke = lg ? 12 : 6;
  const circ = 2 * Math.PI * r;
  const c = box / 2;
  return (
    <svg viewBox={`0 0 ${box} ${box}`} className={lg ? "h-32 w-32" : "h-12 w-12 shrink-0"} role="img" aria-label={`${value}%`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ - (circ * value) / 100}
        strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}
        className="transition-[stroke-dashoffset] duration-700"
      />
      <text x={c} y={lg ? 64 : 34} textAnchor="middle" fontSize={lg ? 22 : 11} fontWeight={700} fill="#0f172a">
        {value}%
      </text>
      {lg && caption && (
        <text x={c} y={78} textAnchor="middle" fontSize={9} fill="#94a3b8">
          {caption}
        </text>
      )}
    </svg>
  );
}

export interface Kpi {
  label: string;
  value: React.ReactNode;
  icon: string;
  bg: string;
  border: string;
  /** Extra content under the value, e.g. a progress bar. */
  footer?: React.ReactNode;
  /** Tooltip explaining how the value is calculated. */
  hint?: string;
}

export function KpiCard({ kpi, compact = false }: { kpi: Kpi; compact?: boolean }) {
  const card = (
    <Panel className={`flex items-center transition hover:-translate-y-0.5 hover:shadow-md ${compact ? "gap-3 p-4" : "gap-4 p-5"} ${kpi.border}`}>
      <div className={`${kpi.bg} flex ${compact ? "h-11 w-11" : "h-12 w-12"} shrink-0 items-center justify-center rounded-xl text-xl`}>
        {kpi.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-bold text-slate-800">{kpi.value}</div>
        <div className="text-xs font-medium leading-tight text-slate-500">{kpi.label}</div>
        {kpi.footer}
      </div>
    </Panel>
  );
  return kpi.hint ? <Tooltip title={kpi.hint}>{card}</Tooltip> : card;
}

export function SectionHeading({ children, accent = "bg-sky-500", as: Tag = "h2" }: { children: React.ReactNode; accent?: string; as?: "h2" | "h3" }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-6 w-1 rounded-full ${accent}`} />
      <Tag className={Tag === "h2" ? "text-xl font-bold text-slate-800" : "text-base font-bold text-slate-700"}>{children}</Tag>
    </div>
  );
}

export function DaysLeft({ days, variant = "short" }: { days: number | null; variant?: "short" | "long" }) {
  if (days == null) return null;
  if (days < 0) return <span className="font-semibold text-red-500">⚠ Overdue {Math.abs(days)}d</span>;
  const label = variant === "long" ? `${days} days left` : `${days}d left`;
  if (days <= 14) return <span className="text-amber-500">⏰ {label}</span>;
  return <span className="text-slate-400">{label}</span>;
}
