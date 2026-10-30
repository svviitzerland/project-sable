# Svelte frontend

This frontend uses Svelte 5 runes and SvelteKit. Routes are in `src/routes`, components in `src/components`, and shared browser logic in `src/lib`. Preserve the existing case workflow and visual identity when refactoring.

Use native Svelte components, `$state`/`$derived` and lifecycle cleanup. HTTP API calls use `/api/v1` through `src/hooks.server.ts`; development also proxies WebSockets with Vite. Hosted sockets use `PUBLIC_API_WS_URL` and single-use tickets. Keep private credentials out of `PUBLIC_*` variables.

Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and the relevant browser acceptance suites before shipping. Static assets live in `static/`. Vercel uses the SvelteKit preset and `@sveltejs/adapter-vercel`.
