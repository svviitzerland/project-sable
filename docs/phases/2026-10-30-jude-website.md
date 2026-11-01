# Jude marketing website — 2026-10-30

## Confirmed scope

Build a marketing website introducing Jude in the existing Next.js frontend. The user chose a calm editorial identity and a visual-mockup-first workflow. The page will explain the evidence-grounded courtroom copilot through synthetic demonstration content. The full product/backend integrations are deferred.

## Delivery status

- Product brief read and recorded in `PRODUCT.md` and `docs/PRODUCT_SPEC.md`.
- Three compositional mockups are saved in `.impeccable/mocks/`: `a-editorial.png`, `b-evidence.png`, and `c-workflow.png`, with prompt sidecars and embedded generation provenance. All three were displayed and inspected.
- The user selected A, “Stay with the testimony,” explicitly correcting an initial selection of C. A is the sole approved comp.
- The responsive marketing page and interactive synthetic demo are implemented. Desktop and mobile visual verification is complete.
- Frontend dependencies installed successfully with the existing lockfile. No new runtime package dependency was added.

## Direction contract

THESIS: Make the relationship between testimony and source material inspectable, with the lawyer's verification step visible.

OWN-WORLD: User-approved warm paper and deep forest green, large elegant serif headlines, clear sans-serif body copy, and precise source annotations.

STORY: Understand the courtroom challenge, see two source-linked statements compared, learn the proposed workflow, and explore the synthetic example.

FIRST VIEWPORT: Approved comp `.impeccable/mocks/a-editorial.png`. A full-width deep-green case-file background carries the two-line headline “Stay with the testimony. See the whole story.” and cream demo action. A broad ivory evidence comparison occupies the lower hero, with testimony at left, a qualified finding in the center, and a cited earlier statement at right. The next light section begins “Every finding has a source.” On phones the comparison stacks and retains both source buttons.

FORM: The user's approved editorial direction takes precedence over the concept roll. Reference: seed:3d509d7414316609. Build path: comp, explicitly chosen by the user.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Validation

- Frontend lint and typecheck passed.
- Production build passed; it required normal local process permissions for Turbopack.
- Backend pytest: 1 passed. Ruff: passed. Existing Starlette/httpx deprecation warning remains.
- Browser verified all three findings, source switching, independent review toggles, question-copy success, mobile navigation, and FAQ expansion.
- Impeccable detector: no findings. All shipping image files have provenance.
- Screenshot canvas padding was cropped from the capture evidence. A dedicated ivory texture resolved the mobile paper-background contrast issue.
- The independent reviewer scored the final typography correction resolved, with no visible regressions and no remaining material UI fixes from its review. DESIGN.md and .impeccable/design.json record the implemented system.
- Mobile Escape closes navigation and returns focus to the menu button. No horizontal overflow was observed in checked desktop/mobile layouts.

## Review limitation

The independent review disposition is **fix**, solely because mechanical mockup validation is incomplete. The measured-spec gate is closed. The plate gate cannot decode the shipped WebP files with its PNG decoder; later automated gates remain pending. The final comparison score is 0.7059, below the 0.72 automatic threshold. No passing gate or approval receipt is asserted. This limitation concerns automated reproduction validation; the local website is implemented and browser-verified.

## Local preview

The production preview runs at http://localhost:3002. The example is synthetic; no live AI, microphone, document upload, enrollment service, or deployment is connected.
