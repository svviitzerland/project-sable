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
    if (env.VOICE_API_URL && !env.VOICE_API_URL.startsWith("https://"))
      throw new Error("Hosted VOICE_API_URL must use HTTPS.");
    if (
      !appUrl.startsWith("https://") ||
      !env.SUPABASE_URL?.startsWith("https://")
    )
      throw new Error("Hosted app and storage URLs must use HTTPS.");
  }
  return {
    hosted,
    production,
    // The labeled synthetic demo case: always in development, opt-in in production.
    demo: !production || env.JUDE_DEMO === "1",
    databaseUrl,
    appUrl,
    dataDir: resolve(env.JUDE_DATA_DIR || (hosted ? "/tmp/jude" : ".data")),
    origins: (env.ALLOWED_ORIGINS || appUrl).split(",").filter(Boolean),
    supabaseUrl: (env.SUPABASE_URL || "").replace(/\/$/, ""),
    storageKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
    bucket: env.SUPABASE_STORAGE_BUCKET || "jude-documents",
    // "bedrock" (AWS) or "openrouter"; inferred from the configured credentials.
    aiProvider: (env.AI_PROVIDER ||
      (env.BEDROCK_MODEL
        ? "bedrock"
        : env.OPENROUTER_API_KEY
          ? "openrouter"
          : "")) as "bedrock" | "openrouter" | "",
    awsRegion: env.AWS_REGION || "ap-southeast-1",
    // Screening and drafting: cheap model kept in APAC regions. Review: a different family.
    bedrockModel: env.BEDROCK_MODEL || "apac.amazon.nova-lite-v1:0",
    bedrockReviewModel:
      env.BEDROCK_REVIEW_MODEL ||
      "global.anthropic.claude-haiku-4-5-20251001-v1:0",
    s3Bucket: env.S3_BUCKET || "",
    openrouterKey: env.OPENROUTER_API_KEY || "",
    model: env.OPENROUTER_MODEL || "",
    embeddingModel:
      env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small",
    speechKey: env.SPEECHMATICS_API_KEY || "",
    speechUrl: env.SPEECHMATICS_URL || "wss://eu.rt.speechmatics.com/v2",
    pasalKey: env.PASAL_API_KEY || "",
    voiceUrl: (env.VOICE_API_URL || "").replace(/\/$/, ""),
    voiceToken: env.VOICE_API_TOKEN || "",
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
/** Whether structured AI calls can run with the configured provider. */
export const aiConfigured = (config: Settings) =>
  config.aiProvider === "bedrock" || (!!config.openrouterKey && !!config.model);
/** Embeddings stay optional; retrieval falls back to keyword and full-text search. */
export const embeddingsConfigured = (config: Settings) =>
  config.aiProvider !== "bedrock" && !!config.openrouterKey;
