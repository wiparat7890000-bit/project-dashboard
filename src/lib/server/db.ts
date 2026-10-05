import pg from "pg";

// Return DATE columns as "YYYY-MM-DD" strings (the app's format) instead of JS Dates,
// which pg would build at local midnight and shift across time zones.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

const globalForPool = globalThis as unknown as { dashboardPool?: pg.Pool };

/**
 * Connection settings from a Postgres URL, honoring Neon's defaults:
 * - `channel_binding=require` → pg's enableChannelBinding (pg reads the URL param but
 *   doesn't turn binding on by itself).
 * - `sslmode=require` → `verify-full`: what pg already does (it warns about it), stated
 *   explicitly so the certificate is verified and no warning is printed.
 */
export function pgConfig(url: string): pg.PoolConfig {
  const u = new URL(url);
  const enableChannelBinding = u.searchParams.get("channel_binding") === "require";
  if (u.searchParams.get("sslmode") === "require") u.searchParams.set("sslmode", "verify-full");
  return { connectionString: u.toString(), enableChannelBinding };
}

/**
 * Shared connection pool for the pooled DATABASE_URL (Neon "-pooler" host).
 * Returns null when no database is configured: the app then keeps data in the browser.
 */
export function getPool(): pg.Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!globalForPool.dashboardPool) {
    const pool = new pg.Pool({
      ...pgConfig(connectionString),
      max: 5,
      connectionTimeoutMillis: 8_000,
      idleTimeoutMillis: 30_000,
    });
    // Idle connections are dropped when the database restarts or Neon scales to zero.
    // Without a listener that error would be unhandled; the pool replaces the client on next use.
    pool.on("error", (err) => console.warn("[db] idle connection closed:", err.message));
    globalForPool.dashboardPool = pool;
  }
  return globalForPool.dashboardPool;
}

/** Postgres error code for "relation does not exist" (tables not migrated yet). */
export const UNDEFINED_TABLE = "42P01";
