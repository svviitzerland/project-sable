import { defineEnvVars } from "@sveltejs/kit/env";
const privateValue = { schema: (value: string | undefined) => value || "" };
export const variables = defineEnvVars({
  JUDE_ENV: privateValue,
  JUDE_DEMO: privateValue,
  JUDE_APP_URL: privateValue,
  JUDE_DATA_DIR: privateValue,
  JUDE_SIMULATION_DELAY: privateValue,
  DATABASE_URL: privateValue,
  ALLOWED_ORIGINS: privateValue,
  AI_PROVIDER: privateValue,
  AWS_REGION: privateValue,
  BEDROCK_MODEL: privateValue,
  BEDROCK_REVIEW_MODEL: privateValue,
  S3_BUCKET: privateValue,
  OPENROUTER_API_KEY: privateValue,
  OPENROUTER_MODEL: privateValue,
  OPENROUTER_EMBEDDING_MODEL: privateValue,
  TRANSCRIBE: privateValue,
  PASAL_API_KEY: privateValue,
  VOICE_API_URL: privateValue,
  VOICE_API_TOKEN: privateValue,
});
