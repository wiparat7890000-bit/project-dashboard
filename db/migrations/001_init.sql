-- Project Dashboard — initial schema (PostgreSQL 15+, Neon / Lakebase Postgres).
--
-- Mirrors the app's data model (src/lib/types.ts):
--   projects ─┬─< tasks
--             └─< project_updates
--   teams, phases, developers: ordered pick-lists shown in the UI.
--
-- Notes
-- * Ids are text so ids created in the browser (e.g. "p1727…_ab12c") and ids from
--   JSON backups can be stored as-is.
-- * Team / phase / developer names are stored as text on projects and tasks (not
--   foreign keys): the app keeps the pick-lists and the records in step itself
--   (rename/delete update the records), and imports may carry names that aren't
--   in a list yet.
-- * `position` keeps the order the user sees (sidebar order, list order).
-- * Enumerations are CHECK constraints rather than ENUM types so a value can be
--   added later with a plain ALTER TABLE … DROP/ADD CONSTRAINT.

-- ── Pick-lists ────────────────────────────────────────────────────────────────

CREATE TABLE teams (
  name     text PRIMARY KEY CHECK (btrim(name) <> ''),
  position integer NOT NULL DEFAULT 0
);

CREATE TABLE phases (
  name     text PRIMARY KEY CHECK (btrim(name) <> ''),
  position integer NOT NULL DEFAULT 0
);

CREATE TABLE developers (
  name     text PRIMARY KEY CHECK (btrim(name) <> ''),
  position integer NOT NULL DEFAULT 0
);

-- ── Projects ──────────────────────────────────────────────────────────────────

CREATE TABLE projects (
  id          text PRIMARY KEY,
  name        text NOT NULL CHECK (btrim(name) <> ''),
  description text NOT NULL DEFAULT '',
  owner       text NOT NULL DEFAULT '',
  team        text NOT NULL DEFAULT '',          -- shown as "Teams" in the UI
  priority    text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  start_date  date,
  end_date    date,
  color       text NOT NULL DEFAULT '#0ea5e9',
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
  -- No end >= start constraint: the project form enforces it, but imported data
  -- may not, and the app still shows such projects.
);

CREATE INDEX projects_position_idx ON projects (position);

-- ── Tasks ─────────────────────────────────────────────────────────────────────

CREATE TABLE tasks (
  id          text PRIMARY KEY,
  project_id  text NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (btrim(name) <> ''),
  owner       text NOT NULL DEFAULT '',
  devs        text[] NOT NULL DEFAULT '{}',
  phase       text NOT NULL DEFAULT '',          -- '' = no phase
  status      text NOT NULL DEFAULT 'Not Start'
              CHECK (status IN ('Not Start', 'Plan', 'In Progress', 'Completed', 'Cancelled')),
  priority    text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  progress    smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  start_date  date,
  end_date    date,
  notes       text NOT NULL DEFAULT '',
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- The app locks progress at 100% for completed tasks.
  CONSTRAINT tasks_completed_is_100 CHECK (status <> 'Completed' OR progress = 100)
);

CREATE INDEX tasks_project_idx ON tasks (project_id, position);
-- "Delayed" = end date passed, below 100%, not cancelled.
CREATE INDEX tasks_open_end_date_idx ON tasks (end_date) WHERE progress < 100 AND status <> 'Cancelled';

-- ── Project updates (status reports) ──────────────────────────────────────────

CREATE TABLE project_updates (
  id                  text PRIMARY KEY,
  project_id          text NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  update_date         date NOT NULL,
  progress            smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  project_status      text NOT NULL
                      CHECK (project_status IN ('Not Started', 'In Progress', 'At Risk', 'Delayed', 'Completed', 'On Hold')),
  health_status       text NOT NULL CHECK (health_status IN ('On Track', 'At Risk', 'Delayed')),
  achievement         text NOT NULL DEFAULT '',
  issue_risk          text NOT NULL DEFAULT '',
  issue_status        text NOT NULL DEFAULT 'Open' CHECK (issue_status IN ('Open', 'Resolved', 'Closed')),
  next_action         text NOT NULL DEFAULT '',
  next_milestone      text NOT NULL DEFAULT '',
  next_milestone_date date,
  remark              text NOT NULL DEFAULT '',
  updated_by          text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Latest update per project drives the project's status / health / "Last Updated".
CREATE INDEX project_updates_latest_idx ON project_updates (project_id, update_date DESC, created_at DESC);

-- ── Reporting view ────────────────────────────────────────────────────────────

-- One row per project with the numbers shown on the dashboard. "Finished"
-- matches the app's Project History rule: at least one Completed task and every
-- task Completed or Cancelled.
CREATE VIEW project_overview AS
SELECT
  p.id,
  p.name,
  p.team,
  p.owner,
  p.priority,
  p.start_date,
  p.end_date,
  COALESCE(round(avg(t.progress)), 0)::int                                         AS progress,
  count(t.id)::int                                                                  AS tasks,
  count(t.id) FILTER (WHERE t.progress >= 100)::int                                 AS completed_tasks,
  count(t.id) FILTER (WHERE t.end_date < current_date AND t.progress < 100
                            AND t.status <> 'Cancelled')::int                       AS delayed_tasks,
  (count(t.id) FILTER (WHERE t.status = 'Completed') > 0
     AND bool_and(t.status IN ('Completed', 'Cancelled')))                          AS finished,
  lu.project_status,
  lu.health_status,
  lu.update_date                                                                    AS last_updated
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
LEFT JOIN LATERAL (
  SELECT u.project_status, u.health_status, u.update_date
  FROM project_updates u
  WHERE u.project_id = p.id
  ORDER BY u.update_date DESC, u.created_at DESC
  LIMIT 1
) lu ON true
GROUP BY p.id, lu.project_status, lu.health_status, lu.update_date;
