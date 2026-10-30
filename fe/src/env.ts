import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  API_INTERNAL_URL: { schema: (value) => value || "http://127.0.0.1:8000" },
  PUBLIC_API_WS_URL: { public: true, schema: (value) => value || "" },
  PUBLIC_HOSTED_UPLOADS: { public: true, schema: (value) => value || "" },
});
