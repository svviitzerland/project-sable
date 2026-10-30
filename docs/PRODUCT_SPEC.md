# Jude product spec

Product truth is captured in `PRODUCT.md` at the repository root. This spec records delivery scope. Source: the user's Jude product brief and their confirmation that the first website should introduce the product.

## Problem

Lawyers in Indonesian proceedings must connect ongoing testimony with fragmented case documents and applicable law. Jude proposes traceable, evidence-grounded assistance while leaving legal judgment with the professional.

## Users and outcome

- Primary user: lawyers evaluating an AI courtroom copilot.
- Desired outcome for this website: understand Jude's purpose, inspect an illustrative evidence comparison, and understand the prototype's boundaries.
- Success: visitors can explain how testimony connects to a source and distinguish a potential inconsistency from a legal conclusion.

## MVP scope

- [x] Define the core user journey: understand the promise → explore a synthetic evidence example → learn the proposed workflow and human-review principles.
- [x] Choose the surface: a marketing website, not the full courtroom dashboard.
- [x] Confirm visual direction: warm paper, deep forest green, large serif headlines, calm editorial composition.
- [x] Confirm workflow: generate visual mockups for approval before implementation.
- [x] Implement a responsive Next.js marketing page in `fe/`.
- [x] Provide an interactive, clearly synthetic testimony/source example.
- [x] Explain the proposed transcription, retrieval, review, and verification workflow.
- [x] Provide working navigation, accessible controls, and an honest next step to explore the example.

## Out of scope

Live microphone capture, real transcription, production AI analysis, case uploads, authentication, Supabase storage, Pasal.id integration, enrollment collection, commercial pricing, and deployment are not part of the first local website prototype. The product brief describes planned capabilities; the marketing prototype must not imply these integrations are already running.

## Acceptance criteria

- [x] The chosen mockup is approved before page implementation.
- [x] The page identifies Jude, its intended audience, and its core mechanism in the first viewport.
- [x] All demonstration material is labeled synthetic and substantive example findings link to inspectable excerpts.
- [x] Navigation and demonstration controls work with keyboard and pointer input.
- [x] Desktop and mobile layouts are visually checked.
- [x] Frontend lint, typecheck, and build pass.

## Open questions

Composition A, “Stay with the testimony,” is approved and implemented. Launch date, pilot enrollment, production privacy commitments, and commercial terms remain undecided and should not be invented.
