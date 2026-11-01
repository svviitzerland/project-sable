# Jude product spec

## Problem and users

Lawyers in Indonesian criminal proceedings must follow testimony while comparing investigation documents, statements, and legal references. Jude keeps testimony, qualified findings, and inspectable evidence together. Lawyers retain judgment; the system does not determine guilt, credibility, truthfulness, or legal outcomes.

## Delivered MVP

The marketing introduction remains at `/`, with a prominent Open workspace action and Sign in links in desktop/mobile navigation. `/workspace` provides account registration/sign-in, isolated cases, document ingestion/search/original download, transcript capture, progressive source-linked findings, independent-review details, review notes, speaker labels, legal discovery, provider status, portable `.jude` export/import, a separate hearing library, and an evidence graph with natural-language search.

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

## Hearing and evidence workspace

Hearings are records within a case, each with a title, date, transcript, findings, and audio session. The hearing library searches titles, dates, and transcript phrases and can show only hearings with unreviewed findings. Within a hearing, literal text and speaker filters highlight matching testimony and suspend auto-follow without changing the record. Review counts and a next-unreviewed action support systematic review; unsaved notes remain explicit. Uploading a transcript opens a review preview before mutation. Native parsers cover the Jude hearing schema, CSV, speaker-labeled text, SRT, and VTT. Text-based PDFs/DOCX and unfamiliar readable text can be converted explicitly with OpenRouter; output is rejected if it invents wording. Uncertain speaker identities become Unknown; AI conversion supplies no invented timestamps. Original files are preserved. Analysis excludes that hearing's uploaded source document to prevent self-corroboration.

The evidence map connects source passages and cited hearing statements. Semantic similarity supplies candidates, never a conclusion. Optional bounded LLM classification attaches exact quotations to suggested relationships; users can confirm or manually create links. Search retrieves case-isolated evidence and expands through confirmed links only; the answer model must cite exact retrieved passages. Citation matching verifies provenance, not the truth of an interpretation.

`.jude` version 1 is a bounded ZIP with a JSON manifest. Case archives carry originals, sources, hearings, transcript, findings, notes, and evidence links. Import always creates a new case with remapped IDs. Imported findings and links require renewed review; external legal metadata and embedding vectors are excluded from re-use. See [JUDE_FORMAT.md](JUDE_FORMAT.md).

## Case assistant and courtroom practice

**Case assistant** is a persistent conversation within one case. Its context includes case metadata, the document/hearing inventory, recent qualified findings, relevant testimony, retrieved source passages, and confirmed evidence connections. Users can pin up to six document/hearing references or open an exact passage/statement from the evidence inspector. Follow-ups retain recent conversation and source references. The model receives selected excerpts, not every page: a maximum of 20 excerpts at 2,400 characters, recent 12 messages, 40 findings, and 8 relevant connections. Each response exposes the actual source-selection limits. Other cases and practice conversations never enter retrieval.

Case quotations are checked against the supplied text before an exchange is saved. Whitespace-only differences from PDF/DOCX extraction are mapped back to the exact source substring; words, punctuation, numbers and source IDs must still match. Assistant replies and practice debriefs get at most one automatic correction attempt after a citation failure, using the same selected sources. A failed correction saves neither the draft nor the user exchange; it cannot bypass required citations by changing the case-facts flag. This can add one model call on failure; provider/network errors are not retried by this correction step. These checks establish provenance, not semantic correctness; readers can expand quotations and open original documents or hearings. Optional Pasal.id lookup contributes labeled discovery metadata, never invented statute text. Uploaded legal documents can be referenced like other case material. Missing OpenRouter produces an explicit sources-only response; missing Pasal disables external lookup. Provider failures preserve the draft, reject partial exchanges, and support idempotent retries.

**Courtroom practice** is a separate saved conversation. Before starting, choose trial type, jurisdiction/court, stage, user role (defense, opposing counsel, or judge), difficulty, language, goals, and assumptions. OpenRouter can propose conditions from the current case; every field remains editable before starting. The saved conditions remain stable during a rehearsal; editing them starts a new rehearsal. AI plays other participants and must cite case facts, distinguish hypothetical procedure, and avoid invented witness evidence. It cannot speak the user's selected role. Finish saves a debrief focused on advocacy process, unanswered questions, and verification needs, without predicting outcomes.

Without AI, an explicitly selected guided drill provides scripted reflection prompts and a self-review checklist; it does not assess performance or impersonate responsive counsel. Practice never creates testimony, findings, or evidence links. Conversations are owner-checked and persisted separately, with up to 60 sessions per case and a bounded exchange history (roughly 80 messages). One exchange may run per conversation at a time. Separate JSON exports preserve assistant/practice history; `.jude` version 1 archives continue to carry the evidentiary case record and exclude dialogue.

## Recurring voices

Speechmatics speaker labels last for one connection, so without help every 210-second rotation and every hearing shows new labels. With the optional Python voice service configured, each finalized recorded statement of at least 1.6 seconds is matched to the case's voiceprints. Recurring voices keep one key (`Voice 1`, `Voice 2`) across rotations and hearings, so a label such as "Hakim Ketua" is entered once. A match is a suggestion that two clips probably share a voice; Jude never names a person, and users confirm labels. Short statements keep the provider label until their speaker is identified. Voiceprints are biometric data: they stay per case, are excluded from `.jude` archives, never leave the server except to the configured voice service, and can be deleted with "Forget voiceprints". Without the service, labels remain per connection.

## Loading behavior

Layout-matched skeletons cover workspace startup, case lists/records, evidence maps/search, document uploads/readers/search, hearing import previews/conversion, original finding passages, conversation history/opening/replies, practice suggestions/startup, legal search and save/import/audio preparation feedback. Initial data loads no longer show premature empty states. Existing records remain visible during background refreshes; explicit request failures end loading and preserve errors and retry controls. Skeletons expose named status regions, honor reduced motion, and pause animation when hidden or offscreen. The marketing page stays immediately readable without artificial loading delays.

## Constraints and decisions

Local mode uses one backend worker and recoverable in-process tasks. Hosted Vercel mode uses a transactional analysis outbox, signed QStash callbacks, PostgreSQL leases/rate limits/coalesced events, and scheduled recovery. Cold starts perform no migrations or global status resets. Sessions are application-owned, not Supabase Auth. Backend ownership checks protect every case route. No OCR, native courtroom recording, account recovery, multi-user case sharing, automatic naming of speakers, or operational prosecutor/judge workflow (practice roles are supported). Configured providers receive relevant material; no unverified privacy, accuracy, latency, customer, or commercial claims.

Original brief: “Jude - Evidence-Grounded AI for Courtroom Intelligence.” The portable scope and implementation map are recorded in `docs/artifacts/phases/2026-10-30-product-handoff.md`; its initial failure list is superseded by the completion record.


## Vercel deployment behavior

The native Svelte 5 frontend and TypeScript backend run in one SvelteKit 3 Vercel project rooted at `app`. Supabase PostgreSQL and private Storage remain external durable services. See [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md) for the environment contract, migration order and recovery scheduler setup.

Saved testimony and its analysis job commit together. Signed QStash callbacks validate the request body and destination, enforce a shared lease, and retry transient analysis failures within a bounded attempt count. Authenticated scheduled recovery redelivers stale/unsent work every 15 minutes by default (96 scheduled deliveries per day, plus analysis jobs and retries). Normal job dispatch remains immediate. Cookie-authenticated SSE supplies database-backed update notifications while the UI polls authoritative records.

The browser streams directly to Speechmatics using temporary server-minted credentials. Finalized batches are authenticated, validated and saved idempotently through the TypeScript API. Audio rotates with fresh credentials, preserves final-buffer flushing and bounds reconnect buffering; failures remain explicit. Speaker identifiers are scoped to each provider connection and timeline offsets continue across rotations. Partials remain local to the recording browser. Large uploads use authenticated 2 MB parts with integrity checks; large responses use expiring signed private-storage links. Temporary parts/exports are cleaned by recovery.

The previous Python runtime and test harness have been replaced with TypeScript. Existing PostgreSQL data, password hashes, originals and `.jude` version 1 remain compatible; migration 006 adds browser-audio session state. These paths have local/mocked contract checks and a separate PostgreSQL suite; real Vercel/provider acceptance remains a deployment requirement.

## Everyday workspace usability

Normal screens describe the task, available actions and relevant limits. Deployment setup, credential instructions, storage configuration, embedding counts and retrieval diagnostics are kept out of the workspace. Provider failures retain an opaque support reference; service/status/configuration diagnostics remain in server logs. Unavailable features explain an alternative without implying they are working.

Empty cases offer direct paths to documents and hearings and explain how these feed Evidence. Case navigation supports title/reference search. Document uploads confirm completion and searches can be cleared. Speaker labels replace the former connections panel. Audio capture is available above the transcript, with a disclosure for existing hearing records. Saved conversations collapse on small screens. Sign-in supports password visibility and clears stale errors when switching to registration.

The original landing composition now includes a finite, replayable comparison sequence: the two quoted times highlight, the source connection draws, and the finding receives emphasis. Introductory and workflow motion stays bounded, pauses offscreen/when hidden, and respects reduced motion. The page remains readable without JavaScript.
