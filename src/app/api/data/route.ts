import { getPool, UNDEFINED_TABLE } from "@/lib/server/db";
import { loadAll } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

/** GET /api/data — the whole dashboard from Postgres; `configured: false` when no DATABASE_URL is set. */
export async function GET() {
  const db = getPool();
  if (!db) return Response.json({ configured: false });
  try {
    return Response.json({ configured: true, data: await loadAll(db) });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const error =
      err.code === UNDEFINED_TABLE ? "Database tables are missing. Run `npm run db:migrate`." : `Database unavailable: ${err.message ?? "unknown error"}`;
    console.error("[api/data]", err.message);
    return Response.json({ configured: true, error }, { status: 503 });
  }
}
