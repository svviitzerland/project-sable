import type { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import type { S3Client } from "@aws-sdk/client-s3";
import {
  createHash,
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
} from "node:crypto";
import type { Settings } from "./config";
import { Database, seconds, uid } from "./database";
import { HttpError, assert } from "./errors";
import type { User } from "./contracts";
export interface Runtime {
  config: Settings;
  db: Database;
  fetch: typeof fetch;
  tasks: Set<Promise<unknown>>;
  simulations: Map<string, AbortController>;
  /** Test seam: replaces the Bedrock client. */
  bedrock?: { send: BedrockRuntimeClient["send"] };
  /** Test seam: replaces the S3 client. */
  s3?: { send: S3Client["send"] };
}
export const hash = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
export const COOKIE = "jude_session";
export async function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  const digest = await new Promise<Buffer>((resolve, reject) =>
    derive(
      password,
      Buffer.from(salt, "hex"),
      64,
      { N: 16384, r: 8, p: 1 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
  return `${salt}:${digest.toString("hex")}`;
}
export async function checkPassword(password: string, stored: string) {
  try {
    const [salt, digest] = stored.split(":");
    if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(digest))
      return false;
    const candidate = await hashPassword(password, salt);
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(stored));
  } catch {
    return false;
  }
}
export function cookieToken(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(COOKIE + "="))
      ?.slice(COOKIE.length + 1) || ""
  );
}
export async function authenticate(app: Runtime, request: Request) {
  const token = cookieToken(request);
  assert(token, 401, "Sign in to continue");
  const session = await app.db.one("sessions", "token_hash=?", [hash(token)]);
  assert(
    session && session.expires > seconds(),
    401,
    "Session expired. Please sign in again.",
  );
  const user = await app.db.one("users", "id=?", [session.user_id]);
  assert(user, 401, "Sign in to continue");
  return user;
}
export async function sessionCookie(app: Runtime, user: User) {
  const token = randomBytes(32).toString("base64url");
  await app.db.insert("sessions", {
    token_hash: hash(token),
    user_id: user.id,
    expires: seconds() + 43200,
  });
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${app.config.production ? "; Secure" : ""}`;
}
export function publicUser(user: User) {
  const { id, name, email, demo } = user;
  return { id, name, email, demo };
}
export async function ownedCase(app: Runtime, id: string, userId: string) {
  const row = await app.db.one("cases", "id=? AND owner_id=?", [id, userId]);
  assert(row, 404, "Case not found");
  return row;
}
export async function hearingFor(
  app: Runtime,
  caseId: string,
  id?: string | null,
) {
  if (id) {
    const h = await app.db.one("hearings", "id=? AND case_id=?", [id, caseId]);
    assert(h, 404, "Hearing not found");
    return h;
  }
  const rows = await app.db.all(
    "hearings",
    "case_id=?",
    [caseId],
    "ORDER BY created_at DESC LIMIT 1",
  );
  return (
    rows[0] ||
    app.db.insert("hearings", { case_id: caseId, title: "Hearing record" })
  );
}
export async function rate(app: Runtime, key: string, limit = 15, period = 60) {
  const bucket = Math.floor(seconds() / period);
  const rows = await app.db.query(
    "INSERT INTO jude_runtime_rates (key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=jude_runtime_rates.hits+1 WHERE jude_runtime_rates.hits<? RETURNING hits",
    [hash(`${key}:${period}:${bucket}`), (bucket + 1) * period, limit],
  );
  assert(rows.length, 429, "Too many requests. Wait a minute and try again.");
}
export async function acquire(app: Runtime, key: string, ttl = 330) {
  const owner = uid();
  const rows = await app.db.query<{ owner: string }>(
    "INSERT INTO jude_runtime_leases (key,owner,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE jude_runtime_leases.expires<? RETURNING owner",
    [key, owner, seconds() + ttl, seconds()],
  );
  assert(
    rows[0]?.owner === owner,
    409,
    "This operation is already running. Wait for it to finish and retry.",
  );
  return async () => {
    await app.db.remove("runtime_leases", "key=? AND owner=?", [key, owner]);
  };
}
export async function locked<T>(
  app: Runtime,
  key: string,
  work: () => Promise<T>,
) {
  const release = await acquire(app, key);
  try {
    return await work();
  } finally {
    await release();
  }
}
export async function publish(
  app: Runtime,
  caseId: string,
  payload: Record<string, unknown>,
) {
  await app.db.query(
    "INSERT INTO jude_runtime_events (case_id,revision,payload) VALUES (?,1,?) ON CONFLICT(case_id) DO UPDATE SET revision=jude_runtime_events.revision+1,payload=excluded.payload",
    [caseId, JSON.stringify(payload)],
  );
}
export function schedule(app: Runtime, task: Promise<unknown>) {
  assert(!app.config.hosted, 500, "Hosted work requires durable job delivery.");
  app.tasks.add(task);
  void task.catch(() => undefined).finally(() => app.tasks.delete(task));
}
export function safeError(error: unknown, fallback: string) {
  return error instanceof HttpError ? error.message : fallback;
}
export async function boundedBody(
  request: Request,
  limit = 64 * 1024 * 1024 + 65536,
) {
  if (Number(request.headers.get("content-length") || "0") > limit)
    throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let size = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large.");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(parts);
}
