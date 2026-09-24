"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { HEALTH_STYLE, NO_ISSUE_TEXT, PROJECT_STATUS_STYLE } from "@/lib/constants";
import {
  HEALTH_STATUSES,
  ISSUE_STATUSES,
  PROJECT_STATUSES,
  type HealthStatus,
  type IssueStatus,
  type Project,
  type ProjectStatus,
} from "@/lib/types";
import { getProjectOverview, hasIssue, projectProgressColor, suggestProjectStatus, todayISO } from "@/lib/utils";
import { useDashboard, type ProjectUpdateInput } from "../DashboardContext";
import { ProgressBar } from "../ui/Primitives";
import DateField from "../ui/DateField";
import FormDialog, { FieldLabel } from "./FormDialog";

interface Props {
  open: boolean;
  project: Project;
  onClose: () => void;
}

type FormState = Omit<ProjectUpdateInput, "projectStatus" | "healthStatus"> & {
  projectStatus: ProjectStatus | "";
  healthStatus: HealthStatus | "";
};
type Errors = Partial<Record<keyof FormState, string>>;

export default function UpdateProjectDialog({ open, project, onClose }: Props) {
  const { data, saveProjectUpdate } = useDashboard();
  const overview = getProjectOverview(project, data.tasks, data.updates);
  const { stats, latest } = overview;
  const suggested = suggestProjectStatus(stats.tasks);

  const [form, setForm] = useState<FormState>(() => ({
    updateDate: todayISO(),
    progress: stats.avg,
    projectStatus: overview.status,
    healthStatus: overview.health,
    achievement: "",
    issueRisk: "",
    issueStatus: "Open",
    nextAction: "",
    nextMilestone: latest?.nextMilestone ?? "",
    nextMilestoneDate: latest?.nextMilestoneDate ?? "",
    remark: "",
    updatedBy: latest?.updatedBy || project.owner,
  }));
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const issueEntered = hasIssue(form.issueRisk);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.updateDate) e.updateDate = "Update date is required.";
    else if (form.updateDate > todayISO()) e.updateDate = "Update date cannot be in the future.";
    if (!form.projectStatus) e.projectStatus = "Project status is required.";
    if (!form.healthStatus) e.healthStatus = "Health status is required.";
    if (form.nextMilestoneDate && !form.nextMilestone.trim()) e.nextMilestone = "Enter the milestone name for this date.";
    if (form.nextMilestoneDate && form.updateDate && form.nextMilestoneDate < form.updateDate)
      e.nextMilestoneDate = "Milestone date must be on or after the update date.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    saveProjectUpdate({
      ...form,
      projectStatus: form.projectStatus as ProjectStatus,
      healthStatus: form.healthStatus as HealthStatus,
      progress: stats.avg,
      achievement: form.achievement.trim(),
      issueRisk: form.issueRisk.trim(),
      issueStatus: issueEntered ? form.issueStatus : "Closed",
      nextAction: form.nextAction.trim(),
      nextMilestone: form.nextMilestone.trim(),
      remark: form.remark.trim(),
      updatedBy: form.updatedBy.trim(),
    });
    onClose();
  };

  return (
    <FormDialog open={open} title="Update Project" onClose={onClose} onSubmit={handleSave} submitLabel="Save Update">
      <div className="-mt-1 text-xs text-slate-500">{project.name}</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Update Date *</FieldLabel>
          <DateField
            label="Update date"
            value={form.updateDate}
            max={todayISO()}
            onChange={(v) => set("updateDate", v)}
            error={!!errors.updateDate}
            helperText={errors.updateDate}
          />
        </div>
        <div>
          <FieldLabel>Updated By</FieldLabel>
          <TextField fullWidth size="small" placeholder="Your name" value={form.updatedBy} onChange={(e) => set("updatedBy", e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Overall Progress</span>
          <span className="text-lg font-bold text-slate-800">{stats.avg}%</span>
        </div>
        <ProgressBar value={stats.avg} color={projectProgressColor(stats.avg)} className="h-2 !bg-white" />
        <div className="mt-1 text-[11px] text-slate-400">
          Calculated from {stats.total} {stats.total === 1 ? "task" : "tasks"} ({stats.completed} at 100%)
        </div>
      </div>

      <div>
        <FieldLabel>Project Status *</FieldLabel>
        <TextField
          select
          fullWidth
          size="small"
          value={form.projectStatus}
          onChange={(e) => set("projectStatus", e.target.value as ProjectStatus)}
          error={!!errors.projectStatus}
          helperText={errors.projectStatus}
          slotProps={{ select: { displayEmpty: true } }}
        >
          <MenuItem value="" disabled>
            — Select status —
          </MenuItem>
          {PROJECT_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: PROJECT_STATUS_STYLE[s].bar }} />
              {s}
            </MenuItem>
          ))}
        </TextField>
        {suggested === "Completed" && form.projectStatus !== "Completed" && (
          <Alert
            severity="info"
            className="mt-2 !text-xs"
            action={
              <Button size="small" onClick={() => set("projectStatus", "Completed")}>
                Apply
              </Button>
            }
          >
            All tasks are at 100%. Suggested status: <b>Completed</b>
          </Alert>
        )}
      </div>

      <div>
        <FieldLabel>Health Status *</FieldLabel>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={form.healthStatus || null}
          onChange={(_, v: HealthStatus | null) => v && set("healthStatus", v)}
          aria-label="Health status"
        >
          {HEALTH_STATUSES.map((h) => (
            <ToggleButton
              key={h}
              value={h}
              sx={{
                textTransform: "none",
                gap: 1,
                "&.Mui-selected, &.Mui-selected:hover": { bgcolor: HEALTH_STYLE[h].bg, color: HEALTH_STYLE[h].color, fontWeight: 600 },
              }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: HEALTH_STYLE[h].dot }} />
              {h}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {errors.healthStatus && <div className="mt-1 text-xs text-red-600">{errors.healthStatus}</div>}
      </div>

      <div>
        <FieldLabel>Key Achievement</FieldLabel>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          placeholder="What has been completed or achieved since the last update?"
          value={form.achievement}
          onChange={(e) => set("achievement", e.target.value)}
        />
      </div>

      <div>
        <FieldLabel action={<Chip label={NO_ISSUE_TEXT} size="small" variant="outlined" className="!normal-case !tracking-normal" onClick={() => set("issueRisk", NO_ISSUE_TEXT)} />}>
          Issue / Risk
        </FieldLabel>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          placeholder="Describe current issue or risk."
          value={form.issueRisk}
          onChange={(e) => set("issueRisk", e.target.value)}
        />
        {issueEntered && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Issue status</span>
            <TextField select size="small" value={form.issueStatus} onChange={(e) => set("issueStatus", e.target.value as IssueStatus)} className="min-w-32">
              {ISSUE_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <span className="text-[11px] text-slate-400">Open issues are counted on the dashboard.</span>
          </div>
        )}
      </div>

      <div>
        <FieldLabel>Next Action</FieldLabel>
        <TextField fullWidth size="small" multiline minRows={2} placeholder="What is the next action?" value={form.nextAction} onChange={(e) => set("nextAction", e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Next Milestone</FieldLabel>
          <TextField
            fullWidth
            size="small"
            placeholder="e.g. Project Handover"
            value={form.nextMilestone}
            onChange={(e) => set("nextMilestone", e.target.value)}
            error={!!errors.nextMilestone}
            helperText={errors.nextMilestone}
          />
        </div>
        <div>
          <FieldLabel>Next Milestone Date</FieldLabel>
          <DateField
            label="Next milestone date"
            value={form.nextMilestoneDate}
            min={form.updateDate || undefined}
            onChange={(v) => set("nextMilestoneDate", v)}
            error={!!errors.nextMilestoneDate}
            helperText={errors.nextMilestoneDate}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Remark</FieldLabel>
        <TextField fullWidth size="small" multiline minRows={2} placeholder="Optional" value={form.remark} onChange={(e) => set("remark", e.target.value)} />
      </div>

      {Object.values(errors).some(Boolean) && <Alert severity="error">Please fix the highlighted fields.</Alert>}
    </FormDialog>
  );
}
