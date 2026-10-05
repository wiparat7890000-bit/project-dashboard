import type pg from "pg";
import { normalizeProject, normalizeTask, normalizeUpdate } from "../importExport";
import type { SyncPayload } from "../sync";
import type { DashboardData, Project, ProjectUpdate, Task } from "../types";

const orNull = (s: string) => s || null;
const orEmpty = (s: string | null) => s ?? "";

/** Read the whole dashboard, in the order the user arranged it. */
export async function loadAll(db: pg.Pool): Promise<DashboardData> {
  const [projects, tasks, updates, devs, teams, phases] = await Promise.all([
    db.query("SELECT * FROM projects ORDER BY position, created_at"),
    db.query("SELECT * FROM tasks ORDER BY position, created_at"),
    db.query("SELECT * FROM project_updates ORDER BY update_date, created_at"),
    db.query("SELECT name FROM developers ORDER BY position, name"),
    db.query("SELECT name FROM teams ORDER BY position, name"),
    db.query("SELECT name FROM phases ORDER BY position, name"),
  ]);
  return {
    projects: projects.rows.map(
      (r): Project => ({
        id: r.id,
        name: r.name,
        description: r.description,
        owner: r.owner,
        department: r.team,
        priority: r.priority,
        startDate: orEmpty(r.start_date),
        endDate: orEmpty(r.end_date),
        color: r.color,
      }),
    ),
    tasks: tasks.rows.map(
      (r): Task => ({
        id: r.id,
        projectId: r.project_id,
        name: r.name,
        owner: r.owner,
        dev: r.devs,
        phase: r.phase,
        startDate: orEmpty(r.start_date),
        endDate: orEmpty(r.end_date),
        status: r.status,
        priority: r.priority,
        progress: r.progress,
        notes: r.notes,
      }),
    ),
    updates: updates.rows.map(
      (r): ProjectUpdate => ({
        id: r.id,
        projectId: r.project_id,
        updateDate: r.update_date,
        progress: r.progress,
        projectStatus: r.project_status,
        healthStatus: r.health_status,
        achievement: r.achievement,
        issueRisk: r.issue_risk,
        issueStatus: r.issue_status,
        nextAction: r.next_action,
        nextMilestone: r.next_milestone,
        nextMilestoneDate: orEmpty(r.next_milestone_date),
        remark: r.remark,
        updatedBy: r.updated_by,
        createdAt: new Date(r.created_at).toISOString(),
      }),
    ),
    devList: devs.rows.map((r) => r.name),
    deptList: teams.rows.map((r) => r.name),
    phaseList: phases.rows.map((r) => r.name),
  };
}

async function replaceList(client: pg.PoolClient, table: "developers" | "teams" | "phases", names: string[]) {
  const clean = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))];
  await client.query(`DELETE FROM ${table}`);
  if (clean.length) {
    await client.query(`INSERT INTO ${table} (name, position) SELECT * FROM unnest($1::text[], $2::int[])`, [clean, clean.map((_, i) => i)]);
  }
}

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const rows = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

/**
 * Apply a client's changes in one transaction. Rows are normalized with the same
 * rules as imports, so a malformed payload can't store values the app can't show.
 */
export async function applySync(db: pg.Pool, payload: SyncPayload): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Deletes first (children before parents; projects also cascade).
    await client.query("DELETE FROM project_updates WHERE id = ANY($1::text[])", [ids(payload.updates?.delete)]);
    await client.query("DELETE FROM tasks WHERE id = ANY($1::text[])", [ids(payload.tasks?.delete)]);
    await client.query("DELETE FROM projects WHERE id = ANY($1::text[])", [ids(payload.projects?.delete)]);

    for (const raw of rows(payload.projects?.upsert)) {
      const p = normalizeProject(raw, 0);
      await client.query(
        `INSERT INTO projects (id, name, description, owner, team, priority, start_date, end_date, color, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description, owner = EXCLUDED.owner, team = EXCLUDED.team,
           priority = EXCLUDED.priority, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
           color = EXCLUDED.color, position = EXCLUDED.position, updated_at = now()`,
        [p.id, p.name, p.description, p.owner, p.department, p.priority, orNull(p.startDate), orNull(p.endDate), p.color, Number(raw.position) || 0],
      );
    }

    for (const raw of rows(payload.tasks?.upsert)) {
      const t = normalizeTask(raw);
      await client.query(
        `INSERT INTO tasks (id, project_id, name, owner, devs, phase, status, priority, progress, start_date, end_date, notes, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           project_id = EXCLUDED.project_id, name = EXCLUDED.name, owner = EXCLUDED.owner, devs = EXCLUDED.devs,
           phase = EXCLUDED.phase, status = EXCLUDED.status, priority = EXCLUDED.priority, progress = EXCLUDED.progress,
           start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, notes = EXCLUDED.notes,
           position = EXCLUDED.position, updated_at = now()`,
        [t.id, t.projectId, t.name, t.owner, t.dev, t.phase, t.status, t.priority, t.progress, orNull(t.startDate), orNull(t.endDate), t.notes, Number(raw.position) || 0],
      );
    }

    for (const raw of rows(payload.updates?.upsert)) {
      const u = normalizeUpdate(raw);
      await client.query(
        `INSERT INTO project_updates (id, project_id, update_date, progress, project_status, health_status, achievement,
           issue_risk, issue_status, next_action, next_milestone, next_milestone_date, remark, updated_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET
           project_id = EXCLUDED.project_id, update_date = EXCLUDED.update_date, progress = EXCLUDED.progress,
           project_status = EXCLUDED.project_status, health_status = EXCLUDED.health_status,
           achievement = EXCLUDED.achievement, issue_risk = EXCLUDED.issue_risk, issue_status = EXCLUDED.issue_status,
           next_action = EXCLUDED.next_action, next_milestone = EXCLUDED.next_milestone,
           next_milestone_date = EXCLUDED.next_milestone_date, remark = EXCLUDED.remark, updated_by = EXCLUDED.updated_by`,
        [
          u.id, u.projectId, u.updateDate, u.progress, u.projectStatus, u.healthStatus, u.achievement, u.issueRisk,
          u.issueStatus, u.nextAction, u.nextMilestone, orNull(u.nextMilestoneDate), u.remark, u.updatedBy, u.createdAt,
        ],
      );
    }

    if (payload.devList) await replaceList(client, "developers", payload.devList);
    if (payload.deptList) await replaceList(client, "teams", payload.deptList);
    if (payload.phaseList) await replaceList(client, "phases", payload.phaseList);

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
