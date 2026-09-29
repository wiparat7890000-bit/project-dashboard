"use client";

import { useMemo, useRef, useState } from "react";
import Tooltip from "@mui/material/Tooltip";
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
  xlsxToText,
  type CsvType,
  type ImportPreview,
  type PreviewStatus,
} from "@/lib/importExport";
import { PROJECT_STATUS_STYLE, STATUS_STYLE, type TagStyle } from "@/lib/constants";
import { exportToExcel } from "@/lib/exportExcel";
import { useDashboard } from "../DashboardContext";
import FormDialog from "./FormDialog";

type ImportTab = "json" | "excel" | "template";

const CSV_HINTS: Record<CsvType, string> = {
  tasks: "Project, Task (name), Phase, Owner, Dev, Status, Priority, Progress, Start Date, End Date, Notes",
  projects: "Project (name), Team, Owner, Priority, Project Status, Health, Progress, Start Date, End Date, Last Updated, Description",
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
  // Uploaded .xlsx: kept so switching Tasks/Projects re-reads the matching sheet.
  const [xlsx, setXlsx] = useState<{ buffer: ArrayBuffer; name: string; sheet: string } | null>(null);

  const loadXlsx = async (buffer: ArrayBuffer, name: string, type: CsvType) => {
    try {
      const { text, sheet } = await xlsxToText(buffer, type);
      setXlsx({ buffer, name, sheet });
      setCsvText(text);
      setError("");
    } catch (e) {
      setError("❌ อ่านไฟล์ Excel ไม่ได้: " + (e as Error).message);
    }
  };

  // Live preview of what the Excel/CSV import will do (same code path as Import).
  const analysis = useMemo(() => {
    if (tab !== "excel" || !csvText.trim()) return null;
    try {
      return { result: importCsv(csvText, csvType, merge, data), error: "" };
    } catch (e) {
      return { result: null, error: (e as Error).message };
    }
  }, [tab, csvText, csvType, merge, data]);

  const runImport = () => {
    setError("");
    setSuccess("");
    try {
      const result = tab === "json" ? importJson(jsonText, merge, data) : (analysis?.result ?? importCsv(csvText, csvType, merge, data));
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
          <Alert severity="info" icon={false} className="!text-xs">
            อัปโหลดไฟล์ <b>.xlsx</b> ได้โดยตรง (รวมไฟล์ที่ Export จาก Dashboard), ไฟล์ <b>.csv</b> หรือ <b>copy ตารางจาก Excel มาวาง</b> ได้เลย — ตรวจผลใน Preview ก่อนกด Import
          </Alert>
          <TextField
            select
            fullWidth
            size="small"
            value={csvType}
            onChange={(e) => {
              const type = e.target.value as CsvType;
              setCsvType(type);
              if (xlsx) void loadXlsx(xlsx.buffer, xlsx.name, type);
            }}
            slotProps={{ htmlInput: { "aria-label": "Import type" } }}
          >
            <MenuItem value="tasks">Tasks</MenuItem>
            <MenuItem value="projects">Projects</MenuItem>
          </TextField>
          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <b className="text-slate-700">{csvType === "tasks" ? "Tasks" : "Projects"} — คอลัมน์ที่รองรับ:</b>{" "}
            <span className="font-mono">{CSV_HINTS[csvType]}</span>
            <div className="mt-1 text-slate-400">
              ชื่อคอลัมน์ภาษาไทยได้ (เช่น ชื่องาน, สถานะ, ความคืบหน้า) · Status เช่น Completed / Done / เสร็จสิ้น · Progress 70 / 70% · วันที่ DD/MM/YYYY หรือ YYYY-MM-DD
            </div>
          </div>
          <FileDrop
            accept=".xlsx,.csv,.tsv,.txt"
            label={xlsx ? `📗 ${xlsx.name} — sheet "${xlsx.sheet}" (คลิกเพื่อเปลี่ยนไฟล์)` : "คลิกเพื่ออัปโหลดไฟล์ .xlsx หรือ .csv"}
            onText={(text) => {
              setXlsx(null);
              setCsvText(text);
            }}
            onBinary={(buffer, name) => loadXlsx(buffer, name, csvType)}
          />
          <TextField
            fullWidth
            multiline
            minRows={4}
            maxRows={10}
            placeholder="หรือวางข้อมูลที่ copy จาก Excel / CSV ที่นี่ (แถวแรกเป็นชื่อคอลัมน์)"
            value={csvText}
            onChange={(e) => {
              setXlsx(null);
              setCsvText(e.target.value);
            }}
            slotProps={{ htmlInput: { className: "font-mono !text-xs", "aria-label": "Data to import" } }}
          />
          {analysis?.error && <Alert severity="error">{analysis.error}</Alert>}
          {analysis?.result?.preview && <ImportPreviewPanel preview={analysis.result.preview} warnings={analysis.result.warnings ?? []} sheet={xlsx?.sheet} />}
          {mergeToggle}
        </div>
      )}

      {tab === "template" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">ดาวน์โหลด template แล้วกรอกข้อมูล จากนั้น import กลับมา</p>
          <TemplateRow title="📄 JSON Template" desc="โครงสร้าง JSON พร้อมตัวอย่าง" action="Download" onClick={downloadJsonTemplate} />
          <TemplateRow title="📊 Excel Tasks Template" desc="CSV template สำหรับ tasks (เปิดใน Excel ได้)" action="Download" onClick={() => downloadCsvTemplate("tasks")} />
          <TemplateRow title="📊 Excel Projects Template" desc="CSV template สำหรับ projects" action="Download" onClick={() => downloadCsvTemplate("projects")} />
          <TemplateRow
            title="📗 Export to Excel"
            desc="ไฟล์ .xlsx: Summary, Projects, Tasks, Project Updates"
            action="Export"
            color="success"
            onClick={() => exportToExcel(data).catch((e) => setError("❌ " + (e as Error).message))}
          />
          <TemplateRow title="💾 Export ข้อมูลปัจจุบัน" desc="Backup เป็น JSON เพื่อ import ภายหลัง" action="Export" color="success" onClick={() => exportData(data)} />
        </div>
      )}

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
    </FormDialog>
  );
}

const PREVIEW_LIMIT = 50;

/** Shows what will be imported, with the file's status next to the status that will be used. */
function ImportPreviewPanel({ preview, warnings, sheet }: { preview: ImportPreview; warnings: string[]; sheet?: string }) {
  const flagged = preview.rows.filter((r) => r.status.source !== "file").length;
  const statusHeader = preview.kind === "tasks" ? "Status" : "Project Status";
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3" aria-label="Import preview">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700">
          Preview · {preview.total} {preview.kind === "tasks" ? "tasks" : "projects"}
        </span>
        <span className="text-slate-400">
          {sheet ? `Sheet "${sheet}"` : `ตัวคั่น: ${preview.delimiter}`}
          {flagged > 0 && <span className="ml-2 font-semibold text-amber-600">⚠ ตรวจสอบ {flagged} แถว</span>}
        </span>
      </div>
      {warnings.length > 0 && (
        <Alert severity="warning" className="!py-0 !text-xs">
          <ul className="list-disc space-y-0.5 pl-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      )}
      <div className="max-h-72 overflow-auto rounded-lg border border-slate-100">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-1.5">{preview.columns[0]}</th>
              <th className="px-2 py-1.5">{statusHeader}</th>
              {preview.columns.slice(1).map((c) => (
                <th key={c} className="px-2 py-1.5">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {preview.rows.slice(0, PREVIEW_LIMIT).map((r, i) => (
              <tr key={i} className={r.status.source === "unrecognized" ? "bg-amber-50" : ""}>
                <td className="max-w-48 truncate px-2 py-1.5 font-medium text-slate-800" title={r.cells[0]}>
                  {r.cells[0]}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  <StatusCell status={r.status} kind={preview.kind} />
                </td>
                {r.cells.slice(1).map((c, j) => (
                  <td key={j} className="max-w-40 truncate whitespace-nowrap px-2 py-1.5 text-slate-600" title={c}>
                    {c || <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview.total > PREVIEW_LIMIT && <div className="text-center text-[11px] text-slate-400">แสดง {PREVIEW_LIMIT} จาก {preview.total} แถว</div>}
    </div>
  );
}

function StatusCell({ status, kind }: { status: PreviewStatus; kind: CsvType }) {
  const styles: Record<string, TagStyle> = kind === "tasks" ? STATUS_STYLE : PROJECT_STATUS_STYLE;
  const tag = styles[status.value];
  const sameAsFile = status.raw.trim().toLowerCase() === status.value.toLowerCase();
  const hint =
    status.source === "unrecognized"
      ? `ไม่รู้จัก "${status.raw}" → ${kind === "tasks" ? "กำหนดจาก Progress" : "ใช้สถานะที่ระบบแนะนำ"}`
      : status.source === "progress"
        ? "ไฟล์ไม่มี Status → กำหนดจาก Progress"
        : sameAsFile
          ? "ตรงกับไฟล์"
          : `ในไฟล์เขียนว่า "${status.raw}"`;
  if (!status.value) return <span className="text-slate-300">—</span>;
  return (
    <Tooltip title={hint}>
      <span className="inline-flex items-center gap-1">
        {status.source === "unrecognized" && <span aria-label="unrecognized">⚠</span>}
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={tag ? { background: tag.bg, color: tag.color } : { background: "#f1f5f9", color: "#64748b" }}
        >
          {status.value}
        </span>
        {!sameAsFile && status.raw && <span className="text-[10px] text-slate-400">← {status.raw}</span>}
        {status.source === "progress" && <span className="text-[10px] text-slate-400">(จาก Progress)</span>}
      </span>
    </Tooltip>
  );
}

function FileDrop({
  accept,
  label,
  onText,
  onBinary,
}: {
  accept: string;
  label: string;
  onText: (text: string) => void;
  /** Called instead of onText for .xlsx files. */
  onBinary?: (buffer: ArrayBuffer, name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (onBinary && /\.xlsx$/i.test(file.name)) onBinary(await file.arrayBuffer(), file.name);
    else onText(cleanText(await file.text()));
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
