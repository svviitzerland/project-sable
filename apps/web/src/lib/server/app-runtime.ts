import * as env from "$app/env/private";
import { settings } from "./config";
import { connectDatabase, resetInterruptedWork } from "./database";
import type { Runtime } from "./runtime";

let runtime: Promise<Runtime> | undefined;

/** One runtime per server process, shared by the API endpoint and page loads. */
export function getRuntime() {
  return (runtime ??= (async (): Promise<Runtime> => {
    const config = settings(env);
    const db = await connectDatabase(config);
    // SQLite resets inside connectDatabase; PostgreSQL resets here, once per server process.
    if (db.postgres) await resetInterruptedWork(db);
    return { config, db, fetch, tasks: new Set() };
  })().catch((error) => {
    runtime = undefined;
    throw error;
  }));
}
