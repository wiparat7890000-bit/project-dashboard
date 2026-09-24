"use client";

import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CloseIcon from "@mui/icons-material/Close";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import { formatDate, todayISO } from "@/lib/utils";
import { useDashboard } from "./DashboardContext";

const ghostSx = {
  color: "#fff",
  borderColor: "rgba(255,255,255,0.2)",
  bgcolor: "rgba(255,255,255,0.08)",
  borderRadius: "12px",
  "&:hover": { bgcolor: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.35)" },
} as const;

export default function Header() {
  const { openProjectDialog, openImportDialog, togglePresentMode, presentMode } = useDashboard();
  const weekday = new Date().toLocaleDateString("en-GB", { weekday: "long" });

  return (
    <header className="relative overflow-hidden bg-[linear-gradient(120deg,#0b1224_0%,#13294b_45%,#0f4c81_100%)] px-6 py-3.5 text-white shadow-xl">
      {/* soft light accents */}
      <div aria-hidden className="pointer-events-none absolute -top-28 right-24 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-40 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-950/40 ring-1 ring-white/20">
            <SpaceDashboardOutlinedIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-tight">Project Dashboard</h1>
            <div className="mt-0.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_6px] shadow-sky-400" />
              Information System Division (ISD)
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Tooltip title={`Today — ${weekday}`}>
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-[7px] text-sm font-semibold tabular-nums backdrop-blur-sm">
              <CalendarMonthOutlinedIcon sx={{ fontSize: 18 }} className="text-sky-300" />
              {formatDate(todayISO())}
            </div>
          </Tooltip>
          <span aria-hidden className="mx-1 hidden h-8 w-px bg-white/15 sm:block" />
          <Tooltip title="Import from JSON or CSV, download templates, or export a backup">
            <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} onClick={openImportDialog} sx={ghostSx}>
              Import
            </Button>
          </Tooltip>
          <Tooltip title={presentMode ? "Exit presentation mode" : "Hide the sidebar for presenting"}>
            <Button variant="outlined" startIcon={presentMode ? <CloseIcon /> : <SlideshowOutlinedIcon />} onClick={togglePresentMode} sx={ghostSx}>
              {presentMode ? "Exit" : "Present"}
            </Button>
          </Tooltip>
          <Tooltip title="Create a new project">
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openProjectDialog()} className="!shadow-lg !shadow-sky-950/40">
              New Project
            </Button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
