import {
  HEALTH_STATUSES,
  ISSUE_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  type DashboardData,
  type HealthStatus,
  type Phase,
  type Priority,
  type Project,
  type ProjectStatus,
  type ProjectUpdate,
  type Status,
  type Task,
} from "./types";
import { colorFor, downloadFile, mergePhases, todayISO, toISODate, uid } from "./utils";

type Row = Record<string, string>;

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const squash = (s: string) => s.toLowerCase().replace(/[\s\-_&]/g, "");

// ── Normalizers (turn untrusted input into well-typed records) ────────────────

/** Words (English + Thai, compared after squash) that mean each task status. */
const STATUS_WORDS: [Status, string[]][] = [
  ["Not Start", ["notstart", "notstarted", "notyetstarted", "todo", "new", "open", "pending", "waiting", "backlog", "ยังไม่เริ่ม", "ยังไม่ได้เริ่ม", "รอดำเนินการ", "รอ"]],
  ["Plan", ["plan", "planned", "planning", "วางแผน", "แผน"]],
  [
    "In Progress",
    ["inprogress", "inprog", "wip", "doing", "ongoing", "started", "active", "working", "processing", "กำลังดำเนินการ", "อยู่ระหว่างดำเนินการ", "ดำเนินการ", "กำลังทำ"],
  ],
  ["Completed", ["completed", "complete", "done", "finished", "finish", "closed", "close", "resolved", "เสร็จ", "เสร็จสิ้น", "เสร็จแล้ว", "สำเร็จ", "ปิดงาน"]],
  ["Cancelled", ["cancelled", "canceled", "cancel", "dropped", "drop", "rejected", "ยกเลิก"]],
];
const STATUS_ALIASES: Record<string, Status> = Object.fromEntries(STATUS_WORDS.flatMap(([s, words]) => words.map((w) => [w, s])));

/** The task status a word means, or null if it isn't recognized. */
export function matchStatus(s: unknown): Status | null {
  return STATUS_ALIASES[squash(str(s))] ?? null;
}

export function normStatus(s: unknown): Status {
  return matchStatus(s) ?? "Not Start";
}

/** Status implied by progress, used when the file's status is blank or unrecognized. */
export function statusFromProgress(progress: number): Status {
  return progress >= 100 ? "Completed" : progress > 0 ? "In Progress" : "Not Start";
}

/**
 * Parse a progress cell: "70%", "70", " 70 % " → 70; Excel fractions "0.7" → 70.
 * Returns null when blank or not a number.
 */
export function parseProgress(raw: unknown): number | null {
  const s = str(raw).trim();
  if (!s) return null;
  const pct = s.includes("%");
  const n = Number(s.replace(/[%\s,]/g, ""));
  if (!Number.isFinite(n)) return null;
  const value = !pct && s.includes(".") && n > 0 && n <= 1 ? n * 100 : n;
  return Math.min(100, Math.max(0, Math.round(value)));
}

const PROJECT_STATUS_WORDS: [ProjectStatus, string[]][] = [
  ["Not Started", ["notstarted", "notstart", "new", "ยังไม่เริ่ม"]],
  ["In Progress", ["inprogress", "wip", "ongoing", "active", "กำลังดำเนินการ", "ดำเนินการ"]],
  ["At Risk", ["atrisk", "risk", "มีความเสี่ยง", "เสี่ยง"]],
  ["Delayed", ["delayed", "delay", "late", "ล่าช้า", "ช้า"]],
  ["Completed", ["completed", "complete", "done", "finished", "closed", "เสร็จ", "เสร็จสิ้น"]],
  ["On Hold", ["onhold", "hold", "paused", "pause", "suspended", "พัก", "ระงับ", "หยุดชั่วคราว"]],
];
const HEALTH_WORDS: [HealthStatus, string[]][] = [
  ["On Track", ["ontrack", "good", "green", "ok", "ปกติ", "ตามแผน"]],
  ["At Risk", ["atrisk", "risk", "yellow", "amber", "เสี่ยง", "มีความเสี่ยง"]],
  ["Delayed", ["delayed", "delay", "red", "late", "offtrack", "ล่าช้า"]],
];
const matchWord = <T>(table: [T, string[]][], v: unknown): T | null => {
  const key = squash(str(v));
  return key ? (table.find(([, words]) => words.includes(key))?.[0] ?? null) : null;
};

export function normPriority(s: unknown): Priority {
  const key = squash(str(s));
  return PRIORITIES.find((p) => squash(p) === key) ?? "Medium";
}

/** Match a phase name to the list (ignoring case/spaces/punctuation); unknown names are kept as typed. */
export function normPhase(s: unknown, phaseList: string[] = []): Phase {
  const raw = str(s).trim();
  const key = squash(raw);
  if (!key) return "";
  return phaseList.find((p) => squash(p) === key) ?? raw;
}

/** Normalize any common date format → `YYYY-MM-DD` ("" if unparseable). */
export function normDate(raw: unknown): string {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? "" : toISODate(raw);
  // Drop a trailing time ("2026-09-13 00:00:00", "13/09/2026 9:30", ISO "T…Z").
  const s = str(raw)
    .trim()
    .replace(/[ T]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?\s*(Z|[AP]M|[+-]\d{2}:?\d{2})?$/i, "");
  if (!s || s === "-" || s === "0") return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Excel serial number
  if (/^\d{1,5}$/.test(s)) {
    const serial = parseInt(s, 10);
    if (serial > 1000 && serial < 100000) {
      const d = new Date((serial - 25569) * 86_400_000);
      if (!Number.isNaN(d.getTime())) return toISODate(d);
    }
    return "";
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (Thai/EU default)
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // YYYY/MM/DD
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Last resort ("Sep 13 2026", "13 September 2026"): parsed as local time, so read local parts
  // (toISOString would shift the day back in time zones ahead of UTC, e.g. Thailand).
  const d = new Date(s);
  if (!Number.isNaN(d.getTime()) && d.getFullYear() > 1900) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return "";
}

function clampProgress(v: unknown) {
  return Math.min(100, Math.max(0, parseInt(str(v), 10) || 0));
}

function parseDevList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).map((d) => d.trim()).filter(Boolean);
  return str(v)
    .replace(/["']/g, "")
    .split(/[,;]/)
    .map((d) => d.trim())
    .filter(Boolean);
}

export function normalizeProject(input: unknown, index: number): Project {
  const p = (input ?? {}) as Record<string, unknown>;
  return {
    id: str(p.id) || uid("p"),
    name: str(p.name) || "Untitled Project",
    description: str(p.description ?? p.desc),
    owner: str(p.owner),
    department: str(p.department ?? p.team ?? p.teams),
    priority: normPriority(p.priority),
    startDate: normDate(p.startDate ?? p.start),
    endDate: normDate(p.endDate ?? p.end),
    color: str(p.color) || colorFor(index),
  };
}

export function normalizeTask(input: unknown, phaseList: string[] = []): Task {
  const t = (input ?? {}) as Record<string, unknown>;
  const status = normStatus(t.status);
  return {
    id: str(t.id) || uid("t"),
    projectId: str(t.projectId),
    name: str(t.name) || "Untitled Task",
    owner: str(t.owner ?? t.assignee),
    dev: parseDevList(t.dev),
    phase: normPhase(t.phase, phaseList),
    startDate: normDate(t.startDate),
    endDate: normDate(t.endDate),
    status,
    priority: normPriority(t.priority),
    progress: status === "Completed" ? 100 : clampProgress(t.progress),
    notes: str(t.notes),
  };
}

function pick<T extends string>(options: readonly T[], v: unknown, fallback: T): T {
  const key = squash(str(v));
  return options.find((o) => squash(o) === key) ?? fallback;
}

export function normalizeUpdate(input: unknown): ProjectUpdate {
  const u = (input ?? {}) as Record<string, unknown>;
  return {
    id: str(u.id) || uid("u"),
    projectId: str(u.projectId),
    updateDate: normDate(u.updateDate) || todayISO(),
    progress: clampProgress(u.progress),
    projectStatus: pick(PROJECT_STATUSES, u.projectStatus, "In Progress"),
    healthStatus: pick(HEALTH_STATUSES, u.healthStatus, "On Track"),
    achievement: str(u.achievement),
    issueRisk: str(u.issueRisk),
    issueStatus: pick(ISSUE_STATUSES, u.issueStatus, "Open"),
    nextAction: str(u.nextAction),
    nextMilestone: str(u.nextMilestone),
    nextMilestoneDate: normDate(u.nextMilestoneDate),
    remark: str(u.remark),
    updatedBy: str(u.updatedBy),
    createdAt: str(u.createdAt) || new Date().toISOString(),
  };
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

export function cleanText(raw: string) {
  return raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

export type Delimiter = "," | ";" | "\t";
export const DELIMITER_LABEL: Record<Delimiter, string> = { ",": "comma (,)", ";": "semicolon (;)", "\t": "tab (pasted from Excel)" };

/** Pick the delimiter used most in the header line (outside quotes). */
function detectDelimiter(text: string): Delimiter {
  const counts: Record<Delimiter, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQ = false;
  for (const c of text) {
    if (c === "\n" && !inQ) break;
    if (c === '"') inQ = !inQ;
    else if (!inQ && c in counts) counts[c as Delimiter]++;
  }
  return (Object.entries(counts) as [Delimiter, number][]).reduce((best, cur) => (cur[1] > best[1] ? cur : best), [",", 0])[0];
}

/** RFC 4180 style parser: quoted fields may contain the delimiter, "" escapes and line breaks. */
function splitRecords(text: string, delim: Delimiter): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else if (c === '"' && cur.trim() === "") {
      inQ = true;
      cur = "";
    } else if (c === delim) {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      records.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    records.push(row);
  }
  return records;
}

/** Header spellings (normalized: lowercase, letters/digits only) accepted for each field. */
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "taskname", "task", "title", "งาน", "ชื่องาน", "ชื่อ"],
  project: ["project", "projectname", "projectid", "โครงการ", "ชื่อโครงการ", "โปรเจกต์", "โปรเจค"],
  owner: ["owner", "assignee", "pic", "responsible", "ผู้รับผิดชอบ", "เจ้าของ"],
  dev: ["dev", "devs", "developer", "developers", "ผู้พัฒนา"],
  phase: ["phase", "phasename", "stage", "เฟส"],
  status: ["status", "taskstatus", "สถานะ", "สถานะงาน"],
  priority: ["priority", "ความสำคัญ", "ลำดับความสำคัญ"],
  progress: ["progress", "percent", "percentcomplete", "complete", "ความคืบหน้า"],
  startdate: ["startdate", "start", "วันเริ่ม", "วันที่เริ่ม"],
  enddate: ["enddate", "end", "duedate", "due", "targetenddate", "targetdate", "วันสิ้นสุด", "วันที่สิ้นสุด", "กำหนดเสร็จ"],
  notes: ["notes", "note", "remark", "remarks", "comment", "comments", "หมายเหตุ"],
  team: ["team", "teams", "department", "dept", "ทีม"],
  description: ["description", "desc", "รายละเอียด"],
  projectstatus: ["projectstatus", "สถานะโครงการ"],
  health: ["health", "healthstatus", "สุขภาพโครงการ"],
  lastupdated: ["lastupdated", "updatedate", "อัปเดตล่าสุด"],
};
const HEADER_LOOKUP: Record<string, string> = Object.fromEntries(
  Object.entries(HEADER_ALIASES).flatMap(([field, names]) => names.map((n) => [n, field])),
);
// Keep combining marks (\p{M}) so Thai vowels/tone marks survive: "ชื่องาน" ≠ "ชองาน".
const normHeader = (h: string) => h.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, "");

interface ParsedTable {
  rows: Row[];
  delimiter: Delimiter;
  /** Headers in the file that don't map to any field (ignored). */
  ignored: string[];
}

function parseTable(raw: string): ParsedTable {
  const text = cleanText(raw).trim();
  const delimiter = detectDelimiter(text);
  const records = splitRecords(text, delimiter).filter((r) => r.some((v) => v.trim() !== ""));
  if (records.length < 2) throw new Error("ต้องมีอย่างน้อย 1 แถวข้อมูล (ไม่นับ header)");
  const fields = records[0].map((h) => HEADER_LOOKUP[normHeader(h)] ?? "");
  const ignored = records[0].filter((h, i) => h.trim() && !fields[i]).map((h) => h.trim());
  const rows = records.slice(1).map((vals) => {
    const row: Row = {};
    fields.forEach((f, i) => {
      if (f && !row[f]) row[f] = (vals[i] ?? "").trim();
    });
    return row;
  });
  return { rows, delimiter, ignored };
}

// ── Import ────────────────────────────────────────────────────────────────────

export interface ImportResult {
  data: DashboardData;
  addedProjects: number;
  addedTasks: number;
  /** Things the user should know before importing (unrecognized values, ignored columns…). */
  warnings?: string[];
  /** What will be imported, for the preview table (Excel/CSV only). */
  preview?: ImportPreview;
}

export interface PreviewStatus {
  /** Value as written in the file. */
  raw: string;
  /** Value that will be imported. */
  value: string;
  /** How the value was decided. */
  source: "file" | "progress" | "unrecognized";
}

export interface ImportPreview {
  kind: CsvType;
  delimiter: string;
  columns: string[];
  rows: { cells: string[]; status: PreviewStatus }[];
  total: number;
}

/** Keep phases used by imported tasks in the phase list. */
function withPhases(result: ImportResult): ImportResult {
  return { ...result, data: { ...result.data, phaseList: mergePhases(result.data.phaseList, result.data.tasks) } };
}

export function importJson(raw: string, merge: boolean, current: DashboardData): ImportResult {
  return withPhases(importJsonData(raw, merge, current));
}

export function importCsv(raw: string, type: CsvType, merge: boolean, current: DashboardData): ImportResult {
  return withPhases(importCsvData(raw, type, merge, current));
}

function importJsonData(raw: string, merge: boolean, current: DashboardData): ImportResult {
  const text = cleanText(raw).trim();
  if (!text) throw new Error("กรุณาวาง JSON หรืออัปโหลดไฟล์ก่อน");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error("JSON format ไม่ถูกต้อง: " + (e as Error).message);
  }
  if (typeof parsed !== "object" || parsed === null)
    throw new Error("JSON ต้องเป็น object ที่มี projects และ tasks");

  const obj = parsed as { projects?: unknown; tasks?: unknown; updates?: unknown };
  const inP = Array.isArray(obj.projects) ? obj.projects : [];
  const inT = Array.isArray(obj.tasks) ? obj.tasks : [];
  const inU = Array.isArray(obj.updates) ? obj.updates : [];
  if (!inP.length && !inT.length) throw new Error("ไม่พบข้อมูล projects หรือ tasks ใน JSON");

  // Re-key everything so imported ids never collide with existing ones.
  const idMap: Record<string, string> = {};
  const offset = merge ? current.projects.length : 0;
  const newProjects = inP.map((p, i) => {
    const project = normalizeProject(p, offset + i);
    const nid = uid("p");
    idMap[project.id] = nid;
    return { ...project, id: nid };
  });
  const newTasks = inT.map((t) => {
    const task = normalizeTask(t, current.phaseList);
    return { ...task, id: uid("t"), projectId: idMap[task.projectId] ?? task.projectId };
  });
  const newUpdates = inU.map((u) => {
    const update = normalizeUpdate(u);
    return { ...update, id: uid("u"), projectId: idMap[update.projectId] ?? update.projectId };
  });

  return {
    data: merge
      ? {
          ...current,
          projects: [...current.projects, ...newProjects],
          tasks: [...current.tasks, ...newTasks],
          updates: [...current.updates, ...newUpdates],
        }
      : { ...current, projects: newProjects, tasks: newTasks, updates: newUpdates },
    addedProjects: newProjects.length,
    addedTasks: newTasks.length,
  };
}

export type CsvType = "tasks" | "projects";

/** Count values and list up to a few distinct examples, e.g. `2 แถว ("On Hold", "Pending")`. */
function describeValues(values: string[]) {
  const distinct = [...new Set(values)].slice(0, 4).map((v) => `"${v}"`);
  return `${values.length} แถว (${distinct.join(", ")}${new Set(values).size > 4 ? ", …" : ""})`;
}

function importCsvData(raw: string, type: CsvType, merge: boolean, current: DashboardData): ImportResult {
  if (!cleanText(raw).trim()) throw new Error("กรุณาวาง CSV / ข้อมูลจาก Excel หรืออัปโหลดไฟล์ก่อน");
  const { rows, delimiter, ignored } = parseTable(raw);
  const warnings: string[] = [];
  if (ignored.length) warnings.push(`ไม่ได้ใช้คอลัมน์: ${ignored.join(", ")}`);
  const fmt = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

  if (type === "projects") {
    const base = merge ? current.projects.length : 0;
    const unknownStatus: string[] = [];
    const unknownHealth: string[] = [];
    const updates: ProjectUpdate[] = [];
    const previewRows: ImportPreview["rows"] = [];

    const imported: Project[] = rows.map((r, i) => {
      const project: Project = {
        id: uid("p"),
        name: r.name || r.project || "Untitled Project",
        startDate: normDate(r.startdate),
        endDate: normDate(r.enddate),
        description: r.description || "",
        owner: r.owner || "",
        department: r.team || "",
        priority: normPriority(r.priority),
        color: colorFor(base + i),
      };
      // Project status/health live in project updates, so record them as one.
      const rawStatus = r.projectstatus || r.status || "";
      const status = matchWord(PROJECT_STATUS_WORDS, rawStatus);
      const health = matchWord(HEALTH_WORDS, r.health);
      if (rawStatus && !status) unknownStatus.push(rawStatus);
      if (r.health && !health) unknownHealth.push(r.health);
      if (status || health) {
        updates.push({
          id: uid("u"),
          projectId: project.id,
          updateDate: normDate(r.lastupdated) || todayISO(),
          progress: parseProgress(r.progress) ?? 0,
          projectStatus: status ?? "In Progress",
          healthStatus: health ?? "On Track",
          achievement: "",
          issueRisk: "",
          issueStatus: "Closed",
          nextAction: "",
          nextMilestone: "",
          nextMilestoneDate: "",
          remark: "Imported from file",
          updatedBy: project.owner,
          createdAt: new Date().toISOString(),
        });
      }
      previewRows.push({
        cells: [project.name, project.department, project.owner, project.priority, health ?? (r.health ? "—" : ""), fmt(project.startDate), fmt(project.endDate)],
        status: {
          raw: rawStatus,
          value: status ?? (rawStatus ? "(suggested from tasks)" : ""),
          source: status ? "file" : rawStatus ? "unrecognized" : "progress",
        },
      });
      return project;
    });

    if (unknownStatus.length) warnings.push(`Project Status ที่ไม่รู้จัก ${describeValues(unknownStatus)} → ใช้สถานะที่ระบบแนะนำจาก task แทน`);
    if (unknownHealth.length) warnings.push(`Health ที่ไม่รู้จัก ${describeValues(unknownHealth)} → On Track`);

    return {
      data: merge
        ? { ...current, projects: [...current.projects, ...imported], updates: [...current.updates, ...updates] }
        : { ...current, projects: imported, tasks: [], updates },
      addedProjects: imported.length,
      addedTasks: 0,
      warnings,
      preview: {
        kind: "projects",
        delimiter: DELIMITER_LABEL[delimiter],
        columns: ["Project", "Team", "Owner", "Priority", "Health", "Start", "End"],
        rows: previewRows,
        total: imported.length,
      },
    };
  }

  // Tasks: match (or create) projects by name.
  const projects = [...current.projects];
  let addedProjects = 0;
  const unknownStatus: string[] = [];
  let blankStatus = 0;
  let noProject = 0;
  const previewRows: ImportPreview["rows"] = [];

  const imported: Task[] = rows.map((r) => {
    const projName = (r.project || "").trim();
    let proj = projects.find((p) => p.name.trim().toLowerCase() === projName.toLowerCase());
    if (!proj && projName) {
      proj = {
        id: uid("p"), name: projName, startDate: "", endDate: "",
        description: "", owner: "", department: "", priority: "Medium", color: colorFor(projects.length),
      };
      projects.push(proj);
      addedProjects++;
    }
    if (!projName) noProject++;

    const rawStatus = (r.status || "").trim();
    const fileProgress = parseProgress(r.progress);
    const matched = matchStatus(rawStatus);
    // Blank or unrecognized status: infer it from progress rather than silently using "Not Start".
    const status = matched ?? statusFromProgress(fileProgress ?? 0);
    if (!rawStatus) blankStatus++;
    else if (!matched) unknownStatus.push(rawStatus);
    const progress = status === "Completed" ? 100 : (fileProgress ?? 0);

    const task: Task = {
      id: uid("t"),
      projectId: proj?.id ?? projects[0]?.id ?? "",
      name: r.name || "Untitled Task",
      owner: r.owner || "",
      dev: parseDevList(r.dev),
      phase: normPhase(r.phase, current.phaseList),
      startDate: normDate(r.startdate),
      endDate: normDate(r.enddate),
      status,
      priority: normPriority(r.priority),
      progress,
      notes: r.notes || "",
    };
    previewRows.push({
      cells: [task.name, proj?.name ?? projects[0]?.name ?? "", task.phase, `${progress}%`, fmt(task.startDate), fmt(task.endDate)],
      status: { raw: rawStatus, value: status, source: matched ? "file" : rawStatus ? "unrecognized" : "progress" },
    });
    return task;
  });

  if (unknownStatus.length) warnings.push(`Status ที่ไม่รู้จัก ${describeValues(unknownStatus)} → กำหนดจาก Progress แทน`);
  if (blankStatus) warnings.push(`${blankStatus} แถวไม่มี Status → กำหนดจาก Progress (100% = Completed, มากกว่า 0 = In Progress)`);
  if (noProject) warnings.push(`${noProject} แถวไม่มีชื่อ Project → ใส่ไว้ในโปรเจกต์แรก "${projects[0]?.name ?? "-"}"`);

  return {
    data: { ...current, projects, tasks: merge ? [...current.tasks, ...imported] : imported },
    addedProjects,
    addedTasks: imported.length,
    warnings,
    preview: {
      kind: "tasks",
      delimiter: DELIMITER_LABEL[delimiter],
      columns: ["Task", "Project", "Phase", "Progress", "Start", "End"],
      rows: previewRows,
      total: imported.length,
    },
  };
}

/**
 * Convert an .xlsx workbook to tab-separated text the importer understands.
 * Picks the sheet named like the import type ("Tasks" / "Projects", as in our export),
 * otherwise the first sheet with data. Dates become YYYY-MM-DD and %-formatted numbers "70%".
 */
export async function xlsxToText(buffer: ArrayBuffer, type: CsvType): Promise<{ text: string; sheet: string }> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const wanted = type === "tasks" ? "tasks" : "projects";
  const sheet =
    wb.worksheets.find((w) => w.name.trim().toLowerCase() === wanted) ?? wb.worksheets.find((w) => w.actualRowCount > 1) ?? wb.worksheets[0];
  if (!sheet) throw new Error("ไม่พบ sheet ในไฟล์ Excel");

  const cellText = (cell: { value: unknown; numFmt?: string; text?: string }): string => {
    const v = cell.value;
    if (v == null) return "";
    if (v instanceof Date) return toISODate(v);
    if (typeof v === "number") return cell.numFmt?.includes("%") ? `${Math.round(v * 100)}%` : String(v);
    if (typeof v === "object") {
      const o = v as { result?: unknown; richText?: { text: string }[]; text?: string };
      if (o.result !== undefined) return cellText({ value: o.result, numFmt: cell.numFmt });
      if (o.richText) return o.richText.map((t) => t.text).join("");
      if (o.text) return o.text;
    }
    return String(v);
  };
  // Quote every field so tabs/newlines inside cells survive.
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines: string[] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) cells.push(q(cellText(row.getCell(c))));
    lines.push(cells.join("\t"));
  });
  return { text: lines.join("\n"), sheet: sheet.name };
}

// ── Templates & export ────────────────────────────────────────────────────────

export function downloadJsonTemplate() {
  const tpl = {
    projects: [
      { id: "p1", name: "ERP System Upgrade", startDate: "2025-01-01", endDate: "2025-12-31", description: "Upgrade internal ERP", owner: "Somchai K.", department: "Information Technology", priority: "High" },
    ],
    tasks: [
      { id: "t1", projectId: "p1", name: "Requirements Gathering", owner: "Somchai K.", dev: ["Chai P.", "Nattaya P."], phase: "Functional Requirement", startDate: "2025-01-01", endDate: "2025-02-28", status: "Completed", priority: "High", progress: 100, notes: "" },
      { id: "t2", projectId: "p1", name: "System Design", owner: "Apinya W.", dev: ["Mongkol R."], phase: "Design Screen", startDate: "2025-03-01", endDate: "2025-04-30", status: "In Progress", priority: "High", progress: 50, notes: "" },
      { id: "t3", projectId: "p1", name: "Development", owner: "Chai P.", dev: ["Chai P.", "Mongkol R."], phase: "Development", startDate: "2025-05-01", endDate: "2025-09-30", status: "Not Start", priority: "Medium", progress: 0, notes: "" },
    ],
    updates: [
      { id: "u1", projectId: "p1", updateDate: "2025-03-15", progress: 50, projectStatus: "In Progress", healthStatus: "On Track", achievement: "Requirements signed off.", issueRisk: "No outstanding issue", issueStatus: "Closed", nextAction: "Complete system design.", nextMilestone: "Design sign-off", nextMilestoneDate: "2025-04-30", remark: "", updatedBy: "Somchai K." },
    ],
  };
  downloadFile("isd_template.json", JSON.stringify(tpl, null, 2), "application/json");
}

const CSV_TEMPLATES: Record<CsvType, string> = {
  tasks: [
    "name,owner,dev,phase,startDate,endDate,status,priority,progress,notes,projectName",
    '"Requirements Gathering","Somchai K.","Chai P.,Nattaya P.","Functional Requirement",2025-01-01,2025-02-28,Completed,High,100,,ERP System Upgrade',
    '"System Design","Apinya W.","Mongkol R.","Design Screen",2025-03-01,2025-04-30,In Progress,High,50,,ERP System Upgrade',
    '"Development","Chai P.","Chai P.,Mongkol R.","Development",2025-05-01,2025-09-30,Plan,Medium,0,,ERP System Upgrade',
  ].join("\n"),
  projects: [
    "name,startDate,endDate,description,owner,team,priority",
    "ERP System Upgrade,2025-01-01,2025-12-31,Upgrade internal ERP platform,Somchai K.,Information Technology,High",
    "Website Redesign,2025-02-01,2025-06-30,Redesign corporate website,Apinya W.,Marketing,Medium",
  ].join("\n"),
};

export function downloadCsvTemplate(type: CsvType) {
  downloadFile(`isd_template_${type}.csv`, CSV_TEMPLATES[type], "text/csv;charset=utf-8;");
}

export function exportData({ projects, tasks, updates }: DashboardData) {
  const payload = { projects, tasks, updates, exportedAt: new Date().toISOString(), version: "2.1" };
  downloadFile(`isd_backup_${todayISO()}.json`, JSON.stringify(payload, null, 2), "application/json");
}
