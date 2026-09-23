"use client";

import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import {
  cleanText,
  downloadCsvTemplate,
  downloadJsonTemplate,
  exportData,
  importCsv,
  importJson,
  type CsvType,
} from "@/lib/importExport";
import { useDashboard } from "../DashboardContext";
import FormDialog from "./FormDialog";

type ImportTab = "json" | "excel" | "template";

const CSV_HINTS: Record<CsvType, string> = {
  tasks: "name, owner, dev, phase, startDate, endDate, status, priority, progress, notes, projectName",
  projects: "name, startDate, endDate, description, owner, department",
};

export default function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, replaceData } = useDashboard();
  const [tab, setTab] = useState<ImportTab>("json");
  const [jsonText, setJsonText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvType, setCsvType] = useState<CsvType>("tasks");
  const [merge, setMerge] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const runImport = () => {
    setError("");
    setSuccess("");
    try {
      const result = tab === "json" ? importJson(jsonText, merge, data) : importCsv(csvText, csvType, merge, data);
      replaceData(result.data, !merge);
      setSuccess(`✅ Import สำเร็จ! เพิ่ม ${result.addedProjects} projects, ${result.addedTasks} tasks`);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError("❌ " + (e as Error).message);
    }
  };

  const mergeToggle = (
    <FormControlLabel
      control={<Checkbox size="small" checked={merge} onChange={(e) => setMerge(e.target.checked)} />}
      label={<span className="text-xs text-slate-600">Merge (ไม่ลบข้อมูลเดิม)</span>}
    />
  );

  return (
    <FormDialog open={open} title="Import Projects & Tasks" onClose={onClose} onSubmit={tab === "template" ? undefined : runImport} submitLabel="Import">
      <Tabs value={tab} onChange={(_, v: ImportTab) => setTab(v)} variant="scrollable" className="border-b border-slate-200">
        <Tab value="json" label="📄 JSON" />
        <Tab value="excel" label="📊 Excel / CSV" />
        <Tab value="template" label="📋 Template" />
      </Tabs>

      {tab === "json" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">วาง JSON หรืออัปโหลด backup ที่ export จาก Dashboard</p>
          <FileDrop accept=".json" label="คลิกเพื่ออัปโหลดไฟล์ .json" onText={setJsonText} />
          <TextField fullWidth multiline minRows={6} placeholder='{"projects":[...],"tasks":[...]}' value={jsonText} onChange={(e) => setJsonText(e.target.value)} slotProps={{ htmlInput: { className: "font-mono !text-xs" } }} />
          {mergeToggle}
        </div>
      )}

      {tab === "excel" && (
        <div className="space-y-3">
          <Alert severity="warning" icon={false} className="!text-xs">
            <b>วิธีใช้ Excel:</b> บันทึกไฟล์ Excel เป็น <b>CSV (UTF-8)</b> แล้วอัปโหลดที่นี่ หรือวางข้อมูล CSV โดยตรง
          </Alert>
          <TextField select fullWidth size="small" value={csvType} onChange={(e) => setCsvType(e.target.value as CsvType)}>
            <MenuItem value="tasks">Tasks</MenuItem>
            <MenuItem value="projects">Projects</MenuItem>
          </TextField>
          <div className="rounded-xl bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-600">
            <b className="text-slate-700">{csvType === "tasks" ? "Tasks" : "Projects"} — คอลัมน์ที่รองรับ:</b>
            <br />
            {CSV_HINTS[csvType]}
            <br />
            <span className="font-sans text-slate-400">📅 Date รองรับ: YYYY-MM-DD · DD/MM/YYYY · DD-MM-YYYY · Excel serial</span>
          </div>
          <FileDrop accept=".csv,.txt" label="คลิกเพื่ออัปโหลดไฟล์ .csv หรือ .xlsx (save as CSV)" onText={setCsvText} />
          <TextField fullWidth multiline minRows={6} placeholder="วาง CSV ที่นี่ หรืออัปโหลดไฟล์..." value={csvText} onChange={(e) => setCsvText(e.target.value)} slotProps={{ htmlInput: { className: "font-mono !text-xs" } }} />
          {mergeToggle}
        </div>
      )}

      {tab === "template" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">ดาวน์โหลด template แล้วกรอกข้อมูล จากนั้น import กลับมา</p>
          <TemplateRow title="📄 JSON Template" desc="โครงสร้าง JSON พร้อมตัวอย่าง" action="Download" onClick={downloadJsonTemplate} />
          <TemplateRow title="📊 Excel Tasks Template" desc="CSV template สำหรับ tasks (เปิดใน Excel ได้)" action="Download" onClick={() => downloadCsvTemplate("tasks")} />
          <TemplateRow title="📊 Excel Projects Template" desc="CSV template สำหรับ projects" action="Download" onClick={() => downloadCsvTemplate("projects")} />
          <TemplateRow title="💾 Export ข้อมูลปัจจุบัน" desc="Backup เป็น JSON เพื่อ import ภายหลัง" action="Export" color="success" onClick={() => exportData(data)} />
        </div>
      )}

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
    </FormDialog>
  );
}

function FileDrop({ accept, label, onText }: { accept: string; label: string; onText: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    onText(cleanText(await file.text()));
    if (inputRef.current) inputRef.current.value = ""; // allow re-selecting the same file
  };
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full rounded-xl border-2 border-dashed border-slate-200 p-4 text-center transition hover:border-sky-300"
    >
      <CloudUploadOutlinedIcon className="mb-1 text-slate-300" fontSize="large" />
      <div className="text-xs text-slate-400">{label}</div>
      <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => handleFile(e.target.files?.[0])} />
    </button>
  );
}

function TemplateRow({
  title,
  desc,
  action,
  onClick,
  color = "primary",
}: {
  title: string;
  desc: string;
  action: string;
  onClick: () => void;
  color?: "primary" | "success";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
      <div>
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
      <Button size="small" variant="outlined" color={color} onClick={onClick}>
        {action}
      </Button>
    </div>
  );
}
