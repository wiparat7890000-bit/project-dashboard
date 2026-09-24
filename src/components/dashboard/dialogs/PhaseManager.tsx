"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { phaseStyle } from "@/lib/constants";
import { useDashboard } from "../DashboardContext";

interface Props {
  /** Called with a newly added phase so the form can select it. */
  onAdded: (phase: string) => void;
  /** Called after a phase is deleted so the form can clear it if selected. */
  onDeleted: (phase: string) => void;
}

/** Add, remove and reorder phases. Order controls how tasks are grouped and sorted. */
export default function PhaseManager({ onAdded, onDeleted }: Props) {
  const { data, setPhaseList, deletePhase } = useDashboard();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const list = data.phaseList;

  const add = () => {
    const phase = name.trim();
    if (!phase) return;
    if (list.some((p) => p.toLowerCase() === phase.toLowerCase())) {
      setError(`มี Phase "${phase}" อยู่แล้ว`);
      return;
    }
    setPhaseList([...list, phase]);
    setName("");
    setError("");
    onAdded(phase);
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
      <div className="max-h-48 space-y-0.5 overflow-y-auto">
        {!list.length && <div className="px-2 py-1 text-xs text-slate-400">ยังไม่มี Phase — เพิ่มด้านล่าง</div>}
        {list.map((phase, i) => {
          const used = data.tasks.filter((t) => t.phase === phase).length;
          return (
            <div key={phase} className="group flex items-center gap-2 rounded-lg px-2 py-0.5 hover:bg-white">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: phaseStyle(phase).color }} />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{phase}</span>
              <Tooltip title={`${used} task${used === 1 ? "" : "s"} use this phase`}>
                <span className="rounded-full bg-slate-200/70 px-1.5 text-[10px] font-semibold text-slate-500">{used}</span>
              </Tooltip>
              <span className="flex opacity-40 transition group-hover:opacity-100">
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
