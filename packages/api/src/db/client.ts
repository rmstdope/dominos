import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema.ts";

/** Postgres in production, PGlite in tests and local dev: the same schema and queries on both. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type Database = {
  db: Db;
  close: () => Promise<void>;
};

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export async function connectPostgres(url: string): Promise<Database> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(url, { max: 10 });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return { db, close: () => client.end() };
}

/** An embedded database: in memory when `dir` is omitted, otherwise kept in that directory. */
export async function connectPglite(dir?: string): Promise<Database> {
  // PGlite is a dev dependency: production always has DATABASE_URL and never loads it.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dir) mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return { db, close: () => client.close() };
}
