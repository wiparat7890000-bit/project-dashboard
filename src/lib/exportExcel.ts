import type { Workbook, Worksheet } from "exceljs";
import { HEALTH_STYLE, PRIORITY_STYLE, PROJECT_STATUS_STYLE, STATUS_STYLE, type TagStyle } from "./constants";
import { slugify } from "./routes";
import type { DashboardData, Project } from "./types";
import { daysDelayed, getProjectOverview, hasIssue, isProjectFinished, todayISO } from "./utils";

type CellKind = "text" | "date" | "percent" | "number" | "wrap";

interface Column<Row> {
  header: string;
  width: number;
  kind?: CellKind;
  value: (row: Row) => string | number | Date | null;
  /** Colors a cell like the badge in the app (e.g. status). */
  tag?: (row: Row) => TagStyle | undefined;
}

const HEADER_FILL = "FF0369A1"; // sky-700
const DATE_FORMAT = "dd/mm/yyyy";

/** ISO date → Date at UTC midnight (ExcelJS converts using UTC), or null. */
function toDate(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : null;
}

const argb = (hex: string) => "FF" + hex.replace("#", "").toUpperCase();

function addSheet<Row>(wb: Workbook, name: string, columns: Column<Row>[], rows: Row[]): Worksheet {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c, i) => ({
    header: c.header,
    key: String(i),
    width: c.width,
    style: {
      numFmt: c.kind === "date" ? DATE_FORMAT : c.kind === "percent" ? "0%" : undefined,
      alignment: { vertical: "top", wrapText: c.kind === "wrap" },
    },
  }));

  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  for (const row of rows) {
    const added = ws.addRow(Object.fromEntries(columns.map((c, i) => [String(i), c.value(row) ?? null])));
    columns.forEach((c, i) => {
      const tag = c.tag?.(row);
      if (!tag) return;
      const cell = added.getCell(i + 1);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(tag.bg) } };
      cell.font = { bold: true, color: { argb: argb(tag.color) } };
    });
  }

  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
  return ws;
}

export interface ExcelExportOptions {
  /** Limit the export to one project; all projects when omitted. */
  project?: Project;
}

/** Build the workbook and download it. Returns the file name. */
export async function exportToExcel(data: DashboardData, { project }: ExcelExportOptions = {}): Promise<string> {
  // Loaded on demand so the library isn't part of the main bundle.
  const { default: ExcelJS } = await import("exceljs");
  const today = todayISO();

  const projects = project ? [project] : data.projects;
  const projectIds = new Set(projects.map((p) => p.id));
  const tasks = data.tasks.filter((t) => projectIds.has(t.projectId));
  const updates = data.updates
    .filter((u) => projectIds.has(u.projectId))
    .sort((a, b) => b.updateDate.localeCompare(a.updateDate) || b.createdAt.localeCompare(a.createdAt));
  const projectName = new Map(data.projects.map((p) => [p.id, p.name]));
  const overviews = projects.map((p) => ({ p, o: getProjectOverview(p, data.tasks, data.updates) }));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Project Dashboard — ISD";
  wb.created = new Date();

  // ── Summary ────────────────────────────────────────────────────────────────
  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ width: 28 }, { width: 48 }];
  summary.addRow(["Project Dashboard — Export"]).font = { bold: true, size: 16, color: { argb: HEADER_FILL } };
  summary.addRow(["Information System Division (ISD)"]).font = { color: { argb: "FF64748B" } };
  summary.addRow([]);
  const finished = overviews.filter(({ o }) => isProjectFinished(o.stats.tasks)).length;
  const summaryRows: [string, string | number | Date][] = [
    ["Exported on", toDate(today)!],
    ["Scope", project ? project.name : "All projects"],
    ["Projects", projects.length],
    ["Active projects", projects.length - finished],
    ["Finished (Project History)", finished],
    ["Tasks", tasks.length],
    ["Completed tasks", tasks.filter((t) => t.progress >= 100).length],
    ["Delayed tasks", tasks.filter((t) => daysDelayed(t, today) > 0).length],
    ["Open issues", overviews.reduce((n, { o }) => n + o.openIssues, 0)],
    ["Project updates", updates.length],
  ];
  for (const [label, value] of summaryRows) {
    const row = summary.addRow([label, value]);
    row.getCell(1).font = { bold: true, color: { argb: "FF334155" } };
    if (value instanceof Date) row.getCell(2).numFmt = DATE_FORMAT;
    row.getCell(2).alignment = { horizontal: "left" };
  }

  // ── Projects ───────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Projects",
    [
      { header: "Project", width: 40, kind: "wrap", value: ({ p }) => p.name },
      { header: "Team", width: 22, value: ({ p }) => p.department },
      { header: "Owner", width: 18, value: ({ p }) => p.owner },
      { header: "Priority", width: 11, value: ({ p }) => p.priority, tag: ({ p }) => PRIORITY_STYLE[p.priority] },
      { header: "Project Status", width: 15, value: ({ o }) => o.status, tag: ({ o }) => PROJECT_STATUS_STYLE[o.status] },
      { header: "Health", width: 11, value: ({ o }) => o.health, tag: ({ o }) => HEALTH_STYLE[o.health] },
      { header: "Progress", width: 10, kind: "percent", value: ({ o }) => o.stats.avg / 100 },
      { header: "Start Date", width: 12, kind: "date", value: ({ p }) => toDate(p.startDate) },
      { header: "Target End Date", width: 15, kind: "date", value: ({ p }) => toDate(p.endDate) },
      { header: "Tasks", width: 8, kind: "number", value: ({ o }) => o.stats.total },
      { header: "Completed", width: 11, kind: "number", value: ({ o }) => o.stats.completed },
      { header: "Delayed", width: 9, kind: "number", value: ({ o }) => o.stats.delayed },
      { header: "Open Issues", width: 11, kind: "number", value: ({ o }) => o.openIssues },
      { header: "Last Updated", width: 13, kind: "date", value: ({ o }) => toDate(o.lastUpdated) },
      { header: "In Project History", width: 17, value: ({ o }) => (isProjectFinished(o.stats.tasks) ? "Yes" : "No") },
      { header: "Description", width: 45, kind: "wrap", value: ({ p }) => p.description },
    ],
    overviews,
  );

  // ── Tasks ──────────────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Tasks",
    [
      { header: "Project", width: 32, kind: "wrap", value: (t) => projectName.get(t.projectId) ?? "" },
      { header: "Phase", width: 22, value: (t) => t.phase },
      { header: "Task", width: 36, kind: "wrap", value: (t) => t.name },
      { header: "Owner", width: 16, value: (t) => t.owner },
      { header: "Dev.", width: 24, kind: "wrap", value: (t) => t.dev.join(", ") },
      { header: "Status", width: 13, value: (t) => t.status, tag: (t) => STATUS_STYLE[t.status] },
      { header: "Priority", width: 10, value: (t) => t.priority, tag: (t) => PRIORITY_STYLE[t.priority] },
      { header: "Progress", width: 10, kind: "percent", value: (t) => t.progress / 100 },
      { header: "Start Date", width: 12, kind: "date", value: (t) => toDate(t.startDate) },
      { header: "End Date", width: 12, kind: "date", value: (t) => toDate(t.endDate) },
      {
        header: "Days Delayed",
        width: 13,
        kind: "number",
        value: (t) => daysDelayed(t, today) || null,
        tag: (t) => (daysDelayed(t, today) > 0 ? { bg: "#fee2e2", color: "#dc2626" } : undefined),
      },
      { header: "Notes", width: 40, kind: "wrap", value: (t) => t.notes },
    ],
    tasks,
  );

  // ── Project Updates ────────────────────────────────────────────────────────
  addSheet(
    wb,
    "Project Updates",
    [
      { header: "Project", width: 32, kind: "wrap", value: (u) => projectName.get(u.projectId) ?? "" },
      { header: "Update Date", width: 12, kind: "date", value: (u) => toDate(u.updateDate) },
      { header: "Project Status", width: 15, value: (u) => u.projectStatus, tag: (u) => PROJECT_STATUS_STYLE[u.projectStatus] },
      { header: "Health", width: 11, value: (u) => u.healthStatus, tag: (u) => HEALTH_STYLE[u.healthStatus] },
      { header: "Progress", width: 10, kind: "percent", value: (u) => u.progress / 100 },
      { header: "Key Achievement", width: 40, kind: "wrap", value: (u) => u.achievement },
      { header: "Issue / Risk", width: 36, kind: "wrap", value: (u) => u.issueRisk },
      { header: "Issue Status", width: 12, value: (u) => (hasIssue(u.issueRisk) ? u.issueStatus : "") },
      { header: "Next Action", width: 36, kind: "wrap", value: (u) => u.nextAction },
      { header: "Next Milestone", width: 24, kind: "wrap", value: (u) => u.nextMilestone },
      { header: "Milestone Date", width: 14, kind: "date", value: (u) => toDate(u.nextMilestoneDate) },
      { header: "Remark", width: 30, kind: "wrap", value: (u) => u.remark },
      { header: "Updated By", width: 16, value: (u) => u.updatedBy },
    ],
    updates,
  );

  const fileName = `project-dashboard${project ? "_" + slugify(project.name) : ""}_${today}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
