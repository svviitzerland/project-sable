# 2026-11-02 · AI-only courtroom practice

## Scope

- **Guided drill removed.** The scripted no-AI practice mode is gone from the UI, the API (`mode` is no longer accepted on `POST /dialogues`), the server branches, i18n keys and tests. Creating or continuing practice without an AI provider returns 503 and the tab shows an unavailable state. Older `mode: "guided"` sessions stay readable and exportable but return 409 when continued.
- **Grounded AI rehearsal** (`apps/web/src/lib/server/practice.ts`). The prompt carries the cast for the user's role, KUHAP stage guidance, pressure guidance per difficulty, the chosen language, goals and assumptions. Retrieval uses the latest turn, recent questions and the last AI reply plus referenced material. A witness comes from the record, is named only from the sources and answers "tidak tahu/tidak ingat" outside them. Speaker labels from the model are normalized ("Hakim Ketua" becomes `judge`). Witness names are saved as `witness:Name`.
- **Citations.** Every speech that uses case facts is verified against the retrieved sources. One correction on failure, then failing speeches are dropped. Nothing unverified is saved.
- **Coaching.** Optional per turn (`coaching` on `POST .../messages`, default true, toggled in the composer and remembered per browser). Saved as `role: "coach"`, speaker = kind. Unverifiable notes are dropped.
- **Debrief.** Structured (summary, strengths, tighten, revisit). Saved as one `role: "debrief"` message per item. Revisit items must cite one passage and are deduplicated by passage.
- **UI.** Role, then optional conditions, then start. The scene note is rendered in the interface language. Per-character labels, coaching asides, a grouped debrief. Verified at 1440 and 390 px.
- No schema migration: new roles reuse `jude_dialogue_messages.role` and `speaker`.

## Real Bedrock check (local, `AI_PROVIDER=bedrock`, default Nova Lite, demo case 796/Pid.B/2022)

- Turns took 2 to 3 s, the debrief 8 to 21 s.
- Before fixes: Nova Lite omitted empty `citations` arrays and wrote "Hakim Ketua" as the speaker, so turns failed schema validation. The bench repeated the user's question instead of letting the witness answer. Coaching and debrief came back in English. Fixed with tolerant defaults (the JSON schema still marks every field required), speaker normalization, explicit witness and ordering rules and a restated language line.
- After fixes: all three turns and the debrief succeeded. The witness answered from Susi's BAP summary with a verified quote and said "Saya tidak tahu, Yang Mulia" for an out-of-record question (car colour). The debrief came back in Indonesian with verified passages.
- Remaining limits: objection, ruling and answer are sometimes misordered (an answer after a sustained objection). Coaching notes are sometimes in English. Debrief points can mention a question the user did not ask, although the cited passages verify. A stronger model would help, and model choice is handled separately.
