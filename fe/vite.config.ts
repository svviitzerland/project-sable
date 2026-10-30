import { sveltekit } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  if (
    env.VERCEL === "1" &&
    (!env.API_INTERNAL_URL?.startsWith("https://") ||
      !env.PUBLIC_API_WS_URL?.startsWith("wss://") ||
      env.PUBLIC_HOSTED_UPLOADS !== "1")
  ) {
    throw new Error(
      "Set API_INTERNAL_URL (https), PUBLIC_API_WS_URL (wss), and PUBLIC_HOSTED_UPLOADS=1 before building Jude on Vercel.",
    );
  }
  return {
    plugins: [
      tailwindcss(),
      sveltekit({
        preprocess: vitePreprocess(),
        adapter: adapter({ runtime: "nodejs22.x", maxDuration: 300 }),
      }),
    ],
    server: {
      proxy: {
        "/api": {
          target: env.API_INTERNAL_URL || "http://127.0.0.1:8000",
          ws: true,
        },
      },
    },
  };
});
