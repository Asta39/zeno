import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

/**
 * Supabase Postgres via the session pooler (IPv4-friendly).
 * DATABASE_URL comes from .env.local — Next.js loads it automatically;
 * for plain scripts (seed, smoke) we read the file ourselves.
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("DATABASE_URL not set — add it to .env.local");
}

declare global {
  // eslint-disable-next-line no-var
  var __biasharaPg: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  const client = postgres(resolveDatabaseUrl(), {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false, // required for Supabase transaction pooler (port 6543); harmless on 5432
  });
  const d = drizzle(client, { schema });

  // Fail fast inside transactions. The Supabase transaction pooler drops
  // per-connection startup settings, so the only timeouts that reach the
  // server are SET LOCAL ones. Without them a transaction waiting on a row
  // lock (e.g. the org row during document numbering) can sit for minutes,
  // every later writer queues behind it, the pool empties and the whole app
  // hangs until Vercel kills requests at 300s — the 23 Nov 2026 outage.
  const rawTransaction = d.transaction.bind(d);
  d.transaction = ((fn: Parameters<typeof rawTransaction>[0], config?: Parameters<typeof rawTransaction>[1]) =>
    rawTransaction(async (tx) => {
      await tx.execute(sql`set local lock_timeout = '10s'`);
      await tx.execute(sql`set local statement_timeout = '25s'`);
      await tx.execute(sql`set local idle_in_transaction_session_timeout = '30s'`);
      return fn(tx);
    }, config)) as typeof d.transaction;

  return d;
}

// Cache the client (and its connection pool) on the warm Lambda/Node process
// in every environment, not just dev. Skipping this in production meant every
// serverless invocation opened a brand-new pool of up to 10 Postgres
// connections instead of reusing the warm instance's — under any concurrent
// load (e.g. several Realtime-triggered refreshes landing close together)
// that churns through Supabase's connection ceiling fast, surfacing as
// random "Server Component render error" failures with no clear repro.
export const db = globalThis.__biasharaPg ?? createDb();
globalThis.__biasharaPg = db;

export * from "./schema";
