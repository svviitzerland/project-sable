# Workspace redesign: hearing room, floating assistant, sharper contradictions

Date: 2026-11-05

## Goal

Make the workspace much easier to use during a hearing, with the AI as the main help: fewer options, a simpler hearing room, an assistant reachable from every screen, a location that survives reloads, cheaper live transcription, and analysis that catches obvious contradictions.

## What changed

- **Location in the address.** `/workspace?case=<id>&view=<tab>&hearing=<id>` (the hearing tab omits `view`). Reloading, the browser back button and shared links return to the same case, section and hearing. A stale hearing id falls back to the hearing list.
- **Sections.** Hearings (default), Evidence, Case files, Practice, Settings. The Case assistant tab and the Legal references tab were removed.
- **Floating assistant (Ask Jude).** A bubble on every case screen opens a compact panel (full screen on phones). It follows the open hearing (latest and most relevant statements), suggests hearing or case questions, keeps conversation history and accepts material attached from findings and evidence connections. It uses the existing `/dialogues` API (`kind: assistant`) without the legal query.
- **Hearing room.** One primary record control and a More actions menu; status in one line; a transcript with search and auto-follow; findings with All, Differences and To review filters, conflicts first, expanding in place. The oversized serif testimony quote was replaced with compact text; long explanations collapse.
- **Evidence.** The dashed-line graph, the separate question box and manual link creation were replaced by side-by-side comparison cards, differences first, with counts as filters and a text filter.
- **Speech batching.** Finalized Transcribe results are held in the browser until a pause (2.5 s), a finished sentence of 18+ words, 30 s or 220 words, then saved as one batch. This removes the two-word statements that each triggered a save and an analysis call.
- **Analysis.** Courtesy and procedure turns skip the model. Earlier statements in the case are offered as citable `statement:<id>` sources, so a witness who said "jam 8" and later "jam 9" is flagged. The screen and the independent reviewer now treat different concrete values for the same specific (time, place, weapon type, quantity, people, order) as a potential inconsistency rather than "context needed". The sources endpoint and `.jude` import/export support testimony citations.

## Follow-up the same day

- Hearing room redesigned again for live use: LIVE stage header, conversation-style transcript with avatars, a one-click empty state, a Jude highlights panel with segmented filters and quick questions, and a phone pane switch.
- Spoken text no longer vanishes between the end of speech and the saved statement: saved batches stay on the live line until the transcript has reloaded.
- A citation mismatch no longer shows a red English error under a statement. Differences and support get one repair call; anything else, opinions included, is skipped quietly.
- New hearings get today's date and a default title, so starting takes one click.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (new tests: courtesy skip, earlier-testimony citation with reviewer passages and archive round trip, speech batching rules).
- Browser workflows updated for the new layout and run with `pnpm test:e2e`, including reloading a hearing URL.

## Limits

- Contradiction quality still depends on the model; the rules are in the prompts and covered by tests with a fake model, not by a live Bedrock run in this change.
- Earlier-testimony retrieval is keyword-based like document retrieval, so a contradiction phrased with no shared words may still be missed.
