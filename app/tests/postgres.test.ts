import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { settings } from "../src/lib/server/config";
import { connectDatabase } from "../src/lib/server/database";
import {
  type Runtime,
  acquire,
  rate,
  publish,
} from "../src/lib/server/runtime";
import { ingest } from "../src/lib/server/documents";
import { retrieve } from "../src/lib/server/retrieval";
import { stageJob } from "../src/lib/server/jobs";

test(
  "PostgreSQL migrations, RLS, vector sync, shared locks, rates, jobs and persistence",
  { skip: !process.env.JUDE_TEST_DATABASE_URL },
  async () => {
    const url = process.env.JUDE_TEST_DATABASE_URL!;
    assert.ok(new URL(url).pathname.startsWith("/jude_test"));
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    const dir = await mkdtemp(join(tmpdir(), "jude-pg-"));
    let first: Runtime | undefined, second: Runtime | undefined;
    try {
      await client.query(
        "DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$; DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$; CREATE SCHEMA IF NOT EXISTS storage; CREATE TABLE IF NOT EXISTS storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);",
      );
      const migrations = (
        await readdir(new URL("../migrations/", import.meta.url))
      )
        .filter((f) => f.endsWith(".sql"))
        .sort();
      for (let repeat = 0; repeat < 2; repeat++)
        for (const migration of migrations)
          await client.query(
            await readFile(
              new URL(`../migrations/${migration}`, import.meta.url),
              "utf8",
            ),
          );
      const bucket = (
        await client.query(
          "SELECT public,file_size_limit FROM storage.buckets WHERE id='jude-documents'",
        )
      ).rows[0];
      assert.equal(bucket.public, false);
      assert.equal(Number(bucket.file_size_limit), 67108864);
      for (const role of ["anon", "authenticated"]) {
        await client.query(`SET ROLE ${role}`);
        for (const table of [
          "jude_chunks",
          "jude_dialogues",
          "jude_analysis_jobs",
          "jude_audio_sessions",
          "jude_file_transfers",
        ])
          await assert.rejects(
            client.query(`SELECT * FROM ${table}`),
            /permission denied/,
          );
        await client.query("RESET ROLE");
      }
      const config = settings({
          DATABASE_URL: url,
          JUDE_DATA_DIR: dir,
          OPENROUTER_API_KEY: "fake",
        }),
        fetcher: typeof fetch = async (_input, init) => {
          const payload = JSON.parse(String(init?.body));
          return Response.json({
            data: payload.input.map((_: string, index: number) => ({
              index,
              embedding: [1, ...Array(1535).fill(0)],
            })),
          });
        };
      first = {
        config,
        db: await connectDatabase(config),
        fetch: fetcher,
        tasks: new Set(),
        simulations: new Map(),
      };
      second = { ...first, db: await connectDatabase(config) };
      const user = await first.db.insert("users", {
          email: `pg-${randomUUID()}@example.test`,
          name: "PG test",
          password_hash: "disabled",
        }),
        record = await first.db.insert("cases", {
          owner_id: user.id,
          title: "Postgres case",
        }),
        other = await first.db.insert("cases", {
          owner_id: user.id,
          title: "Other case",
        });
      await ingest(
        first,
        record,
        "one.txt",
        new TextEncoder().encode("The guard arrived at eight."),
      );
      await ingest(
        first,
        other,
        "two.txt",
        new TextEncoder().encode("An unrelated guard arrived at ten."),
      );
      const results = await retrieve(second, record.id, "guard");
      assert.equal(results.mode, "hybrid");
      assert.equal(results.results.length, 1);
      assert.match(results.results[0].text, /eight/);
      assert.equal(
        (
          await client.query(
            "SELECT extensions.vector_dims(embedding_vector) AS dims FROM jude_chunks WHERE case_id=$1",
            [record.id],
          )
        ).rows[0].dims,
        1536,
      );
      const release = await acquire(first, `test:${record.id}`);
      await assert.rejects(
        acquire(second, `test:${record.id}`),
        /already running/,
      );
      await release();
      await (
        await acquire(second, `test:${record.id}`)
      )();
      await rate(first, `test:${record.id}`, 1);
      await assert.rejects(rate(second, `test:${record.id}`, 1), /Too many/);
      await publish(first, record.id, { type: "document" });
      assert.equal(
        (await second.db.one("runtime_events", "case_id=?", [record.id]))
          ?.payload.type,
        "document",
      );
      const hearing = await first.db.insert("hearings", {
        case_id: record.id,
        title: "Hearing",
      });
      await first.db.transaction(async (db) => {
        const segment = await db.insert("segments", {
          case_id: record.id,
          hearing_id: hearing.id,
          text: "Saved testimony.",
        });
        await stageJob(db, segment.id);
      });
      assert.ok((await second.db.all("analysis_jobs")).length);
      await first.db.remove("cases", "owner_id=?", [user.id]);
      await first.db.remove("users", "id=?", [user.id]);
    } finally {
      await first?.db.close();
      await second?.db.close();
      await client.end();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
