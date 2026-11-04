# Jude UI mockup

An interactive, UI-only prototype for brainstorming a responsive and adaptive Jude workspace. It reorganizes today's product around the information-architecture sketch (Case → Hearings, Findings, Evidence; Audio and Pasal.id as inputs; the case assistant as a layer; Live and Recorded hearing modes; Courtroom Practice left out as standalone/not needed).

Nothing here talks to a server. Every service is simulated in the browser: live transcription, analysis phases and findings, assistant replies with citations, Pasal.id results, audio upload and transcript import. All people, companies, case numbers and documents are synthetic, and legal entries are summaries labeled as mock Pasal.id metadata, not statute text. It is not deployed and nothing in `apps/web` depends on it.

## Run it

Node 22+ and pnpm 11.

```bash
cd design/mockup
pnpm install
pnpm dev          # http://localhost:5173, also reachable from phones on the same network
```

`pnpm build` writes a static site to `dist/` (relative paths, hash routing, so any static server or sub-path works) and `pnpm preview` serves it on port 4173. `pnpm check` runs svelte-check. Fonts come from `apps/web/static/fonts`.

## What to look at

| Route | Screen |
|---|---|
| `#/` | Cases |
| `#/case/c1` | Case overview: live hearing, review queue, next hearing, hearings, evidence, ask |
| `#/case/c1/hearings` | Hearing library with one "New hearing" entry point (record live, upload audio, import transcript, schedule) |
| `#/case/c1/hearings/h3` | Live hearing (streams by itself on load) |
| `#/case/c1/hearings/h2` | Recorded hearing in review mode (simulated audio player) |
| `#/case/c1/hearings/h1` | Imported transcript without audio and without findings |
| `#/case/c1/findings` | Cross-hearing findings queue |
| `#/case/c1/evidence` | Documents, evidence map and connection list |
| `#/case/c1/evidence/doc/d3` | Document reader |
| `#/case/c3` | Empty case |
| `#/map` | Feature map: the sketch redrawn, each node listing today's features (from this repo) and what the mockup proposes |
| `#/moodboard` | Tokens, type, statuses, core objects, responsive and adaptive rules |
| `#/canvas` | One screen in phone, tablet and desktop frames side by side |

The **Mockup** button (bottom right) switches language (Bahasa Indonesia / English), theme (Paper, Night, System), density, simulated provider availability (AI, Pasal.id, transcription), live stream speed, and two design variants: a docked or overlay assistant, and a split or focus live layout. It can replay the live hearing or reset all data.

Keyboard: `/` search, `A` assistant, `G` then `O`/`H`/`F`/`E` to switch section, `J`/`K` next/previous finding, `R` mark reviewed, `C` copy the suggested question, space to play in review mode, `?` for the list.

## Ideas being tested

- **Four sections instead of seven tabs.** Overview, Hearings, Findings and Evidence; documents live under Evidence, Pasal.id appears inside hearings, findings and the assistant, and settings/export move to the case menu.
- **The assistant as a layer.** It follows what is open (hearing, finding, passage or connection), changes its suggested questions with that context, and its `[n]` citations open the inspector in place. It docks at 1280px and wider, is a drawer on tablets and a full sheet on phones.
- **Live and Recorded as separate modes.** Live keeps controls visible, auto-follow pauses when you scroll up (with a "new statements" button), statements can be flagged, mentioned articles become links, and a courtroom mode switches to a low-glare theme. A live bar stays on every other screen while recording. Ending the hearing turns it into a recorded hearing with a waveform timeline and finding markers.
- **Findings as a queue.** All findings across hearings, filtered by status, hearing and review state, with the same inspector everywhere.
- **Container-driven layout.** Panes respond to the width they actually get, so docking the assistant turns three panes into two. Navigation is a full rail (≥1024px), an icon rail (720–1023px) or a bottom bar (<720px). Coarse pointers get 44px targets.

## Code map

- `src/lib/data.ts`: synthetic case, hearings, statements, documents, passages, findings, connections, legal entries and the live scripts.
- `src/lib/services.ts`, `src/lib/live.svelte.ts`: the simulated services and the live transcription engine.
- `src/lib/store.svelte.ts`, `src/lib/prefs.svelte.ts`, `src/lib/router.svelte.ts`, `src/lib/i18n.ts`: state, mockup preferences, hash routing and bilingual copy (`[Indonesian, English]` pairs).
- `src/routes/`: screens. `src/components/`: shell, inspectors, assistant, rows, map and dialogs.
