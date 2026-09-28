"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { exportToExcel } from "@/lib/exportExcel";
import { exportData } from "@/lib/importExport";
import { useDashboard } from "./DashboardContext";

/** Header "Export" button: Excel for all projects or the open project, or a JSON backup. */
export default function ExportMenu({ sx }: { sx: object }) {
  const { data, activeProject, notify } = useDashboard();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);

  const runExcel = async (onlyActive: boolean) => {
    setAnchor(null);
    setBusy(true);
    try {
      const file = await exportToExcel(data, { project: onlyActive ? activeProject : undefined });
      notify(`Exported ${file}`);
    } catch (e) {
      alert("Export to Excel failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Tooltip title="Export to Excel (.xlsx) or a JSON backup">
        <Button
          variant="outlined"
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <FileDownloadOutlinedIcon />}
          endIcon={<KeyboardArrowDownIcon />}
          onClick={(e) => setAnchor(e.currentTarget)}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={!!anchor}
          sx={{ ...sx, "&.Mui-disabled": { color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.2)" } }}
        >
          Export
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, minWidth: 280 } } }}
      >
        <MenuItem onClick={() => runExcel(false)}>
          <ListItemIcon>
            <GridOnOutlinedIcon fontSize="small" className="text-green-700" />
          </ListItemIcon>
          <ListItemText primary="Excel (.xlsx) — All projects" secondary="Summary, Projects, Tasks, Project Updates" />
        </MenuItem>
        {activeProject && (
          <MenuItem onClick={() => runExcel(true)}>
            <ListItemIcon>
              <GridOnOutlinedIcon fontSize="small" className="text-green-700" />
            </ListItemIcon>
            <ListItemText
              primary="Excel (.xlsx) — This project"
              secondary={activeProject.name}
              slotProps={{ secondary: { noWrap: true, sx: { maxWidth: 230 } } }}
            />
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            exportData(data);
            notify("Exported JSON backup");
          }}
        >
          <ListItemIcon>
            <DataObjectOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="JSON backup" secondary="For re-importing later" />
        </MenuItem>
      </Menu>
    </>
  );
}
