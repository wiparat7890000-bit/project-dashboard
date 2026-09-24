"use client";

import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useDashboard } from "./DashboardContext";

const ghostSx = {
  color: "#fff",
  borderColor: "rgba(255,255,255,0.2)",
  bgcolor: "rgba(255,255,255,0.1)",
  "&:hover": { bgcolor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.3)" },
} as const;

export default function Header() {
  const { openProjectDialog, openImportDialog, togglePresentMode, presentMode } = useDashboard();
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 bg-[linear-gradient(135deg,#0f172a_0%,#1e3a5f_50%,#0f4c81_100%)] px-6 py-4 text-white shadow-xl">
      <div>
        <div className="text-xs font-medium uppercase tracking-widest text-sky-300">Information System Division (ISD)</div>
        <h1 className="text-lg font-bold leading-tight">Project Status Dashboard</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tooltip title="Create a new project">
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openProjectDialog()}>
            New Project
          </Button>
        </Tooltip>
        <Tooltip title="Import from JSON or CSV, download templates, or export a backup">
          <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} onClick={openImportDialog} sx={ghostSx}>
            Import
          </Button>
        </Tooltip>
        <Tooltip title={presentMode ? "Exit presentation mode" : "Hide the sidebar for presenting"}>
          <Button
            variant="outlined"
            startIcon={presentMode ? <CloseIcon /> : <SlideshowOutlinedIcon />}
            onClick={togglePresentMode}
            sx={ghostSx}
          >
            {presentMode ? "Exit" : "Present"}
          </Button>
        </Tooltip>
        <span className="text-sm text-sky-200">{today}</span>
      </div>
    </header>
  );
}
