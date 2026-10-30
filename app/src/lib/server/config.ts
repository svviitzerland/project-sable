import { resolve } from "node:path";
export function settings(
  env: Record<string, string | undefined> = process.env,
) {
  const hosted = env.VERCEL === "1" || env.JUDE_RUNTIME === "vercel";
  const production = hosted || env.JUDE_ENV === "production";
  const databaseUrl = (env.DATABASE_URL || "").replace(
    "postgresql+psycopg://",
    "postgresql://",
  );
  const appUrl = (env.JUDE_APP_URL || "").replace(/\/$/, "");
  if (hosted) {
    if (!/^postgres(ql)?:\/\//.test(databaseUrl))
      throw new Error("Vercel requires a PostgreSQL DATABASE_URL.");
    for (const name of [
      "JUDE_APP_URL",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "QSTASH_TOKEN",
      "QSTASH_CURRENT_SIGNING_KEY",
      "QSTASH_NEXT_SIGNING_KEY",
      "CRON_SECRET",
    ]) {
      if (!env[name]) throw new Error(`Missing deployment setting: ${name}`);
    }
    if (
      !appUrl.startsWith("https://") ||
      !env.SUPABASE_URL?.startsWith("https://")
    )
      throw new Error("Hosted app and storage URLs must use HTTPS.");
  }
  return {
    hosted,
    production,
    databaseUrl,
    appUrl,
    dataDir: resolve(env.JUDE_DATA_DIR || (hosted ? "/tmp/jude" : ".data")),
    origins: (env.ALLOWED_ORIGINS || appUrl).split(",").filter(Boolean),
    supabaseUrl: (env.SUPABASE_URL || "").replace(/\/$/, ""),
    storageKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
    bucket: env.SUPABASE_STORAGE_BUCKET || "jude-documents",
    openrouterKey: env.OPENROUTER_API_KEY || "",
    model: env.OPENROUTER_MODEL || "",
    embeddingModel:
      env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small",
    speechKey: env.SPEECHMATICS_API_KEY || "",
    speechUrl: env.SPEECHMATICS_URL || "wss://eu.rt.speechmatics.com/v2",
    pasalKey: env.PASAL_API_KEY || "",
    qstashUrl: (env.QSTASH_URL || "https://qstash.upstash.io").replace(
      /\/$/,
      "",
    ),
    qstashToken: env.QSTASH_TOKEN || "",
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY || "",
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY || "",
    cronSecret: env.CRON_SECRET || "",
    simulationDelay: Number(env.JUDE_SIMULATION_DELAY || "2.5") * 1000,
  };
}
export type Settings = ReturnType<typeof settings>;
