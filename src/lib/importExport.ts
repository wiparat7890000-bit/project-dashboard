import { PHASES, PRIORITIES, type DashboardData, type Phase, type Priority, type Project, type Status, type Task } from "./types";
import { colorFor, downloadFile, todayISO, toISODate, uid } from "./utils";

type Row = Record<string, string>;

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const squash = (s: string) => s.toLowerCase().replace(/[\s\-_&]/g, "");

// ── Normalizers (turn untrusted input into well-typed records) ────────────────

const STATUS_ALIASES: Record<string, Status> = {
  notstart: "Not Start",
  notstarted: "Not Start",
  plan: "Plan",
  inprogress: "In Progress",
  inprog: "In Progress",
  done: "Done",
  complete: "Done",
  completed: "Done",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};

export function normStatus(s: unknown): Status {
  return STATUS_ALIASES[squash(str(s))] ?? "Not Start";
}

export function normPriority(s: unknown): Priority {
  const key = squash(str(s));
  return PRIORITIES.find((p) => squash(p) === key) ?? "Medium";
}

export function normPhase(s: unknown): Phase | "" {
  const key = squash(str(s));
  if (!key) return "";
  return PHASES.find((p) => squash(p) === key) ?? "";
}

/** Normalize any common date format → `YYYY-MM-DD` ("" if unparseable). */
export function normDate(raw: unknown): string {
  const s = str(raw).trim();
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

  const d = new Date(s);
  if (!Number.isNaN(d.getTime()) && d.getFullYear() > 1900) return toISODate(d);
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
    department: str(p.department),
    startDate: normDate(p.startDate ?? p.start),
    endDate: normDate(p.endDate ?? p.end),
    color: str(p.color) || colorFor(index),
  };
}

export function normalizeTask(input: unknown): Task {
  const t = (input ?? {}) as Record<string, unknown>;
  const status = normStatus(t.status);
  return {
    id: str(t.id) || uid("t"),
    projectId: str(t.projectId),
    name: str(t.name) || "Untitled Task",
    owner: str(t.owner ?? t.assignee),
    dev: parseDevList(t.dev),
    phase: normPhase(t.phase),
    startDate: normDate(t.startDate),
    endDate: normDate(t.endDate),
    status,
    priority: normPriority(t.priority),
    progress: status === "Done" ? 100 : clampProgress(t.progress),
    notes: str(t.notes),
  };
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

/** Parse a single CSV line, handling quoted fields and escaped quotes. */
export function parseCSVLine(line: string): string[] {
  const res: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      res.push(cur);
      cur = "";
    } else cur += c;
  }
  res.push(cur);
  return res;
}

export function cleanText(raw: string) {
  return raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

function parseCSV(raw: string): Row[] {
  const lines = cleanText(raw).trim().split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new Error("ต้องมีอย่างน้อย 1 แถวข้อมูล (ไม่นับ header)");
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/[\s\-_]/g, ""));
  const rows = lines
    .slice(1)
    .map((line) => {
      const vals = parseCSVLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()])) as Row;
    })
    .filter((r) => Object.values(r).some((v) => v !== ""));
  if (!rows.length) throw new Error("ไม่มีข้อมูลในไฟล์");
  return rows;
}

// ── Import ────────────────────────────────────────────────────────────────────

export interface ImportResult {
  data: DashboardData;
  addedProjects: number;
  addedTasks: number;
}

export function importJson(raw: string, merge: boolean, current: DashboardData): ImportResult {
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

  const obj = parsed as { projects?: unknown; tasks?: unknown };
  const inP = Array.isArray(obj.projects) ? obj.projects : [];
  const inT = Array.isArray(obj.tasks) ? obj.tasks : [];
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
    const task = normalizeTask(t);
    return { ...task, id: uid("t"), projectId: idMap[task.projectId] ?? task.projectId };
  });

  return {
    data: merge
      ? { ...current, projects: [...current.projects, ...newProjects], tasks: [...current.tasks, ...newTasks] }
      : { ...current, projects: newProjects, tasks: newTasks },
    addedProjects: newProjects.length,
    addedTasks: newTasks.length,
  };
}

export type CsvType = "tasks" | "projects";

export function importCsv(raw: string, type: CsvType, merge: boolean, current: DashboardData): ImportResult {
  if (!cleanText(raw).trim()) throw new Error("กรุณาวาง CSV หรืออัปโหลดไฟล์ก่อน");
  const rows = parseCSV(raw);

  if (type === "projects") {
    const base = merge ? current.projects.length : 0;
    const imported: Project[] = rows.map((r, i) => ({
      id: uid("p"),
      name: r.name || "Untitled Project",
      startDate: normDate(r.startdate || r.start),
      endDate: normDate(r.enddate || r.end),
      description: r.description || r.desc || "",
      owner: r.owner || "",
      department: r.department || r.dept || "",
      color: colorFor(base + i),
    }));
    return {
      data: merge
        ? { ...current, projects: [...current.projects, ...imported] }
        : { ...current, projects: imported, tasks: [] },
      addedProjects: imported.length,
      addedTasks: 0,
    };
  }

  // Tasks: match (or create) projects by name.
  const projects = [...current.projects];
  let addedProjects = 0;
  const imported: Task[] = rows.map((r) => {
    const projName = (r.projectname || r.project || r.projectid || "").trim();
    let proj = projects.find((p) => p.name.trim().toLowerCase() === projName.toLowerCase());
    if (!proj && projName) {
      proj = {
        id: uid("p"), name: projName, startDate: "", endDate: "",
        description: "", owner: "", department: "", color: colorFor(projects.length),
      };
      projects.push(proj);
      addedProjects++;
    }
    const status = normStatus(r.status);
    return {
      id: uid("t"),
      projectId: proj?.id ?? projects[0]?.id ?? "",
      name: r.name || r.taskname || r.task || "Untitled Task",
      owner: r.owner || r.assignee || "",
      dev: parseDevList(r.dev || r.developer || r.developers),
      phase: normPhase(r.phase || r.phasename),
      startDate: normDate(r.startdate || r.start),
      endDate: normDate(r.enddate || r.end || r.duedate || r.due),
      status,
      priority: normPriority(r.priority),
      progress: status === "Done" ? 100 : clampProgress(r.progress),
      notes: r.notes || r.note || r.remark || "",
    };
  });

  return {
    data: { ...current, projects, tasks: merge ? [...current.tasks, ...imported] : imported },
    addedProjects,
    addedTasks: imported.length,
  };
}

// ── Templates & export ────────────────────────────────────────────────────────

export function downloadJsonTemplate() {
  const tpl = {
    projects: [
      { id: "p1", name: "ERP System Upgrade", startDate: "2025-01-01", endDate: "2025-12-31", description: "Upgrade internal ERP", owner: "Somchai K.", department: "Information Technology" },
    ],
    tasks: [
      { id: "t1", projectId: "p1", name: "Requirements Gathering", owner: "Somchai K.", dev: ["Chai P.", "Nattaya P."], phase: "Functional Requirement", startDate: "2025-01-01", endDate: "2025-02-28", status: "Done", priority: "High", progress: 100, notes: "" },
      { id: "t2", projectId: "p1", name: "System Design", owner: "Apinya W.", dev: ["Mongkol R."], phase: "Design Screen", startDate: "2025-03-01", endDate: "2025-04-30", status: "In Progress", priority: "High", progress: 50, notes: "" },
      { id: "t3", projectId: "p1", name: "Development", owner: "Chai P.", dev: ["Chai P.", "Mongkol R."], phase: "Development", startDate: "2025-05-01", endDate: "2025-09-30", status: "Not Start", priority: "Medium", progress: 0, notes: "" },
    ],
  };
  downloadFile("isd_template.json", JSON.stringify(tpl, null, 2), "application/json");
}

const CSV_TEMPLATES: Record<CsvType, string> = {
  tasks: [
    "name,owner,dev,phase,startDate,endDate,status,priority,progress,notes,projectName",
    '"Requirements Gathering","Somchai K.","Chai P.,Nattaya P.","Functional Requirement",2025-01-01,2025-02-28,Done,High,100,,ERP System Upgrade',
    '"System Design","Apinya W.","Mongkol R.","Design Screen",2025-03-01,2025-04-30,In Progress,High,50,,ERP System Upgrade',
    '"Development","Chai P.","Chai P.,Mongkol R.","Development",2025-05-01,2025-09-30,Plan,Medium,0,,ERP System Upgrade',
  ].join("\n"),
  projects: [
    "name,startDate,endDate,description,owner,department",
    "ERP System Upgrade,2025-01-01,2025-12-31,Upgrade internal ERP platform,Somchai K.,Information Technology",
    "Website Redesign,2025-02-01,2025-06-30,Redesign corporate website,Apinya W.,Marketing",
  ].join("\n"),
};

export function downloadCsvTemplate(type: CsvType) {
  downloadFile(`isd_template_${type}.csv`, CSV_TEMPLATES[type], "text/csv;charset=utf-8;");
}

export function exportData({ projects, tasks }: DashboardData) {
  const payload = { projects, tasks, exportedAt: new Date().toISOString(), version: "2.0" };
  downloadFile(`isd_backup_${todayISO()}.json`, JSON.stringify(payload, null, 2), "application/json");
}
