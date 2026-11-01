// Applies db/migrations to PostgreSQL (Amazon RDS in production, any server locally).
// The early migrations were written for Supabase, so a compatibility prelude first creates
// what they expect: the anon/authenticated roles, the extensions schema with pgvector
// and a minimal storage.buckets table. Every migration is idempotent and runs in order;
// applied files are recorded so restarts skip them.
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const dir = process.env.MIGRATIONS_DIR || new URL("./migrations/", import.meta.url).pathname;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`
    DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE SCHEMA IF NOT EXISTS extensions;
    CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.buckets(id text PRIMARY KEY, name text, public boolean, file_size_limit bigint);
    CREATE TABLE IF NOT EXISTS jude_schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
  `);
  const done = new Set(
    (await client.query("SELECT name FROM jude_schema_migrations")).rows.map((r) => r.name),
  );
  for (const name of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(name)) continue;
    await client.query(await readFile(new URL(name, `file://${dir.replace(/\/?$/, "/")}`), "utf8"));
    await client.query("INSERT INTO jude_schema_migrations(name) VALUES ($1)", [name]);
    console.log(`applied ${name}`);
  }
  console.log("migrations up to date");
} finally {
  await client.end();
}
