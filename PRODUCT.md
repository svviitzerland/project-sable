# Jude

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Lawyers working on Indonesian criminal proceedings. The initial product scenario is a simulated hearing using synthetic or appropriately authorized documents and audio. Operational prosecutor and judge workspaces are outside the initial scope; courtroom practice lets a lawyer rehearse as defense counsel, opposing counsel, or judge.

## Product Purpose

Connect courtroom statements with case-specific evidence and relevant Indonesian legal references so lawyers can independently examine potential inconsistencies and prepare better-informed questions.

## Positioning

An evidence-grounded courtroom copilot that continuously connects testimony to source material, rather than requiring a lawyer to repeatedly supply context to a general-purpose chatbot.

## Operating Context

Lawyers listen to testimony while consulting investigation reports, witness statements, evidence, and legislation. Source provenance, uncertainty, and human judgment must remain explicit.

## Capabilities and Constraints

The supplied brief proposes live transcription and speaker attribution, contextual claim extraction, case-filtered retrieval, legal-reference lookup, bounded adversarial review, and progressive findings. The local workspace implements these MVP paths; external provider integrations still require validation with real accounts. Findings use Supported, Potential Inconsistency, Context Needed, and Insufficient Evidence statuses. Never equate an inconsistency with dishonesty or a finding with guilt.

The current deliverable is the working lawyer workspace at `/workspace`, alongside the preserved marketing introduction at `/`. It includes authenticated cases, document ingestion and originals, saved transcripts, qualified source-linked findings, review notes with unsaved-change feedback, speaker labels, searchable transcripts, review progress and queue navigation, a dedicated hearing library with reviewed file imports, portable `.jude` archives, and an evidence graph with natural-language search. Optional OpenRouter models convert unfamiliar readable transcripts, embed evidence, suggest relationships, and answer with source quotations. A clearly labeled synthetic hearing runs without providers. Speechmatics, OpenRouter, Pasal.id, and Supabase integration paths are implemented; live service verification remains outstanding. Local SQLite/private files and PostgreSQL/pgvector migrations are verified.

Case assistant conversations retrieve across the current case's documents, hearings, findings, and confirmed evidence connections. Users can reference material, inspect quotations, ask follow-up questions, and optionally request legal discovery. Courtroom practice supports AI-suggested, manually editable trial conditions, three user roles, saved dialogue, and a debrief. Hypothetical practice stays outside the evidence record. Without configured providers, the assistant exposes sources and practice offers clearly labeled scripted drills.

The hosted target is Vercel for both Next.js and FastAPI. Supabase supplies durable data, shared coordination, and private file transfers; QStash delivers bounded analysis jobs. Deployment configuration and local cross-instance tests are supplied. Live hosted validation is still required.

## Brand Commitments

Name: Jude. The user approved a calm editorial visual direction using warm paper, deep forest green, large serif headlines, and a source-linked testimony example. Voice: precise, composed, useful to legal professionals.

## Evidence on Hand

The user supplied a detailed product brief titled “Jude - Evidence-Grounded AI for Courtroom Intelligence.” There are no supplied customer testimonials, launch dates, pricing, performance measurements, logo files, or production product screenshots. Avoid inventing these. The brief's contextual statistics are not needed for this website and have not been independently verified.

## Product Principles

- Trace substantive findings back to inspectable sources.
- Distinguish direct support, possible inconsistencies, and unresolved context.
- Keep legal decisions with responsible professionals.
- Preserve attention during proceedings.

## Open Decisions

Launch timing, pilot enrollment, commercial terms, and production privacy/security commitments are not established.
