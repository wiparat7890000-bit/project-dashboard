"use client";

import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { NEUTRAL_TAG, PHASE_STYLE, PROJECT_STATUS_STYLE, STATUS_STYLE } from "@/lib/constants";
import { STATUSES, type Project, type ProjectUpdate } from "@/lib/types";
import {
  avgProgress,
  formatDate,
  formatLongDate,
  getProjectOverview,
  groupByPhase,
  hasIssue,
  pct,
  projectProgressColor,
  type ProjectOverview,
} from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { HealthIndicator, PriorityBadge, ProjectStatusBadge } from "../ui/Badges";
import { KpiCard, Panel, ProgressBar, type Kpi } from "../ui/Primitives";
import TaskList, { TaskFilters, useTaskFilters } from "./TaskList";

export default function ProjectDashboard({ project }: { project: Project }) {
  const { data } = useDashboard();
  const overview = getProjectOverview(project, data.tasks, data.updates);

  return (
    <div className="animate-slide-in space-y-6">
      <ProjectHeader project={project} overview={overview} />
      <KpiSummary overview={overview} />
      <ProjectProgress overview={overview} />
      <TaskSection overview={overview} />
      <LatestUpdate overview={overview} />
      <UpdateHistory updates={overview.updates} />
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function ProjectHeader({ project, overview }: { project: Project; overview: ProjectOverview }) {
  const { openProjectDialog, openUpdateDialog } = useDashboard();
  const { stats, status, health, isAuto, lastUpdated } = overview;
  const showDaysLeft = stats.daysLeft != null && status !== "Completed";

  const info: { label: string; value: React.ReactNode }[] = [
    { label: "Project Owner", value: project.owner || "—" },
    { label: "Start Date", value: formatDate(project.startDate) || "—" },
    { label: "Target End Date", value: formatDate(project.endDate) || "—" },
    { label: "Priority", value: <PriorityBadge priority={project.priority} /> },
    {
      label: "Project Status",
      value: (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <ProjectStatusBadge status={status} />
          {isAuto && <span className="text-[10px] text-slate-400">(suggested)</span>}
        </span>
      ),
    },
    { label: "Health", value: <HealthIndicator health={health} /> },
    { label: "Last Updated", value: formatDate(lastUpdated) || "Not updated yet" },
  ];

  return (
    <Panel className="overflow-hidden">
      <div
        className="flex flex-wrap items-start justify-between gap-4 p-5 text-white"
        style={{ background: `linear-gradient(135deg, #0f172a, ${project.color})` }}
      >
        <div className="min-w-0">
          <div className="mb-1 text-xs uppercase tracking-widest text-white/60">Project Dashboard</div>
          <h2 className="text-xl font-bold leading-snug">{project.name}</h2>
          {project.description && <div className="mt-1 text-sm text-white/70">{project.description}</div>}
          {project.department && <div className="mt-2 text-xs text-white/60">🏢 {project.department}</div>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="contained" startIcon={<AddIcon />} onClick={openUpdateDialog}>
            Update Project
          </Button>
          <div className="flex items-center gap-3 text-xs text-white/70">
            {showDaysLeft && (
              <span>{stats.daysLeft! < 0 ? `${Math.abs(stats.daysLeft!)} days past target` : `${stats.daysLeft} days left`}</span>
            )}
            <button type="button" onClick={() => openProjectDialog(project.id)} className="underline hover:text-white">
              Edit Project
            </button>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-4 xl:grid-cols-7">
        {info.map((i) => (
          <div key={i.label} className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{i.label}</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{i.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

// ── KPI ───────────────────────────────────────────────────────────────────────

function KpiSummary({ overview }: { overview: ProjectOverview }) {
  const { stats, openIssues } = overview;
  const kpis: Kpi[] = [
    {
      label: "Overall Progress",
      value: `${stats.avg}%`,
      icon: "📈",
      bg: "bg-sky-50",
      border: "border-sky-200",
      footer: <ProgressBar value={stats.avg} color={projectProgressColor(stats.avg)} className="mt-1.5 h-1.5" />,
    },
    {
      label: "Completed Tasks",
      value: (
        <>
          {stats.completed} <span className="text-base font-semibold text-slate-400">/ {stats.total}</span>
        </>
      ),
      icon: "✅",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    { label: "Open Issues", value: openIssues, icon: "🚩", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Delayed Tasks", value: stats.delayed, icon: "⚠️", bg: "bg-red-50", border: "border-red-200" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((k) => (
        <KpiCard key={k.label} kpi={k} />
      ))}
    </div>
  );
}

// ── Project progress by workstream ───────────────────────────────────────────

function ProjectProgress({ overview }: { overview: ProjectOverview }) {
  const { stats } = overview;
  const groups = groupByPhase(stats.tasks);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel className="p-6 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-600">Project Progress</h3>
          <span className="text-xs text-slate-400">by workstream</span>
        </div>
        {!groups.length && <div className="py-6 text-center text-sm text-slate-400">No tasks yet — add a task to track progress.</div>}
        <div className="space-y-3.5">
          {groups.map(([phase, tasks]) => {
            const avg = avgProgress(tasks);
            const done = tasks.filter((t) => t.progress >= 100).length;
            const color = (phase ? PHASE_STYLE[phase] : NEUTRAL_TAG).color;
            return (
              <div key={phase || "none"} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,13rem)_1fr_auto]">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="truncate text-sm font-medium text-slate-700" title={phase || "No phase"}>
                    {phase || "No phase"}
                  </span>
                </div>
                <ProgressBar value={avg} color={projectProgressColor(avg)} className="h-2.5" />
                <div className="flex w-20 items-center justify-end gap-2 text-xs">
                  <span className="text-slate-400">
                    {done}/{tasks.length}
                  </span>
                  <span className="w-9 text-right font-bold text-slate-700">{avg}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-600">Task Status</h3>
        <div className="space-y-2.5">
          {STATUSES.map((st) => (
            <div key={st}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-700">{st}</span>
                <span className="text-slate-400">
                  {stats.counts[st]}/{stats.total}
                </span>
              </div>
              <ProgressBar value={pct(stats.counts[st], stats.total)} color={STATUS_STYLE[st].bar} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-full bg-sky-500" />
        <h3 className="text-base font-bold text-slate-700">{children}</h3>
      </div>
      {action}
    </div>
  );
}

function TaskSection({ overview }: { overview: ProjectOverview }) {
  const { openTaskDialog } = useDashboard();
  const { filters, setFilters, apply } = useTaskFilters();
  const tasks = apply(overview.stats.tasks);
  const filtered = !!(filters.status || filters.priority);

  return (
    <section>
      <SectionTitle
        action={
          <div className="flex flex-wrap gap-2">
            <TaskFilters filters={filters} onChange={setFilters} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openTaskDialog()}>
              Add Task
            </Button>
          </div>
        }
      >
        Task / Milestone
      </SectionTitle>
      <TaskList
        tasks={tasks}
        grouped
        empty={
          filtered ? (
            <div className="font-medium">No tasks match the filters</div>
          ) : (
            <>
              <div className="font-medium">No tasks yet</div>
              <button type="button" onClick={() => openTaskDialog()} className="mt-3 text-sm text-sky-500 underline">
                Add your first task
              </button>
            </>
          )
        }
      />
    </section>
  );
}

// ── Latest update ─────────────────────────────────────────────────────────────

function IssueStatusControl({ update }: { update: ProjectUpdate }) {
  const { setIssueStatus } = useDashboard();
  if (!hasIssue(update.issueRisk)) return null;
  const open = update.issueStatus === "Open";
  return (
    <span className="ml-2 inline-flex items-center gap-2 align-middle">
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${open ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
      >
        {update.issueStatus}
      </span>
      <button
        type="button"
        onClick={() => setIssueStatus(update.id, open ? "Resolved" : "Open")}
        className="text-[11px] font-medium text-sky-500 hover:text-sky-700 hover:underline"
      >
        {open ? "Mark resolved" : "Reopen"}
      </button>
    </span>
  );
}

function LatestUpdate({ overview }: { overview: ProjectOverview }) {
  const { openUpdateDialog } = useDashboard();
  const u = overview.latest;

  return (
    <section>
      <SectionTitle>Latest Project Update</SectionTitle>
      {!u ? (
        <Panel className="py-10 text-center text-slate-400">
          <div className="mb-2 text-4xl">📝</div>
          <div className="mb-3 font-medium">No project updates yet</div>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openUpdateDialog}>
            Update Project
          </Button>
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-100 px-6 py-4">
            <div className="text-lg font-bold text-slate-800">{formatLongDate(u.updateDate)}</div>
            <Stat label="Status">
              <ProjectStatusBadge status={u.projectStatus} />
            </Stat>
            <Stat label="Health">
              <HealthIndicator health={u.healthStatus} />
            </Stat>
            <Stat label="Progress">
              <span className="flex items-center gap-2">
                <ProgressBar value={u.progress} color={projectProgressColor(u.progress)} className="h-1.5 w-20" />
                <b className="text-sm text-slate-700">{u.progress}%</b>
              </span>
            </Stat>
            {u.updatedBy && <div className="ml-auto text-xs text-slate-400">Updated by <b className="text-slate-600">{u.updatedBy}</b></div>}
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 px-6 py-5 md:grid-cols-2">
            <Field label="Key Achievement">{u.achievement}</Field>
            <Field label="Issue / Risk">
              {u.issueRisk}
              <IssueStatusControl update={u} />
            </Field>
            <Field label="Next Action">{u.nextAction}</Field>
            <Field label="Next Milestone">
              {u.nextMilestone && (
                <>
                  {u.nextMilestone}
                  {u.nextMilestoneDate && <div className="text-xs text-slate-400">Target: {formatLongDate(u.nextMilestoneDate)}</div>}
                </>
              )}
            </Field>
            {u.remark && (
              <Field label="Remark" className="md:col-span-2">
                {u.remark}
              </Field>
            )}
          </div>
        </Panel>
      )}
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  const empty = children == null || children === "" || children === false;
  return (
    <div className={className}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="whitespace-pre-line text-sm text-slate-700">{empty ? <span className="text-slate-300">—</span> : children}</div>
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────

function UpdateHistory({ updates }: { updates: ProjectUpdate[] }) {
  const { deleteProjectUpdate } = useDashboard();
  if (!updates.length) return null;

  return (
    <section>
      <SectionTitle action={<span className="text-xs text-slate-400">{updates.length} updates</span>}>Project Update History</SectionTitle>
      <Panel className="px-6 py-5">
        <ol className="relative">
          {updates.map((u, i) => (
            <li key={u.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < updates.length - 1 && <span className="absolute left-[7px] top-5 h-full w-0.5 bg-slate-200" aria-hidden />}
              <span
                className="relative z-[1] mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] border-white shadow"
                style={{ background: PROJECT_STATUS_STYLE[u.projectStatus].bar }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{formatLongDate(u.updateDate)}</span>
                  {i === 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">Latest</span>}
                  <ProjectStatusBadge status={u.projectStatus} />
                  <HealthIndicator health={u.healthStatus} />
                  <span className="text-xs text-slate-500">
                    Progress: <b className="text-slate-700">{u.progress}%</b>
                  </span>
                  <IconButton
                    size="small"
                    aria-label={`Delete update of ${formatLongDate(u.updateDate)}`}
                    onClick={() => deleteProjectUpdate(u.id)}
                    className="!ml-auto text-slate-300 hover:!text-red-400"
                  >
                    <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </div>
                {u.achievement && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{u.achievement}</p>}
                {hasIssue(u.issueRisk) && (
                  <p className="mt-1 text-xs text-slate-500">
                    🚩 {u.issueRisk}
                    <IssueStatusControl update={u} />
                  </p>
                )}
                {u.updatedBy && <p className="mt-1 text-xs text-slate-400">Updated by {u.updatedBy}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </section>
  );
}
