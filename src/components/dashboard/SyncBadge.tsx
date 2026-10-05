"use client";

import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import ComputerOutlinedIcon from "@mui/icons-material/ComputerOutlined";
import { useSyncState } from "@/lib/store";

/** Where the data is being saved: the Postgres database, or only this browser. */
export default function SyncBadge() {
  const sync = useSyncState();

  let icon: React.ReactNode;
  let label: string;
  let hint: string;
  let tone = "text-sky-200";

  if (sync.status === "connecting") {
    icon = <CircularProgress size={14} color="inherit" />;
    label = "Connecting…";
    hint = "Connecting to the database";
  } else if (sync.mode === "remote" && sync.status === "saving") {
    icon = <CircularProgress size={14} color="inherit" />;
    label = "Saving…";
    hint = "Saving changes to the database";
  } else if (sync.status === "error") {
    icon = <CloudOffOutlinedIcon sx={{ fontSize: 18 }} />;
    label = sync.mode === "remote" ? "Save failed — retrying" : "Database offline";
    hint = `${sync.message ?? "Database unavailable"}. Changes are kept in this browser${sync.mode === "remote" ? " and will be sent again automatically" : ""}.`;
    tone = "text-amber-300";
  } else if (sync.mode === "remote") {
    icon = <CloudDoneOutlinedIcon sx={{ fontSize: 18 }} />;
    label = "Database · Saved";
    hint = sync.savedAt ? `All changes saved to the database (${new Date(sync.savedAt).toLocaleTimeString("en-GB")})` : "Connected to the database";
    tone = "text-emerald-300";
  } else {
    icon = <ComputerOutlinedIcon sx={{ fontSize: 18 }} />;
    label = "Browser only";
    hint = "No database configured (DATABASE_URL). Data is saved in this browser only.";
  }

  return (
    <Tooltip title={hint}>
      <div
        role="status"
        aria-label={`Data: ${label}`}
        className={`flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-[7px] text-xs font-semibold ${tone}`}
      >
        {icon}
        <span className="hidden whitespace-nowrap md:inline">{label}</span>
      </div>
    </Tooltip>
  );
}
