import type { Project, Task } from "@/lib/types";
import { formatDate, isOverdue, taskProgressColor, todayISO } from "@/lib/utils";
import { ColorDot, DevTags, PhaseBadge, PriorityBadge, StatusBadge } from "../ui/Badges";
import { ProgressBar } from "../ui/Primitives";

interface TaskTableProps {
  tasks: Task[];
  /** When provided, a Project column is shown. */
  projects?: Project[];
  onRowClick: (task: Task) => void;
  empty: React.ReactNode;
}

const th = "px-4 py-3 text-left";
const td = "px-4 py-3";

export default function TaskTable({ tasks, projects, onRowClick, empty }: TaskTableProps) {
  const today = todayISO();
  const cols = projects ? 10 : 9;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr className="text-xs uppercase tracking-wide text-slate-500">
            <th className={th}>Phase</th>
            {projects && <th className={th}>Project</th>}
            <th className={th}>Task</th>
            <th className={th}>Owner</th>
            <th className={th}>Dev.</th>
            <th className={th}>Status</th>
            <th className={th}>Priority</th>
            <th className={th}>Progress</th>
            <th className={th}>Start Date</th>
            <th className={th}>End Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {!tasks.length && (
            <tr>
              <td colSpan={cols} className="py-12 text-center text-sm text-slate-400">
                {empty}
              </td>
            </tr>
          )}
          {tasks.map((t) => {
            const overdue = isOverdue(t, today);
            const proj = projects?.find((p) => p.id === t.projectId);
            return (
              <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onRowClick(t)}>
                <td className={td}>
                  <PhaseBadge phase={t.phase} />
                </td>
                {projects && (
                  <td className={td}>
                    <div className="flex items-center gap-1.5">
                      <ColorDot color={proj?.color ?? "#94a3b8"} size="xs" />
                      <span className="text-xs text-slate-500">{proj?.name ?? "—"}</span>
                    </div>
                  </td>
                )}
                <td className={`${td} text-sm font-medium text-slate-800`}>
                  {t.name}
                  {overdue && <span className="ml-1 text-xs text-red-400">⚠</span>}
                </td>
                <td className={`${td} text-xs text-slate-500`}>{t.owner || "—"}</td>
                <td className={`${td} text-xs`}>
                  <DevTags devs={t.dev} short />
                </td>
                <td className={td}>
                  <StatusBadge status={t.status} />
                </td>
                <td className={td}>
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className={`${td} w-28`}>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={t.progress} color={taskProgressColor(t.progress)} className="h-1.5 flex-1" />
                    <span className="w-7 text-xs text-slate-400">{t.progress}%</span>
                  </div>
                </td>
                <td className={`${td} whitespace-nowrap text-xs text-slate-400`}>{formatDate(t.startDate) || "—"}</td>
                <td className={`${td} whitespace-nowrap text-xs ${overdue ? "font-semibold text-red-400" : "text-slate-400"}`}>
                  {formatDate(t.endDate) || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
