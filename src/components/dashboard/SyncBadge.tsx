"use client";

import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import { useSyncState } from "@/lib/store";

/** Whether the latest changes have been saved to the database. */
export default function SyncBadge() {
  const sync = useSyncState();

  let icon: React.ReactNode;
  let label: string;
  let hint: string;
  let tone = "text-emerald-300";

  if (sync.status === "saving" || sync.status === "loading") {
    icon = <CircularProgress size={14} color="inherit" />;
    label = "Saving…";
    hint = "Saving changes to the database";
  } else if (sync.status === "error") {
    icon = <CloudOffOutlinedIcon sx={{ fontSize: 18 }} />;
    label = "Save failed — retrying";
    hint = `${sync.message ?? "Database unavailable"}. Your changes are kept on this page and will be sent again automatically — don't close it yet.`;
    tone = "text-amber-300";
  } else {
    icon = <CloudDoneOutlinedIcon sx={{ fontSize: 18 }} />;
    label = "Database · Saved";
    hint = sync.savedAt ? `All changes saved to the database (${new Date(sync.savedAt).toLocaleTimeString("en-GB")})` : "Connected to the database";
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
