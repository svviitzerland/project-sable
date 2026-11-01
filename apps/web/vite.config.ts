import { sveltekit } from "@sveltejs/kit/vite";
import node from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      preprocess: vitePreprocess(),
      // The production Docker image runs this Node server with `node build`.
      adapter: node({ out: "build" }),
    }),
  ],
});
