import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// Relative base so the build works from any static server or sub-path (tunnels, file previews).
// Fonts are read from apps/web/static/fonts, so the dev server may serve files two levels up.
// Any host may load it (tunnels, LAN devices): the mockup is static, synthetic and holds no secrets.
export default defineConfig({
  base: "./",
  plugins: [svelte()],
  server: { fs: { allow: ["../.."] }, allowedHosts: true },
  preview: { allowedHosts: true },
});
