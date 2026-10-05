import { getPool } from "@/lib/server/db";
import { applySync } from "@/lib/server/repo";
import type { SyncPayload } from "@/lib/sync";

export const dynamic = "force-dynamic";

/** POST /api/sync — apply the client's changes (upserts/deletes/lists) in one transaction. */
export async function POST(request: Request) {
  const db = getPool();
  if (!db) return Response.json({ ok: false, error: "No database configured" }, { status: 503 });

  let payload: SyncPayload;
  try {
    payload = (await request.json()) as SyncPayload;
    if (typeof payload !== "object" || payload === null) throw new Error("payload must be an object");
  } catch (e) {
    return Response.json({ ok: false, error: `Invalid request: ${(e as Error).message}` }, { status: 400 });
  }

  try {
    await applySync(db, payload);
    return Response.json({ ok: true });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    console.error("[api/sync]", err.code, err.message);
    // Constraint violations (23xxx) are the client's data; everything else is the database.
    const status = err.code?.startsWith("23") ? 422 : 503;
    return Response.json({ ok: false, error: err.message ?? "Save failed" }, { status });
  }
}
