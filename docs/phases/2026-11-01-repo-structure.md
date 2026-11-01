# 2026-11-01 — Repository structure, local Supabase, published transcript layouts

## Scope

- Layout: `app/` → `apps/web`, `voice/` → `apps/voice`, `app/migrations` → `supabase/migrations`; docs grouped into `docs/product`, `docs/engineering`, `docs/research`, `docs/phases` (from `docs/artifacts/phases`); root `reports/` and `research_notes/` moved into `docs/research/<topic>/`. Vercel Root Directory is now `apps/web`.
- Local Supabase: `supabase/config.toml` (project `jude`; realtime, edge runtime, analytics, SMTP and seeding disabled). `supabase start` applies the migrations; `.env.example` documents the local URLs.
- Hearing import reads speaker-turn transcripts as published (risalah PDFs, court-style records, timestamped notes) without AI; the 100,000-character limit now applies only to AI conversion.
- Voice evaluation on a real public hearing (MK Perkara 115/PUU-XXII/2024) and a 3-second minimum clip for live voice matching.

## Verification

- `supabase start` on Colima applied migrations 001–007. The PostgreSQL suite passed against a `jude_test` database on that server (migrations twice, RLS denial including `jude_voiceprints`, vectors, locks, rates, jobs).
- Against local Supabase: account, case, upload of the 29-page MK risalah PDF to Storage with a byte-identical original download, native hearing preview and import (112 turns), document search.
- `apps/web`: lint, typecheck, 32 Node tests pass. `apps/voice`: 8 pytest cases, ruff clean.
- Voice matching on the MK hearing audio: 3 s windows 96–100% correct, 6 s windows 100% with 7 voices for 6 speakers (one speaker joined both in the room and online).

## Not verified

- Hosted Supabase `db push`, Vercel deployment from `apps/web`, Playwright suites after the move.
- Criminal-court recordings (Sambo/Jessica sessions listed in `docs/research/dataset-kasus-indonesia/SOURCES.md`); the 796/Pid.B/2022 putusan PDF needs a manual download (Cloudflare).
