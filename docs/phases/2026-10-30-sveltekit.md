# SvelteKit migration — 2026-10-30

User direction: refactor the existing product frontend to Svelte while retaining the existing PR #2 branch and Vercel target.

## Delivered

- Replaced the Next.js/React frontend with native Svelte 5 components and SvelteKit 3 routes. No React runtime or JSX remains. The API stays FastAPI.
- Split the original large workspace modules into focused case, document, hearing, transcript, evidence, authentication, and dialogue components. State uses runes; derived views, keyed identities, listener cleanup, and async request guards preserve case workflow behavior.
- Preserved the approved landing composition, fonts, images, CSS, finite smooth animation, reduced-motion behavior, keyboard navigation, mobile layouts, and no-JavaScript landing content.
- Ported microphone/prepared-audio capture to a Svelte lifecycle controller, retaining ticketed socket rotation, buffered PCM, timeline continuity, and final stop. Static assets moved from `public/` to `static/`.
- Added the SvelteKit same-origin HTTP proxy for cookies, multipart bodies, downloads, status codes, and signed-download redirects. Direct WebSockets retain authenticated single-use tickets.
- Configured the current SvelteKit Vite-based setup, TypeScript 6, native Svelte icons, and Vercel adapter. Updated framework selection and environment instructions: `PUBLIC_API_WS_URL` and `PUBLIC_HOSTED_UPLOADS` replace `NEXT_PUBLIC_*`; `API_INTERNAL_URL` stays private.
- Kept recovery scheduling, Supabase, QStash, backend migrations, and backend API contracts unchanged. The every-minute recovery cron still requires an appropriate plan or a separately implemented scheduler alternative.

## Verification

- Frontend lint and Svelte/TypeScript checks passed with zero errors and warnings; dependency peer checks passed.
- Production build generated Vercel Node.js 22 functions with a 300-second limit.
- All four Chromium acceptance suites passed: landing, workspace, assistant/practice, and hosted transports. They cover desktop/mobile appearance, four landing widths, reduced motion, no-JavaScript navigation, account sessions, uploads/downloads, hearing import/review, `.jude` round-trips, evidence search/connections, dialogue history, configurable guided practice, 4 MB staged upload, and mocked audio rotation/final stop. No page errors were reported.
- The landing navigation assertion now verifies the resolved URL and actually follows the link without JavaScript, accepting SvelteKit's equivalent relative SSR href.
- Browser review caught and fixed a save callback reading a cleared finding selection; it now keeps the saved finding ID. It also caught a removed global CSS import, which was restored before final verification.
- Both PCM worklet tests passed. Backend: 58 tests passed, one optional PostgreSQL test skipped; Ruff passed. PostgreSQL-specific changes were not part of this migration.
- Rendered landing, desktop workspace, and mobile assistant captures were inspected. Screenshots are local ignored acceptance artifacts, not product claims.

No live deployment or credential-backed provider check was performed. Vercel and external service credentials remain unavailable here. Original unrelated worktree edits were preserved.
