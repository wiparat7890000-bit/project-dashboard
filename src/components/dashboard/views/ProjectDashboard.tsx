"use client";

import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { NEUTRAL_TAG, PHASE_STYLE, PROJECT_STATUS_STYLE, STATUS_STYLE } from "@/lib/constants";
import { STATUSES, type Project, type ProjectUpdate } from "@/lib/types";
import {
  avgProgress,
  formatDate,
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
import { useHiddenSections } from "../ui/useHiddenSections";
import TaskList, { NO_PHASE, TaskFilters, phasesOf, useTaskFilters } from "./TaskList";

export default function ProjectDashboard({ project }: { project: Project }) {
  const { data } = useDashboard();
  const overview = getProjectOverview(project, data.tasks, data.updates);
  const sections = useHiddenSections();

  return (
    <div className="animate-slide-in space-y-6">
      <ProjectHeader project={project} overview={overview} />
      <KpiSummary overview={overview} />
      <ProjectProgress overview={overview} />
      <TaskSection overview={overview} sections={sections} />
      <LatestUpdate overview={overview} sections={sections} />
      <UpdateHistory updates={overview.updates} sections={sections} />
    </div>
  );
}

type Sections = ReturnType<typeof useHiddenSections>;

// ── Section shell with Hide / Show ───────────────────────────────────────────

interface SectionProps {
  id: string;
  title: string;
  sections: Sections;
  /** Controls shown on the right while the section is visible. */
  action?: React.ReactNode;
  /** Short text shown next to the title while the section is hidden. */
  summary?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ id, title, sections, action, summary, children }: SectionProps) {
  const hidden = sections.isHidden(id);
  const toggle = (
    <Tooltip title={hidden ? `Show ${title}` : `Hide ${title}`}>
      <Button
        size="small"
        color="inherit"
        onClick={() => sections.toggle(id)}
        startIcon={hidden ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
        aria-expanded={!hidden}
        aria-controls={`section-${id}`}
        className="!text-slate-500 hover:!bg-slate-200/60"
      >
        {hidden ? "Show" : "Hide"}
      </Button>
    </Tooltip>
  );

  return (
    <section aria-labelledby={`section-${id}-title`}>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${hidden ? "rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-2.5" : "mb-4"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={`h-5 w-1 rounded-full ${hidden ? "bg-slate-300" : "bg-sky-500"}`} />
          <h3 id={`section-${id}-title`} className={`text-base font-bold ${hidden ? "text-slate-500" : "text-slate-700"}`}>
            {title}
          </h3>
          {hidden && summary && <span className="truncate text-xs text-slate-400">{summary}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!hidden && action}
          {toggle}
        </div>
      </div>
      <Collapse in={!hidden} id={`section-${id}`} unmountOnExit>
        {children}
      </Collapse>
    </section>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function ProjectHeader({ project, overview }: { project: Project; overview: ProjectOverview }) {
  const { openProjectDialog, openUpdateDialog, isInHistory, setTab } = useDashboard();
  const { stats, status, health, isAuto, lastUpdated, latest } = overview;
  const inHistory = isInHistory(project.id);
  const showDaysLeft = stats.daysLeft != null && status !== "Completed";

  const info: { label: string; value: React.ReactNode; hint: string }[] = [
    { label: "Project Owner", value: project.owner || "—", hint: "Person accountable for the project" },
    { label: "Start Date", value: formatDate(project.startDate) || "—", hint: "Planned project start" },
    { label: "Target End Date", value: formatDate(project.endDate) || "—", hint: "Planned project finish" },
    { label: "Priority", value: <PriorityBadge priority={project.priority} />, hint: "Project priority — change it in Edit Project" },
    {
      label: "Project Status",
      value: (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <ProjectStatusBadge status={status} />
          {isAuto && <span className="text-[10px] text-slate-400">(suggested)</span>}
        </span>
      ),
      hint: isAuto
        ? "No update saved yet — status is suggested from task progress. Save an update to set it."
        : `Set by the update of ${formatDate(latest?.updateDate)}`,
    },
    {
      label: "Health",
      value: <HealthIndicator health={health} />,
      hint: isAuto ? "Suggested from delayed tasks until an update is saved" : "Overall health from the latest update",
    },
    {
      label: "Last Updated",
      value: formatDate(lastUpdated) || "Not updated yet",
      hint: latest?.updatedBy ? `Latest project update by ${latest.updatedBy}` : "Date of the latest project update",
    },
  ];

  return (
    <Panel className="overflow-hidden">
      <div
        className="flex flex-wrap items-start justify-between gap-4 p-5 text-white"
        style={{ background: `linear-gradient(135deg, #0f172a, ${project.color})` }}
      >
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/60">
            Project Dashboard
            {inHistory && (
              <Tooltip title="All tasks are Done, so this project is listed in Project History. Reopen a task to make it active again.">
                <button
                  type="button"
                  onClick={() => setTab("history")}
                  className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] normal-case tracking-normal text-white hover:bg-white/25"
                >
                  📦 In Project History
                </button>
              </Tooltip>
            )}
          </div>
          <h2 className="text-xl font-bold leading-snug">{project.name}</h2>
          {project.description && <div className="mt-1 text-sm text-white/75">{project.description}</div>}
          {project.department && <div className="mt-2 text-xs text-white/60">🏢 {project.department}</div>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Tooltip title="Record status, health, achievements, issues and next steps">
            <Button variant="contained" startIcon={<AddIcon />} onClick={openUpdateDialog} className="!shadow-md">
              Update Project
            </Button>
          </Tooltip>
          <div className="flex items-center gap-3 text-xs text-white/75">
            {showDaysLeft && (
              <Tooltip title={`Target end date ${formatDate(project.endDate)}`}>
                <span>{stats.daysLeft! < 0 ? `${Math.abs(stats.daysLeft!)} days past target` : `${stats.daysLeft} days left`}</span>
              </Tooltip>
            )}
            <Tooltip title="Edit name, dates, owner, priority and color">
              <button type="button" onClick={() => openProjectDialog(project.id)} className="inline-flex items-center gap-1 hover:text-white">
                <EditOutlinedIcon sx={{ fontSize: 14 }} />
                <span className="underline">Edit Project</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-4 xl:grid-cols-7">
        {info.map((i) => (
          <Tooltip key={i.label} title={i.hint} placement="bottom-start">
            <div className="min-w-0 rounded-lg px-2 py-1 transition hover:bg-slate-50">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{i.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-700">{i.value}</dd>
            </div>
          </Tooltip>
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
      hint: `Average progress of ${stats.total} task${stats.total === 1 ? "" : "s"}`,
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
      hint: "Tasks at 100% progress out of all tasks",
    },
    {
      label: "Open Issues",
      value: openIssues,
      icon: "🚩",
      bg: "bg-amber-50",
      border: "border-amber-200",
      hint: "Issues from project updates that are not Resolved or Closed",
    },
    {
      label: "Delayed Tasks",
      value: stats.delayed,
      icon: "⚠️",
      bg: "bg-red-50",
      border: "border-red-200",
      hint: "Tasks past their end date with progress below 100%",
    },
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
          <h3 className="text-sm font-bold text-slate-700">Project Progress</h3>
          <span className="text-xs text-slate-400">by workstream</span>
        </div>
        {!groups.length && <div className="py-6 text-center text-sm text-slate-400">No tasks yet — add a task to track progress.</div>}
        <div className="space-y-1">
          {groups.map(([phase, tasks]) => {
            const avg = avgProgress(tasks);
            const done = tasks.filter((t) => t.progress >= 100).length;
            const color = (phase ? PHASE_STYLE[phase] : NEUTRAL_TAG).color;
            const name = phase || "No phase";
            return (
              <Tooltip key={phase || "none"} title={`${name}: ${done} of ${tasks.length} task${tasks.length === 1 ? "" : "s"} done · average ${avg}%`} placement="top">
                <div className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,13rem)_1fr_auto]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="truncate text-sm font-semibold text-slate-700">{name}</span>
                  </div>
                  <ProgressBar value={avg} color={projectProgressColor(avg)} className="h-2.5" />
                  <div className="flex w-20 items-center justify-end gap-2 text-xs">
                    <span className="text-slate-400">
                      {done}/{tasks.length}
                    </span>
                    <span className="w-9 text-right font-bold text-slate-700">{avg}%</span>
                  </div>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-6">
        <h3 className="mb-4 text-sm font-bold text-slate-700">Task Status</h3>
        <div className="space-y-1.5">
          {STATUSES.map((st) => (
            <Tooltip key={st} title={`${stats.counts[st]} of ${stats.total} tasks are ${st} (${pct(stats.counts[st], stats.total)}%)`} placement="left">
              <div className="rounded-lg px-2 py-1 transition hover:bg-slate-50">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{st}</span>
                  <span className="text-slate-400">
                    {stats.counts[st]}/{stats.total}
                  </span>
                </div>
                <ProgressBar value={pct(stats.counts[st], stats.total)} color={STATUS_STYLE[st].bar} />
              </div>
            </Tooltip>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

function TaskSection({ overview, sections }: { overview: ProjectOverview; sections: Sections }) {
  const { openTaskDialog } = useDashboard();
  const { filters, setFilters, apply, active, reset } = useTaskFilters();
  const all = overview.stats.tasks;
  const tasks = apply(all);
  const phases = phasesOf(all);
  const phaseCounts = Object.fromEntries(phases.map((p) => [p, all.filter((t) => (p === NO_PHASE ? !t.phase : t.phase === p)).length]));

  return (
    <Section
      id="tasks"
      title="Task / Milestone"
      sections={sections}
      summary={`${all.length} task${all.length === 1 ? "" : "s"} · ${overview.stats.completed} completed`}
      action={
        <>
          <TaskFilters filters={filters} onChange={setFilters} phases={phases} phaseCounts={phaseCounts} />
          <Tooltip title="Add a task to this project">
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openTaskDialog()}>
              Add Task
            </Button>
          </Tooltip>
        </>
      }
    >
      {active && (
        <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
          Showing {tasks.length} of {all.length} tasks
          <button type="button" onClick={reset} className="font-semibold text-sky-600 hover:underline">
            Clear filters
          </button>
        </div>
      )}
      <TaskList
        tasks={tasks}
        grouped
        empty={
          active ? (
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
    </Section>
  );
}

// ── Latest update ─────────────────────────────────────────────────────────────

function IssueStatusControl({ update }: { update: ProjectUpdate }) {
  const { setIssueStatus } = useDashboard();
  if (!hasIssue(update.issueRisk)) return null;
  const open = update.issueStatus === "Open";
  return (
    <span className="ml-2 inline-flex items-center gap-2 align-middle">
      <Tooltip title={open ? "Counted in Open Issues" : "Not counted in Open Issues"}>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${open ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
          {update.issueStatus}
        </span>
      </Tooltip>
      <Tooltip title={open ? "Mark this issue as resolved" : "Reopen this issue"}>
        <button
          type="button"
          onClick={() => setIssueStatus(update.id, open ? "Resolved" : "Open")}
          className="text-[11px] font-semibold text-sky-500 hover:text-sky-700 hover:underline"
        >
          {open ? "Mark resolved" : "Reopen"}
        </button>
      </Tooltip>
    </span>
  );
}

function LatestUpdate({ overview, sections }: { overview: ProjectOverview; sections: Sections }) {
  const { openUpdateDialog } = useDashboard();
  const u = overview.latest;

  return (
    <Section
      id="latest"
      title="Latest Project Update"
      sections={sections}
      summary={u ? `${formatDate(u.updateDate)} · ${u.projectStatus} · ${u.progress}%` : "No updates yet"}
    >
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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-100 bg-slate-50/60 px-6 py-4">
            <div className="text-lg font-bold text-slate-800">{formatDate(u.updateDate)}</div>
            <Stat label="Status">
              <ProjectStatusBadge status={u.projectStatus} />
            </Stat>
            <Stat label="Health">
              <HealthIndicator health={u.healthStatus} />
            </Stat>
            <Stat label="Progress">
              <Tooltip title="Overall progress when this update was saved">
                <span className="flex items-center gap-2">
                  <ProgressBar value={u.progress} color={projectProgressColor(u.progress)} className="h-1.5 w-20" />
                  <b className="text-sm text-slate-700">{u.progress}%</b>
                </span>
              </Tooltip>
            </Stat>
            {u.updatedBy && (
              <div className="ml-auto text-xs text-slate-400">
                Updated by <b className="text-slate-600">{u.updatedBy}</b>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 px-6 py-5 md:grid-cols-2">
            <Field icon="🏆" label="Key Achievement">
              {u.achievement}
            </Field>
            <Field icon="🚩" label="Issue / Risk">
              {u.issueRisk}
              <IssueStatusControl update={u} />
            </Field>
            <Field icon="➡️" label="Next Action">
              {u.nextAction}
            </Field>
            <Field icon="🎯" label="Next Milestone">
              {u.nextMilestone && (
                <>
                  {u.nextMilestone}
                  {u.nextMilestoneDate && <div className="text-xs text-slate-400">Target: {formatDate(u.nextMilestoneDate)}</div>}
                </>
              )}
            </Field>
            {u.remark && (
              <Field icon="💬" label="Remark" className="md:col-span-2">
                {u.remark}
              </Field>
            )}
          </div>
        </Panel>
      )}
    </Section>
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

function Field({ icon, label, children, className = "" }: { icon: string; label: string; children: React.ReactNode; className?: string }) {
  const empty = children == null || children === "" || children === false;
  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div className="whitespace-pre-line text-sm text-slate-700">{empty ? <span className="text-slate-300">—</span> : children}</div>
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────

function UpdateHistory({ updates, sections }: { updates: ProjectUpdate[]; sections: Sections }) {
  const { deleteProjectUpdate } = useDashboard();
  if (!updates.length) return null;

  return (
    <Section
      id="history"
      title="Project Update History"
      sections={sections}
      summary={`${updates.length} update${updates.length === 1 ? "" : "s"}`}
      action={<span className="text-xs text-slate-400">{updates.length} updates</span>}
    >
      <Panel className="px-4 py-4 sm:px-6">
        <ol className="relative">
          {updates.map((u, i) => (
            <li key={u.id} className="relative flex gap-4 pb-2 last:pb-0">
              {i < updates.length - 1 && <span className="absolute left-[7px] top-6 h-full w-0.5 bg-slate-200" aria-hidden />}
              <Tooltip title={u.projectStatus} placement="left">
                <span
                  className="relative z-[1] mt-3 h-4 w-4 shrink-0 rounded-full border-[3px] border-white shadow"
                  style={{ background: PROJECT_STATUS_STYLE[u.projectStatus].bar }}
                />
              </Tooltip>
              <div className="group min-w-0 flex-1 rounded-xl px-3 py-2 transition hover:bg-slate-50">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{formatDate(u.updateDate)}</span>
                  {i === 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">Latest</span>}
                  <ProjectStatusBadge status={u.projectStatus} />
                  <HealthIndicator health={u.healthStatus} />
                  <Tooltip title="Overall progress at the time of this update">
                    <span className="text-xs text-slate-500">
                      Progress: <b className="text-slate-700">{u.progress}%</b>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete this update">
                    <IconButton
                      size="small"
                      aria-label={`Delete update of ${formatDate(u.updateDate)}`}
                      onClick={() => deleteProjectUpdate(u.id)}
                      className="!ml-auto text-slate-300 opacity-60 transition group-hover:opacity-100 hover:!text-red-400"
                    >
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </div>
                {u.achievement && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{u.achievement}</p>}
                {hasIssue(u.issueRisk) && (
                  <p className="mt-1 text-xs text-slate-500">
                    🚩 {u.issueRisk}
                    <IssueStatusControl update={u} />
                  </p>
                )}
                {u.nextAction && <p className="mt-1 text-xs text-slate-500">➡️ {u.nextAction}</p>}
                {u.updatedBy && <p className="mt-1 text-xs text-slate-400">Updated by {u.updatedBy}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </Section>
  );
}
