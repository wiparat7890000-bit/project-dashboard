"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import { PRIORITY_STYLE, SWATCH_COLORS } from "@/lib/constants";
import { PRIORITIES, type Priority } from "@/lib/types";
import { colorFor } from "@/lib/utils";
import { useDashboard, type ProjectInput } from "../DashboardContext";
import DateField from "../ui/DateField";
import FormDialog, { FieldLabel, LinkAction } from "./FormDialog";

interface Props {
  open: boolean;
  projectId: string | null;
  onClose: () => void;
}

export default function ProjectDialog({ open, projectId, onClose }: Props) {
  const { data, saveProject, setDeptList } = useDashboard();
  const existing = projectId ? data.projects.find((p) => p.id === projectId) : undefined;

  const [form, setForm] = useState<ProjectInput>(() => ({
    name: existing?.name ?? "",
    startDate: existing?.startDate ?? "",
    endDate: existing?.endDate ?? "",
    description: existing?.description ?? "",
    owner: existing?.owner ?? "",
    department: existing?.department ?? "",
    priority: existing?.priority ?? "Medium",
    color: existing?.color ?? colorFor(data.projects.length),
  }));
  const [error, setError] = useState("");
  const [showDeptManager, setShowDeptManager] = useState(false);
  const [newDept, setNewDept] = useState("");

  const set = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) return setError("Project name is required.");
    if (!form.startDate || !form.endDate) return setError("Start and End dates are required.");
    if (form.endDate < form.startDate) return setError("End date must be after Start date.");
    saveProject({ ...form, name, description: form.description.trim(), owner: form.owner.trim() }, projectId);
    onClose();
  };

  const addDept = () => {
    const name = newDept.trim();
    setNewDept("");
    if (!name || data.deptList.includes(name)) return;
    setDeptList([...data.deptList, name]);
    set("department", name);
  };

  const removeDept = (name: string) => {
    if (!confirm(`ลบ "${name}" ออกจากรายชื่อ Department?`)) return;
    setDeptList(data.deptList.filter((d) => d !== name));
    if (form.department === name) set("department", "");
  };

  const randomColor = () => {
    const pool = [...SWATCH_COLORS, `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`];
    set("color", pool[Math.floor(Math.random() * pool.length)]);
  };

  // Keep a department that is set on the project but was removed from the master list selectable.
  const deptOptions = form.department && !data.deptList.includes(form.department) ? [...data.deptList, form.department] : data.deptList;

  return (
    <FormDialog open={open} title={existing ? "Edit Project" : "New Project"} onClose={onClose} onSubmit={handleSave} submitLabel="Save Project" maxWidth="xs">
      <div>
        <FieldLabel>Project Name *</FieldLabel>
        <TextField fullWidth size="small" autoFocus placeholder="e.g. ERP System Upgrade" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Start Date *</FieldLabel>
          <DateField label="Start date" value={form.startDate} onChange={(v) => set("startDate", v)} />
        </div>
        <div>
          <FieldLabel>End Date *</FieldLabel>
          <DateField label="End date" value={form.endDate} min={form.startDate || undefined} onChange={(v) => set("endDate", v)} />
        </div>
      </div>

      <div>
        <FieldLabel>Description</FieldLabel>
        <TextField fullWidth size="small" multiline minRows={2} placeholder="Brief project description..." value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Project Owner</FieldLabel>
          <TextField fullWidth size="small" placeholder="e.g. Somchai K." value={form.owner} onChange={(e) => set("owner", e.target.value)} />
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

      <div>
        <FieldLabel action={<LinkAction onClick={() => setShowDeptManager((v) => !v)}>⚙ จัดการ Department</LinkAction>}>Department</FieldLabel>
        <TextField select fullWidth size="small" value={form.department} onChange={(e) => set("department", e.target.value)} slotProps={{ select: { displayEmpty: true } }}>
          <MenuItem value="">— ไม่ระบุ —</MenuItem>
          {deptOptions.map((d) => (
            <MenuItem key={d} value={d}>
              {d}
            </MenuItem>
          ))}
        </TextField>
        <Collapse in={showDeptManager}>
          <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">จัดการรายชื่อ Department</div>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {data.deptList.length ? (
                data.deptList.map((d) => (
                  <div key={d} className="group flex items-center justify-between rounded-lg px-2 py-0.5 hover:bg-slate-100">
                    <span className="text-sm text-slate-700">{d}</span>
                    <IconButton size="small" aria-label={`Remove ${d}`} onClick={() => removeDept(d)} className="opacity-0 group-hover:opacity-100 hover:!text-red-400">
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </div>
                ))
              ) : (
                <div className="px-2 text-xs text-slate-400">ยังไม่มี Department</div>
              )}
            </div>
            <div className="flex gap-2">
              <TextField
                size="small"
                fullWidth
                placeholder="ชื่อ Department ใหม่..."
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDept();
                  }
                }}
                className="bg-white"
              />
              <Button variant="contained" size="small" onClick={addDept}>
                Add
              </Button>
            </div>
          </div>
        </Collapse>
      </div>

      <div>
        <FieldLabel
          action={
            <LinkAction onClick={randomColor}>
              <ShuffleIcon sx={{ fontSize: 12, mr: 0.5 }} />
              สุ่มสี
            </LinkAction>
          }
        >
          Project Color
        </FieldLabel>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {SWATCH_COLORS.map((c) => {
            const selected = c === form.color;
            return (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={`Color ${c}`}
                aria-pressed={selected}
                onClick={() => set("color", c)}
                className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${selected ? "scale-115 border-slate-900" : "border-transparent"}`}
                style={{ background: c }}
              />
            );
          })}
          <label title="เลือกสีเอง" className="group relative cursor-pointer">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400 transition group-hover:border-sky-400 group-hover:text-sky-400">
              <AddIcon sx={{ fontSize: 14 }} />
            </span>
            <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
          </label>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-5 w-5 shrink-0 rounded-full shadow-sm" style={{ background: form.color }} />
          <span className="font-mono text-xs text-slate-500">{form.color}</span>
        </div>
      </div>

      {error && <Alert severity="error">{error}</Alert>}
    </FormDialog>
  );
}
