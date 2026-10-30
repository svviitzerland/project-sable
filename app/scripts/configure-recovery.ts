import { Client } from "@upstash/qstash";
import { createHash } from "node:crypto";
const { JUDE_APP_URL, QSTASH_TOKEN, CRON_SECRET } = process.env;
if (!JUDE_APP_URL?.startsWith("https://") || !QSTASH_TOKEN || !CRON_SECRET)
  throw new Error("Set JUDE_APP_URL (https), QSTASH_TOKEN, and CRON_SECRET.");
const destination =
  JUDE_APP_URL.replace(/\/$/, "") + "/api/v1/internal/recover";
const scheduleId =
  "jude-recovery-" +
  createHash("sha256").update(destination).digest("hex").slice(0, 16);
const client = new Client({
  token: QSTASH_TOKEN,
  baseUrl: process.env.QSTASH_URL || undefined,
});
await client.schedules.create({
  scheduleId,
  destination,
  method: "GET",
  cron: process.env.JUDE_RECOVERY_CRON || "*/15 * * * *",
  headers: { Authorization: `Bearer ${CRON_SECRET}` },
  retries: 3,
  timeout: "240s",
  redact: { header: ["Authorization"] },
});
console.log(`Recovery schedule configured: ${scheduleId}`);
