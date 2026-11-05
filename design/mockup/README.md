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

`pnpm build` writes a static site to `dist/` (relative paths, hash routing, so any static server or sub-path works) and `pnpm preview` serves it on port 4173. `pnpm check` runs svelte-check. Fonts come from `apps/web/static/fonts`; the landing page also uses the case-file photograph and ivory paper texture from `apps/web/static/images`, plus a cloth tile cut from that photograph (`src/assets/case-cloth.webp`, origin in its sidecar).

The visual system is the repository's `DESIGN.md` ("The Editorial Case File"). Design work on the mockup goes through the Impeccable skill (`bunx impeccable install`, see `AGENTS.md`), which reads `PRODUCT.md`, `DESIGN.md` and `.impeccable/`.

## What to look at

| Route | Screen |
|---|---|
| `#/` | Landing page: the forest case-file cover, an animated testimony-to-source comparison, how it works, and the principles |
| `#/cases` | Cases |
| `#/case/c1` | Case overview: live hearing, review queue, next hearing, hearings, evidence, ask |
| `#/case/c1/hearings` | Hearing library with one "New hearing" entry point (record live, upload audio, import transcript, schedule) |
| `#/case/c1/hearings/h3` | Live hearing (streams by itself on load) |
| `#/case/c1/hearings/h4` | Scheduled hearing, not started yet |
| `#/case/c1/hearings/h2` | Recorded hearing in review mode (simulated audio player) |
| `#/case/c1/hearings/h1` | Imported transcript without audio and without findings |
| `#/case/c1/findings` | Cross-hearing findings queue |
| `#/case/c1/findings?view=board` | Findings board, a lawyer-driven board of findings and their sources |
| `#/case/c1/evidence` | Documents |
| `#/case/c1/evidence?view=connections&of=statement:s208` | Connections for one statement, strongest first |
| `#/case/c1/evidence/doc/d3` | Document reader |
| `#/case/c3` | Empty case |
| `#/map` | Feature map: the sketch redrawn, each node listing today's features (from this repo) and what the mockup proposes |
| `#/moodboard` | Tokens, type, statuses, core objects, responsive and adaptive rules |
| `#/canvas` | One screen in phone, tablet and desktop frames side by side |

The **Mockup** button (bottom right) switches language (Bahasa Indonesia / English), theme (Paper, Night, System), density, simulated provider availability (AI, Pasal.id, transcription), live stream speed, and two design variants: a docked or overlay assistant, and whether findings that ask for nothing are shown. It can replay the live hearing or reset all data.

Keyboard: `/` search, `A` assistant, `G` then `O`/`H`/`F`/`E` to switch section, `J`/`K` next/previous finding, `R` mark reviewed, `C` copy the suggested question, space to play in review mode, `?` for the list.

## Ideas being tested

- **Four sections instead of seven tabs.** Overview, Hearings, Findings and Evidence; documents live under Evidence, Pasal.id appears inside hearings, findings and the assistant, and settings/export move to the case menu.
- **The assistant as a layer.** It follows what is open (hearing, finding, passage or connection), changes its suggested questions with that context, and its `[n]` citations open the inspector in place. It docks at 1280px and wider, is a drawer on tablets and a full sheet on phones.
- **Live and Recorded as separate modes.** The live screen reads top to bottom in order of relevance: the finding most worth a look (only when there is one, with "Later" to set it aside), what the person speaking is saying now (a talking-head silhouette in their role colour whose sound waves move while they speak, their name, the line as it is typed), then the last few lines. There is no seating chart; a voice nobody has named asks "Whose voice is this?" in the dialogue box. A courtroom mode switches to a low-glare theme, and a live bar stays on every other screen while recording. Ending the hearing turns it into a recorded hearing with a who-spoke-when timeline and finding markers.
- **Only what matters comes forward.** Findings that differ from a source or need context are shown with the two phrases highlighted side by side and a question to ask; findings that match their source stay out of the way under "Others".
- **Findings as a queue and a board.** All findings across hearings, filtered by status and hearing, with the same inspector everywhere. The board view lets the lawyer start from a finding (or a statement or document), pin what Jude suggests behind it, and arrange the cards; nothing appears on the board unless they pin it.
- **One icon per kind of thing.** A case is a folder, a hearing a talking head, a document or passage a page, a finding the "!" mark, a legal reference the scales, a connection the waypoints. A line from a hearing shows the talking head of the person who said it, and a hearing row leads with the voice heard most (the person speaking, while live). The same icons appear in navigation, breadcrumbs, lists, search, the assistant's citations, the inspector and the landing; `#/moodboard` lists them.
- **Connections in Evidence.** Pick one statement, passage or document and see what else in the case may relate to it, ranked: confirmed links before suggestions, differences before support. Each row can become the next starting point, and a trail steps back.
- **Container-driven layout.** Panes respond to the width they actually get, so docking the assistant turns three panes into two. Navigation is a full rail (≥1024px), an icon rail (720–1023px) or a bottom bar (<720px). Coarse pointers get 44px targets.

## Code map

- `src/lib/data.ts`: synthetic case, hearings, statements, documents, passages, findings, connections, legal entries and the live scripts.
- `src/lib/services.ts`, `src/lib/live.svelte.ts`: the simulated services and the live transcription engine.
- `src/lib/store.svelte.ts`, `src/lib/prefs.svelte.ts`, `src/lib/router.svelte.ts`, `src/lib/i18n.ts`: state, mockup preferences, hash routing and bilingual copy (`[Indonesian, English]` pairs).
- `src/lib/kinds.ts` and `src/components/KindIcon.svelte`: the icon for each kind of thing; statements resolve to their speaker's talking head.
- `src/lib/board.svelte.ts`: what relates to what (shared by the findings board and Connections) and the board's state.
- `src/routes/`: screens. `src/components/`: shell, inspectors, assistant, talking-head portraits and dialogue box, attention cards, transcript log, timeline, board, connections and dialogs.
