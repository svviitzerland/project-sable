# Jude product spec

## Problem and users

Lawyers in Indonesian criminal proceedings must follow testimony while comparing investigation documents, statements, and legal references. Jude keeps testimony, qualified findings, and inspectable evidence together. Lawyers retain judgment; the system does not determine guilt, credibility, truthfulness, or legal outcomes.

## Delivered MVP

The marketing introduction remains at `/`. `/workspace` provides account registration/sign-in, isolated cases, document ingestion/search/original download, transcript capture, progressive source-linked findings, independent-review details, review notes, speaker labels, legal discovery, provider status, and JSON export.

Local SQLite and private files work without external accounts. Optional PostgreSQL/pgvector and private Supabase Storage paths are supplied. Speechmatics and OpenRouter integrations are implemented with protocol/contract tests; no live provider credentials were available for verification. Pasal.id responses remain discovery metadata, separate from case evidence.

The synthetic hearing is a complete authored exercise: two documents, eight turns, four qualified finding states. It does not claim to measure AI quality. Manual testimony without a configured AI provider is saved with an explicit unavailable state.

## Acceptance

- [x] Registration, sign-in/out, persistent account sessions and isolated cases.
- [x] Upload authorized text-based PDF/DOCX/TXT/Markdown, preserve originals and provenance.
- [x] Case-filtered keyword retrieval; optional embeddings and pgvector, with fallback.
- [x] Continuous transcript capture independent of bounded four-call analysis.
- [x] Independent reviewer receives original assertion/evidence without the analyst response.
- [x] Reject invalid citations and unsupported source relationships before publishing.
- [x] Review all four statuses, exact quotations, uncertainties, alternatives, verification steps, and suggested questions.
- [x] Persist notes/review state, label known speakers, export a portable case record.
- [x] Show missing-provider states without invented analysis or law.
- [x] Reproducible evaluation with precision/recall, citation checks, failures, latency, optional WER and human unsupported-conclusion annotations.
- [x] Desktop/mobile keyboard and workflow verification.
- [ ] Authorized real Speechmatics, OpenRouter, Pasal.id and hosted Supabase validation.

## Constraints and decisions

One backend worker; in-process tasks are recoverable by manual retry after restart, not durable distributed jobs. Sessions are application-owned, not Supabase Auth. Backend ownership checks protect every case route. No OCR, native courtroom recording, account recovery, multi-user case sharing, speaker identity inference, or prosecutor/judge workflow. Configured providers receive relevant material; no unverified privacy, accuracy, latency, customer, or commercial claims.

Original brief: “Jude - Evidence-Grounded AI for Courtroom Intelligence.” The portable scope and implementation map are recorded in `docs/artifacts/phases/2026-10-30-product-handoff.md`; its initial failure list is superseded by the completion record.
