"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Collapse from "@mui/material/Collapse";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import { PRIORITY_STYLE, STATUS_EMOJI, phaseStyle } from "@/lib/constants";
import { PRIORITIES, STATUSES, type Priority, type Status } from "@/lib/types";
import { useDashboard, type TaskInput } from "../DashboardContext";
import DevSelect from "./DevSelect";
import DateField from "../ui/DateField";
import FormDialog, { FieldLabel, LinkAction } from "./FormDialog";
import PhaseManager from "./PhaseManager";

interface Props {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
}

export default function TaskDialog({ open, taskId, onClose }: Props) {
  const { data, saveTask } = useDashboard();
  const existing = taskId ? data.tasks.find((t) => t.id === taskId) : undefined;

  const [form, setForm] = useState<TaskInput>(() => ({
    name: existing?.name ?? "",
    owner: existing?.owner ?? "",
    dev: existing?.dev ?? [],
    phase: existing?.phase ?? "",
    status: existing?.status ?? "Not Start",
    priority: existing?.priority ?? "Medium",
    startDate: existing?.startDate ?? "",
    endDate: existing?.endDate ?? "",
    progress: existing?.progress ?? 0,
    notes: existing?.notes ?? "",
  }));
  const [error, setError] = useState("");
  const [showPhaseManager, setShowPhaseManager] = useState(false);
  // Keep a phase that is on the task but no longer in the list selectable.
  const phaseOptions = form.phase && !data.phaseList.includes(form.phase) ? [...data.phaseList, form.phase] : data.phaseList;

  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) return setError("Task name is required.");
    if (form.startDate && form.endDate && form.endDate < form.startDate) return setError("End date must be after Start date.");
    saveTask(
      {
        ...form,
        name,
        owner: form.owner.trim(),
        notes: form.notes.trim(),
        progress: form.status === "Done" ? 100 : form.progress,
      },
      taskId,
    );
    onClose();
  };

  return (
    <FormDialog open={open} title={existing ? "Edit Task" : "New Task"} onClose={onClose} onSubmit={handleSave} submitLabel="Save Task">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <FieldLabel action={<LinkAction onClick={() => setShowPhaseManager((v) => !v)}>⚙ จัดการ Phase</LinkAction>}>Phase</FieldLabel>
          <TextField
            select
            fullWidth
            size="small"
            value={form.phase}
            onChange={(e) => set("phase", e.target.value)}
            slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Phase" } }}
          >
            <MenuItem value="">— Phase —</MenuItem>
            {phaseOptions.map((p) => (
              <MenuItem key={p} value={p}>
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: phaseStyle(p).color }} />
                {p}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Task Name *</FieldLabel>
          <TextField fullWidth size="small" autoFocus placeholder="Task description..." value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
      </div>
      <Collapse in={showPhaseManager} unmountOnExit>
        <PhaseManager
          onAdded={(p) => set("phase", p)}
          onRenamed={(from, to) => form.phase === from && set("phase", to)}
          onDeleted={(p) => form.phase === p && set("phase", "")}
        />
      </Collapse>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Owner</FieldLabel>
          <TextField fullWidth size="small" placeholder="Task owner..." value={form.owner} onChange={(e) => set("owner", e.target.value)} />
        </div>
        <div>
          <FieldLabel>Dev.</FieldLabel>
          <DevSelect value={form.dev} onChange={(dev) => set("dev", dev)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Status</FieldLabel>
          <TextField select fullWidth size="small" value={form.status} onChange={(e) => set("status", e.target.value as Status)}>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_EMOJI[s]} {s}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <div>
          <FieldLabel>Priority</FieldLabel>
          <TextField select fullWidth size="small" value={form.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>
                {PRIORITY_STYLE[p].emoji} {p}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Start Date</FieldLabel>
          <DateField label="Start date" value={form.startDate} onChange={(v) => set("startDate", v)} />
        </div>
        <div>
          <FieldLabel>End Date</FieldLabel>
          <DateField label="End date" value={form.endDate} min={form.startDate || undefined} onChange={(v) => set("endDate", v)} />
        </div>
      </div>

      <div>
        <FieldLabel>Progress: {form.status === "Done" ? 100 : form.progress}%</FieldLabel>
        <Slider
          value={form.status === "Done" ? 100 : form.progress}
          disabled={form.status === "Done"}
          onChange={(_, v) => set("progress", v as number)}
          step={5}
          marks={[{ value: 0, label: "0%" }, { value: 50, label: "50%" }, { value: 100, label: "100%" }]}
          valueLabelDisplay="auto"
          size="small"
          aria-label="Progress"
        />
      </div>

      <div>
        <FieldLabel>Notes</FieldLabel>
        <TextField fullWidth size="small" multiline minRows={2} placeholder="Additional notes..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      {error && <Alert severity="error">{error}</Alert>}
    </FormDialog>
  );
}
