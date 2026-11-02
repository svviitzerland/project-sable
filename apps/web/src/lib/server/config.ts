import { resolve } from "node:path";
export function settings(
  env: Record<string, string | undefined> = process.env,
) {
  const production = env.JUDE_ENV === "production";
  const databaseUrl = (env.DATABASE_URL || "").replace(
    "postgresql+psycopg://",
    "postgresql://",
  );
  const appUrl = (env.JUDE_APP_URL || "").replace(/\/$/, "");
  return {
    production,
    // The labeled synthetic demo case: always in development, opt-in in production.
    demo: !production || env.JUDE_DEMO === "1",
    databaseUrl,
    appUrl,
    dataDir: resolve(env.JUDE_DATA_DIR || ".data"),
    origins: (env.ALLOWED_ORIGINS || appUrl).split(",").filter(Boolean),
    // "bedrock" (AWS) or "openrouter"; inferred from the configured credentials.
    aiProvider: (env.AI_PROVIDER ||
      (env.BEDROCK_MODEL
        ? "bedrock"
        : env.OPENROUTER_API_KEY
          ? "openrouter"
          : "")) as "bedrock" | "openrouter" | "",
    awsRegion: env.AWS_REGION || "ap-southeast-1",
    // Screening, assistant and practice: Nova 2 Lite (global profile, the only one in
    // ap-southeast-1). Review of potential inconsistencies: a different, stronger family.
    // Benchmark and prices: docs/phases/2026-11-02-model-choice.md.
    bedrockModel: env.BEDROCK_MODEL || "global.amazon.nova-2-lite-v1:0",
    bedrockReviewModel:
      env.BEDROCK_REVIEW_MODEL || "global.moonshotai.kimi-k3",
    s3Bucket: env.S3_BUCKET || "",
    openrouterKey: env.OPENROUTER_API_KEY || "",
    model: env.OPENROUTER_MODEL || "",
    embeddingModel:
      env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small",
    // Amazon Transcribe streaming through the server's AWS credentials (on by default with
    // Bedrock; TRANSCRIBE=1 or 0 overrides).
    transcribe:
      env.TRANSCRIBE === "1" ||
      (env.TRANSCRIBE !== "0" && env.AI_PROVIDER === "bedrock"),
    pasalKey: env.PASAL_API_KEY || "",
    voiceUrl: (env.VOICE_API_URL || "").replace(/\/$/, ""),
    voiceToken: env.VOICE_API_TOKEN || "",
  };
}
export type Settings = ReturnType<typeof settings>;
/** Whether structured AI calls can run with the configured provider. */
export const aiConfigured = (config: Settings) =>
  config.aiProvider === "bedrock" || (!!config.openrouterKey && !!config.model);
/** Embeddings stay optional; retrieval falls back to keyword and full-text search. */
export const embeddingsConfigured = (config: Settings) =>
  config.aiProvider !== "bedrock" && !!config.openrouterKey;
