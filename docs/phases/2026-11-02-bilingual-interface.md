# 2026-11-02 — Bilingual interface (Bahasa Indonesia and English)

## Scope

- Dependency-free i18n in `apps/web/src/lib/i18n/`: `en.ts` defines the keys, `id.ts` must provide every key (`Messages` type, so a missing or extra key fails `pnpm typecheck`), `core.ts` holds detection, interpolation (`{name}`), plurals (`.one`/`.other` via `Intl.PluralRules`) and `Intl` date/number formatting, `index.svelte.ts` holds the reactive language (`$state`) with `t()`, `tp()`, `formatDate()`, `setLang()`.
- `hooks.server.ts` resolves the language (cookie `lang`, else `Accept-Language`, else Indonesian), stores it in `locals.lang` and fills `<html lang>` through `transformPageChunk`; `+layout.server.ts` passes it to the root layout, which sets it before children render so the server render and hydration match. A localStorage preference applies when no cookie exists.
- `LanguageToggle.svelte` ("ID | EN", `aria-pressed` buttons in a labelled group) in the landing header, the sign-in panel and the workspace top bar. Switching updates the page in place, the cookie, localStorage and `<html lang>`.
- All strings in `src/routes` and `src/components`, the landing demo examples (`jude-demo.ts`), client audio errors and client-mapped server errors are translated. Finding statuses: Didukung sumber, Berbeda dari sumber, Perlu konteks, Bukti belum cukup. Practice stage/difficulty/role enum values are unchanged; only their labels are translated. Practice free-text defaults, including `language`, follow the UI language.
- Phone layout: the workspace About link becomes icon-only below 640px so the breadcrumb keeps room.

## Remaining English

- Server `detail` messages not in the client map in `workspace-api.ts` (uncommon validation and provider errors).
- Server-generated text: evidence graph and import notices, Pasal.id metadata and statuses, synthetic case/hearing content and finding text, scripted guided-drill prompts, model output (follows the testimony language).
- Exported files (`.jude`, conversation JSON).

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (new `tests/i18n.test.ts`: identical key sets, no empty values, matching placeholders, plural pairs, agreed status labels, language detection, `Intl` formatting) and `pnpm build` pass.
- Playwright: existing suite runs with `locale: "en-US"`; new `tests/browser/i18n.spec.ts` covers Indonesian default for `id-ID`, toggle switching, cookie persistence across pages and reloads, English default for `en-GB`, and no horizontal overflow at 1440/1024/768/390 px. Indonesian landing, evidence, hearings, hearing review, practice, assistant and documents screens were spot-checked at desktop and phone widths.
