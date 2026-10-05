// Apply db/migrations/*.sql in order, once each, recording them in schema_migrations.
//
//   npm run db:migrate
//
// Uses DATABASE_URL_UNPOOLED if set, otherwise DATABASE_URL with Neon's "-pooler"
// removed from the host: migrations should use a direct connection, not PgBouncer.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

function directUrl() {
  const raw = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!raw) {
    console.error("DATABASE_URL is not set. Put it in .env.local (see .env.example).");
    process.exit(1);
  }
  const url = new URL(raw);
  url.hostname = url.hostname.replace("-pooler.", ".");
  return url;
}

// Same connection rules as the app (src/lib/server/db.ts): honor channel_binding=require,
// and state sslmode=require as verify-full (pg's actual behavior) to silence its warning.
const url = directUrl();
const enableChannelBinding = url.searchParams.get("channel_binding") === "require";
if (url.searchParams.get("sslmode") === "require") url.searchParams.set("sslmode", "verify-full");

const dir = path.join(process.cwd(), "db", "migrations");
const client = new pg.Client({ connectionString: url.toString(), enableChannelBinding, connectionTimeoutMillis: 15_000 });

try {
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const done = new Set((await client.query("SELECT version FROM schema_migrations")).rows.map((r) => r.version));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
      applied++;
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(`${file}: ${e.message}`);
    }
  }
  console.log(applied ? `Done: ${applied} migration(s) applied.` : "Database is up to date.");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
