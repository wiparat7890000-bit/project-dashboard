"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { phaseStyle } from "@/lib/constants";
import { phaseNameError } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";

interface Props {
  /** Called with a newly added phase so the form can select it. */
  onAdded: (phase: string) => void;
  /** Called after a phase is renamed so the form can follow it if selected. */
  onRenamed: (from: string, to: string) => void;
  /** Called after a phase is deleted so the form can clear it if selected. */
  onDeleted: (phase: string) => void;
}

interface EditState {
  phase: string;
  value: string;
  error: string;
}

/** Add, rename, remove and reorder phases. Order controls how tasks are grouped and sorted. */
export default function PhaseManager({ onAdded, onRenamed, onDeleted }: Props) {
  const { data, setPhaseList, deletePhase, renamePhase } = useDashboard();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);
  const list = data.phaseList;

  const add = () => {
    if (!name.trim()) return;
    const err = phaseNameError(name, list);
    if (err) return setError(err);
    const phase = name.trim();
    setPhaseList([...list, phase]);
    setName("");
    setError("");
    onAdded(phase);
  };

  const saveRename = () => {
    if (!editing) return;
    const to = editing.value.trim();
    if (to === editing.phase) return setEditing(null);
    const err = phaseNameError(to, list, editing.phase);
    if (err) return setEditing({ ...editing, error: err });
    renamePhase(editing.phase, to);
    onRenamed(editing.phase, to);
    setEditing(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setPhaseList(next);
  };

  const remove = (phase: string) => {
    if (deletePhase(phase)) onDeleted(phase);
  };

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">จัดการรายชื่อ Phase</span>
        <span className="text-[10px] text-slate-400">ลำดับนี้ใช้จัดกลุ่ม task</span>
      </div>
      <div className="max-h-56 space-y-0.5 overflow-y-auto">
        {!list.length && <div className="px-2 py-1 text-xs text-slate-400">ยังไม่มี Phase — เพิ่มด้านล่าง</div>}
        {list.map((phase, i) => {
          const used = data.tasks.filter((t) => t.phase === phase).length;
          const isEditing = editing?.phase === phase;

          if (isEditing) {
            return (
              <div key={phase} className="flex items-start gap-2 rounded-lg bg-white px-2 py-1.5 shadow-sm">
                <span className="mt-3 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: phaseStyle(phase).color }} />
                <TextField
                  size="small"
                  fullWidth
                  autoFocus
                  value={editing.value}
                  error={!!editing.error}
                  helperText={
                    editing.error ||
                    (used ? `จะเปลี่ยนชื่อใน ${used} task ที่ใช้ Phase นี้ด้วย` : "Enter เพื่อบันทึก · Esc เพื่อยกเลิก")
                  }
                  onChange={(e) => setEditing({ ...editing, value: e.target.value, error: "" })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveRename();
                    } else if (e.key === "Escape") {
                      // Cancel the edit without closing the whole dialog.
                      e.stopPropagation();
                      setEditing(null);
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  slotProps={{ htmlInput: { "aria-label": `Rename phase ${phase}` } }}
                />
                <Tooltip title="Save name">
                  <IconButton size="small" aria-label="Save phase name" onClick={saveRename} className="!mt-0.5 !text-sky-600">
                    <CheckIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel">
                  <IconButton size="small" aria-label="Cancel rename" onClick={() => setEditing(null)} className="!mt-0.5">
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </div>
            );
          }

          return (
            <div key={phase} className="group flex items-center gap-2 rounded-lg px-2 py-0.5 hover:bg-white">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: phaseStyle(phase).color }} />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700" onDoubleClick={() => setEditing({ phase, value: phase, error: "" })}>
                {phase}
              </span>
              <Tooltip title={`${used} task${used === 1 ? "" : "s"} use this phase`}>
                <span className="rounded-full bg-slate-200/70 px-1.5 text-[10px] font-semibold text-slate-500">{used}</span>
              </Tooltip>
              <span className="flex opacity-40 transition group-hover:opacity-100">
                <Tooltip title="Rename (updates all tasks)">
                  <IconButton size="small" aria-label={`Rename ${phase}`} onClick={() => setEditing({ phase, value: phase, error: "" })} className="hover:!text-sky-600">
                    <EditOutlinedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Move up">
                  <span>
                    <IconButton size="small" aria-label={`Move ${phase} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down">
                  <span>
                    <IconButton size="small" aria-label={`Move ${phase} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Delete phase">
                  <IconButton size="small" aria-label={`Delete phase ${phase}`} onClick={() => remove(phase)} className="hover:!text-red-500">
                    <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <TextField
          size="small"
          fullWidth
          placeholder="ชื่อ Phase ใหม่..."
          value={name}
          error={!!error}
          helperText={error}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="bg-white"
          slotProps={{ htmlInput: { "aria-label": "New phase name" } }}
        />
        <Button variant="contained" size="small" onClick={add} className="!self-start !py-[7px]">
          Add
        </Button>
      </div>
    </div>
  );
}
