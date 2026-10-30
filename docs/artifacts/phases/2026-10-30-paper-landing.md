# Animated paper landing page

The user requested further product iteration and a modern, paper-like landing page combining stop-motion gestures with smooth animation, naming OpenNote as inspiration. The reference domains were blocked by this environment, so the implementation follows that written direction and Jude’s established ivory/forest identity; it does not claim direct reference inspection.

## Delivered

- Source sheets separate in stepped poses, highlighted testimony connects to an earlier statement, and a verification note settles into view. The authored 4.4-second sequence is finite, with pause/resume/replay, offscreen and document-visibility pausing, and a static reduced-motion alternative.
- A clearer header and workspace actions lead into a responsive paper composition. Mobile sheets use document flow so source actions remain exposed.
- Keyboard-accessible workflow tabs preview case files, uploaded hearings, and evidence relationships. Previews and findings remain explicitly synthetic; every source action opens the existing interactive demonstration.
- Existing self-hosted type and raster assets are reused with their provenance. No new animation dependency or backend behavior is introduced.
- Product FAQs now reflect implemented transcript import, `.jude` portability, and legal discovery.

## Verification

Frontend lint, TypeScript, and production build; Chromium acceptance at 1440, 1280, 768, and 390 pixels; source navigation, keyboard tabs and mobile menu, review state, FAQ, pause/resume/replay, offscreen pause, reduced motion, no-JavaScript content, and no browser errors. Captures are in ignored `.impeccable/review/landing-*`. The targeted Impeccable detector returned no findings.

Independent visual review returned `ship`, with no material fixes, for this refinement of the established visual world. It validated the desktop/mobile composition, paper material, source provenance, and motion implementation; settled captures and browser acceptance supplied the behavior evidence. Design documentation records the reusable patterns. Live provider validation remains outside this landing-page change.
