import * as env from "$app/env/private";
import { settings } from "../../../../lib/server/config";
import {
  connectDatabase,
  resetInterruptedWork,
} from "../../../../lib/server/database";
import type { Runtime } from "../../../../lib/server/runtime";
import { handleApi } from "../../../../lib/server/api";
import type { RequestHandler } from "./$types";
let runtime: Promise<Runtime> | undefined;
function getRuntime() {
  return (runtime ??= (async (): Promise<Runtime> => {
    const config = settings(env);
    const db = await connectDatabase(config);
    // SQLite resets inside connectDatabase; PostgreSQL resets here, once per server process.
    if (db.postgres) await resetInterruptedWork(db);
    return {
      config,
      db,
      fetch,
      tasks: new Set(),
    };
  })().catch((error) => {
    runtime = undefined;
    throw error;
  }));
}
// Behind Caddy the address comes from X-Forwarded-For (ADDRESS_HEADER). Internal callers
// such as the container health check have no proxy header; treat them as local.
function clientAddress(read: () => string) {
  try {
    return read();
  } catch {
    return "local";
  }
}
const handle: RequestHandler = async ({ request, getClientAddress }) => {
  return handleApi(
    await getRuntime(),
    request,
    clientAddress(getClientAddress),
  );
};
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
