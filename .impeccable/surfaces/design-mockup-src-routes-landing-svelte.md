---
version: 1
slug: "design-mockup-src-routes-landing-svelte"
primary_target: "design/mockup/src/routes/Landing.svelte"
related_targets: ["design/mockup/src/lib/i18n.ts","design/mockup/src/assets/case-cloth.webp"]
---

# Mockup landing: the editorial case file, paced like a brief

Brainstorming surface in `design/mockup` (not deployed). The user asked for a premium landing that is not "full modern", keeps the first landing's essentials (the forest case-file photograph, the ivory papers) and takes OpenLaw's attorney page as inspiration. It lives inside DESIGN.md's Editorial Case File world; nothing here changes the product landing in `apps/web`.

THESIS: The case file opens and the testimony meets its source; one idea per spread, ivory paper carrying every demonstration, forest cloth framing the opening and the close.
OWN-WORLD: `apps/web/static/images/jude-case-files.webp` and `ivory-paper.webp`, plus `design/mockup/src/assets/case-cloth.webp` (the cover's plain cloth, mirror-tiled, used at the photograph's own scale); Rufina (hero, wordmark, source-introduction heading), Caslon Display (headings, quotations, buttons), Manrope (navigation, prose, annotations); DESIGN.md colours, status and relation families; fine rules and ruled rows.
STORY: framed cover with nav, headline, cream "Coba perkara contoh" (opens the demo case) and the ivory comparison sheet rising from its lower edge; "Setiap temuan punya sumber." with four sources gathering around one statement; how it works as three ruled rows pairing a caption with a product moment that rises as paper from a forest-cloth plate's lower edge; a quiet transcript where one line comes forward; a synthetic BAP page set in Manrope, with Jude's note hanging in its margin, outside the record (below the page at 1100px and narrower); principles as ruled rows; a cloth closing band ending on the checked finding's paper slip; footer disclaimers.
FIRST VIEWPORT: at 1440x900 and 1280x800 the cover, both actions and the top of the comparison (both quotes and the qualified finding) are visible.
MOTION: one finite comparison sequence (about 3.2 s: settle, mark each time, draw the thread, settle the status) with a replay control; one gathering of the source slips on first view on wide screens. Both pause offscreen or when hidden; reduced motion and no script show the finished state. No loops, no reveal on every section.
OPENLAW DONATIONS: an inset hero frame, slow editorial pacing, light UI moments on a material plate, scattered material converging into one record, a real-looking legal document page. Not borrowed: video, photography of people, painterly images, sparkle ornaments, italics (the brand faces have none).
TRUTH: every demonstration is labelled "Contoh sintetis"; no customers, statistics, prices or launch claims; findings never imply guilt or credibility.

PROCESS: code-led (no image generation); no concept roll was used because the user pinned the direction and was offline. Finish review: two rounds; open at the end were the roll (by design) and a reviewer re-check of the last three fixes.
