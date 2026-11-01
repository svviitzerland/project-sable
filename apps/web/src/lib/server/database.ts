import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";
import type { DatabaseSync } from "node:sqlite";
import type { Settings } from "./config";
import type { Tables } from "./contracts";
import { localSchema } from "./local-schema";

export const uid = () => randomUUID();
export const now = () => new Date().toISOString();
export const seconds = () => Date.now() / 1000;
export class Mutex {
  private tail = Promise.resolve();
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((r) => (release = r));
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
const jsonColumns = new Set([
  "speakers",
  "embedding",
  "citations",
  "review",
  "legal",
  "conditions",
  "payload",
  "aliases",
]);
const boolColumns = new Set(["demo", "synthetic", "reviewed", "confirmed"]);
const defaults: Record<keyof Tables, () => Record<string, unknown>> = {
  users: () => ({ id: uid(), demo: false }),
  sessions: () => ({}),
  cases: () => ({
    id: uid(),
    reference: "",
    description: "",
    synthetic: false,
    status: "ready",
    created_at: now(),
    speakers: {},
  }),
  documents: () => ({ id: uid(), storage: "local", created_at: now() }),
  chunks: () => ({
    id: uid(),
    section: "",
    embedding: null,
    embedding_model: "",
  }),
  hearings: () => ({
    id: uid(),
    date: "",
    kind: "manual",
    status: "ready",
    source_document_id: null,
    created_at: now(),
  }),
  segments: () => ({
    id: uid(),
    hearing_id: null,
    speaker: "Unknown",
    start: 0,
    end: 0,
    confidence: null,
    origin: "manual",
    analysis_state: "queued",
    analysis_error: null,
    created_at: now(),
  }),
  findings: () => ({
    id: uid(),
    citations: [],
    review: {},
    legal: [],
    elapsed_ms: 0,
    reviewed: false,
    note: "",
    created_at: now(),
  }),
  evidence_links: () => ({
    id: uid(),
    relation: "related",
    explanation: "",
    basis: "manual",
    confirmed: false,
    score: null,
    source_quote: "",
    target_quote: "",
    created_at: now(),
  }),
  dialogues: () => ({
    id: uid(),
    mode: "ai",
    conditions: {},
    status: "active",
    created_at: now(),
  }),
  dialogue_messages: () => ({
    id: uid(),
    citations: [],
    legal: [],
    notice: "",
    request_id: null,
    created_at: now(),
  }),
  runtime_leases: () => ({}),
  runtime_events: () => ({ revision: 1 }),
  runtime_rates: () => ({}),
  socket_tickets: () => ({}),
  voiceprints: () => ({
    id: uid(),
    samples: 1,
    aliases: [],
    created_at: now(),
  }),
  audio_sessions: () => ({
    id: uid(),
    offset: 0,
    last_sequence: -1,
    status: "active",
  }),
};
function identifier(name: string) {
  if (!/^[a-z_]+$/.test(name)) throw new Error("Invalid database identifier");
  return '"' + name + '"';
}
function decode<T>(row: Record<string, unknown>): T {
  const out = { ...row };
  for (const [key, value] of Object.entries(out)) {
    if (jsonColumns.has(key) && typeof value === "string")
      out[key] = JSON.parse(value);
    if (boolColumns.has(key) && typeof value === "number") out[key] = !!value;
  }
  return out as T;
}
export class Database {
  constructor(
    private connection: pg.Pool | pg.PoolClient | DatabaseSync,
    public postgres: boolean,
    private mutex?: Mutex,
  ) {}
  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const run = async () => {
      if (this.postgres) {
        let n = 0;
        const result = await (this.connection as pg.Pool).query(
          sql.replace(/\?/g, () => "$" + ++n),
          params,
        );
        return result.rows.map((row) => decode<T>(row));
      }
      const args = params.map((value) =>
        typeof value === "boolean" ? Number(value) : value,
      );
      const statement = (this.connection as DatabaseSync).prepare(sql);
      return statement
        .all(...(args as (string | number | null | Uint8Array)[]))
        .map((row) => decode<T>(row));
    };
    return this.mutex ? this.mutex.run(run) : run();
  }
  async all<K extends keyof Tables>(
    table: K,
    where = "1=1",
    params: unknown[] = [],
    tail = "",
  ): Promise<Tables[K][]> {
    return this.query(
      `SELECT * FROM jude_${table} WHERE ${where} ${tail}`,
      params,
    );
  }
  async one<K extends keyof Tables>(
    table: K,
    where: string,
    params: unknown[] = [],
  ): Promise<Tables[K] | undefined> {
    return (await this.all(table, where, params, "LIMIT 1"))[0];
  }
  async insert<K extends keyof Tables>(
    table: K,
    values: Partial<Tables[K]>,
  ): Promise<Tables[K]> {
    const row = { ...defaults[table](), ...values },
      keys = Object.keys(row);
    const params = keys.map((k) =>
      jsonColumns.has(k) && row[k] !== null ? JSON.stringify(row[k]) : row[k],
    );
    return (
      await this.query<Tables[K]>(
        `INSERT INTO jude_${table} (${keys.map(identifier).join(",")}) VALUES (${keys.map(() => "?").join(",")}) RETURNING *`,
        params,
      )
    )[0];
  }
  async update<K extends keyof Tables>(
    table: K,
    values: Partial<Tables[K]>,
    where: string,
    params: unknown[],
  ): Promise<Tables[K][]> {
    const keys = Object.keys(values),
      row = values as Record<string, unknown>;
    return this.query(
      `UPDATE jude_${table} SET ${keys.map((k) => identifier(k) + "=?").join(",")} WHERE ${where} RETURNING *`,
      [
        ...keys.map((k) =>
          jsonColumns.has(k) && row[k] !== null
            ? JSON.stringify(row[k])
            : row[k],
        ),
        ...params,
      ],
    );
  }
  async remove<K extends keyof Tables>(
    table: K,
    where: string,
    params: unknown[] = [],
  ) {
    return this.query(
      `DELETE FROM jude_${table} WHERE ${where} RETURNING *`,
      params,
    );
  }
  async transaction<T>(operation: (tx: Database) => Promise<T>): Promise<T> {
    if (this.postgres) {
      const client = await (this.connection as pg.Pool).connect();
      try {
        await client.query("BEGIN");
        const result = await operation(new Database(client, true));
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    const run = async () => {
      const db = this.connection as DatabaseSync;
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = await operation(new Database(db, false));
        db.exec("COMMIT");
        return result;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    };
    return this.mutex ? this.mutex.run(run) : run();
  }
  async close() {
    if (this.postgres) await (this.connection as pg.Pool).end();
    else (this.connection as DatabaseSync).close();
  }
}
/**
 * The app runs as one server process, so work that was in flight when it stopped can never
 * finish: mark it interrupted (retryable) and close live sessions. Call once per process.
 */
export async function resetInterruptedWork(db: Database) {
  await db.update(
    "segments",
    {
      analysis_state: "interrupted",
      analysis_error: "Analysis was interrupted. Retry this statement.",
    },
    "analysis_state IN ('queued','extracting','retrieving','analyzing','reviewing','synthesizing')",
    [],
  );
  await db.update(
    "cases",
    { status: "paused" },
    "status IN ('live','simulation')",
    [],
  );
  await db.update(
    "hearings",
    { status: "paused" },
    "status IN ('live','simulation')",
    [],
  );
  await db.update("audio_sessions", { status: "closed" }, "status=?", [
    "active",
  ]);
}
export async function connectDatabase(config: Settings) {
  if (config.databaseUrl) {
    return new Database(
      new pg.Pool({
        connectionString: config.databaseUrl,
        max: 4,
        idleTimeoutMillis: 1000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: true,
      }),
      true,
    );
  }
  await mkdir(config.dataDir, { recursive: true });
  const { DatabaseSync } = await import("node:sqlite");
  const connection = new DatabaseSync(join(config.dataDir, "jude.db"));
  connection.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
  // Additive compatibility with existing local Python databases.
  const columns = (table: string) =>
    connection
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((row) => row.name);
  if (
    columns("jude_segments").length &&
    !columns("jude_segments").includes("hearing_id")
  )
    connection.exec(
      "ALTER TABLE jude_segments ADD COLUMN hearing_id VARCHAR(36) REFERENCES jude_hearings(id)",
    );
  if (
    columns("jude_chunks").length &&
    !columns("jude_chunks").includes("embedding_model")
  )
    connection.exec(
      "ALTER TABLE jude_chunks ADD COLUMN embedding_model VARCHAR(200) NOT NULL DEFAULT ''",
    );
  connection.exec(localSchema);
  connection.exec(
    `CREATE TABLE IF NOT EXISTS jude_audio_sessions(id VARCHAR(36) PRIMARY KEY, case_id VARCHAR(36) NOT NULL REFERENCES jude_cases(id) ON DELETE CASCADE, hearing_id VARCHAR(36) NOT NULL REFERENCES jude_hearings(id) ON DELETE CASCADE, session_hash VARCHAR(64) NOT NULL REFERENCES jude_sessions(token_hash) ON DELETE CASCADE, offset FLOAT NOT NULL, last_sequence INTEGER NOT NULL, expires FLOAT NOT NULL, status VARCHAR(20) NOT NULL)`,
  );
  connection.exec(
    `CREATE TABLE IF NOT EXISTS jude_voiceprints(id VARCHAR(36) PRIMARY KEY, case_id VARCHAR(36) NOT NULL REFERENCES jude_cases(id) ON DELETE CASCADE, label VARCHAR(40) NOT NULL, embedding JSON NOT NULL, samples INTEGER NOT NULL, model VARCHAR(200) NOT NULL, aliases JSON NOT NULL, created_at VARCHAR(40) NOT NULL, UNIQUE(case_id, label)); CREATE INDEX IF NOT EXISTS ix_jude_voiceprints_case_id ON jude_voiceprints(case_id);`,
  );
  const db = new Database(connection, false, new Mutex());
  // One local development process owns these jobs.
  await resetInterruptedWork(db);
  const legacyCases = await db.query<{ case_id: string }>(
    "SELECT DISTINCT case_id FROM jude_segments WHERE hearing_id IS NULL",
  );
  for (const { case_id } of legacyCases) {
    const hearing = await db.insert("hearings", {
      case_id,
      title: "Earlier hearing",
    });
    await db.update(
      "segments",
      { hearing_id: hearing.id },
      "case_id=? AND hearing_id IS NULL",
      [case_id],
    );
  }
  return db;
}
