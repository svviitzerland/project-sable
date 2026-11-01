import { sveltekit } from "@sveltejs/kit/vite";
import vercel from "@sveltejs/adapter-vercel";
import node from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      preprocess: vitePreprocess(),
      // AWS (Docker on EC2) uses the Node server; JUDE_ADAPTER=vercel keeps Vercel builds.
      adapter:
        process.env.JUDE_ADAPTER === "vercel"
          ? vercel({ runtime: "nodejs24.x", maxDuration: 300 })
          : node({ out: "build" }),
    }),
  ],
});
