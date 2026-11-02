# SvelteKit application

This folder contains both the Svelte 5 frontend and TypeScript backend. Preserve the existing case workflow and visual identity. Use native components, runes and lifecycle cleanup.

HTTP calls use same-origin `/api/v1`; its endpoint delegates to `src/lib/server`. SSE carries case updates. Browser speech connects directly to Amazon Transcribe streaming through a short-lived presigned URL minted by the API, then posts finalized transcript batches. Keep all permanent keys in private `src/env.ts` declarations.

Use Node 24. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and relevant `pnpm test:e2e` browser checks before shipping. Static browser worklet assets live in `static/audio/`. `@sveltejs/adapter-node` builds the Node server that the `Dockerfile` packages for production (see `infra/README.md`).
