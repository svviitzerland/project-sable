# Jude

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Lawyers working on Indonesian criminal proceedings. The demonstration scenario is a real public record (Putusan 796/Pid.B/2022/PN Jkt.Sel and a broadcast hearing transcript); client work uses appropriately authorized documents and audio. Operational prosecutor and judge workspaces are outside the initial scope; courtroom practice lets a lawyer rehearse as defense counsel, opposing counsel, or judge.

## Product Purpose

Connect courtroom statements with case-specific evidence and relevant Indonesian legal references so lawyers can independently examine potential inconsistencies and prepare better-informed questions.

## Positioning

An evidence-grounded courtroom copilot that continuously connects testimony to source material, rather than requiring a lawyer to repeatedly supply context to a general-purpose chatbot.

## Operating Context

Lawyers listen to testimony while consulting investigation reports, witness statements, evidence, and legislation. Source provenance, uncertainty, and human judgment must remain explicit.

## Capabilities and Constraints

The supplied brief proposes live transcription and speaker attribution, contextual claim extraction, case-filtered retrieval, legal-reference lookup, bounded adversarial review, and progressive findings. The local workspace implements these MVP paths; external provider integrations still require validation with real accounts. Findings use Supported, Potential Inconsistency, Context Needed, and Insufficient Evidence statuses. Never equate an inconsistency with dishonesty or a finding with guilt.

The current deliverable is the working lawyer workspace at `/workspace`, alongside the preserved marketing introduction at `/`. It includes authenticated cases, document ingestion and originals, saved transcripts, qualified source-linked findings, review notes with unsaved-change feedback, speaker labels, searchable transcripts, review progress and queue navigation, a dedicated hearing library with reviewed file imports, portable `.jude` archives, an evidence comparison list, and a floating case assistant on every case screen. Amazon Bedrock, when configured, converts unfamiliar readable transcripts, suggests relationships, and answers with source quotations. A clearly labeled demo case built from a public court record (796/Pid.B/2022/PN Jkt.Sel) opens without providers. Amazon Transcribe streaming, Amazon Bedrock, Pasal.id, and S3 integration paths are implemented. Transcribe and Bedrock were verified live in production on 2026-11-02, and Pasal.id and S3 still need an authorized live acceptance run. Local SQLite/private files and PostgreSQL migrations are verified.

Case assistant conversations retrieve across the current case's documents, hearings, findings, and confirmed evidence connections. The assistant is a floating panel available on every case screen, including during a live hearing, where it follows the open hearing. Users can attach findings or evidence connections, inspect quotations and ask follow-up questions. Courtroom practice is an AI rehearsal: AI-suggested, manually editable trial conditions, three user roles, AI characters (bench, prosecutor or defense counsel, a witness from the record) whose case facts cite verified passages, optional coaching notes, saved dialogue, and a cited debrief. Hypothetical practice stays outside the evidence record. Without configured providers, the assistant exposes sources and practice shows a clear unavailable state.

The production target is one AWS EC2 instance running the SvelteKit Node server (TypeScript for both frontend and backend) in Docker, with PostgreSQL for durable data and coordination, a private S3 bucket for originals, Amazon Bedrock for AI, and bounded in-process analysis jobs. Infrastructure and deploy automation are supplied in `infra/`. Live production validation is still required.

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
