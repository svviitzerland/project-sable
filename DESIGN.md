---
name: Jude
description: Calm editorial surfaces for inspecting testimony and its sources.
colors:
  background: "#faf7f0"
  foreground: "#14281f"
  primary: "#16382b"
  primary-foreground: "#f6f0e4"
  accent: "#eadcc4"
  paper: "#f5eee2"
  muted: "#64675e"
  line: "#d9d6ca"
  button-cream: "#f4ebda"
  button-ink: "#15271d"
  button-hover: "#e8d6b5"
  inconsistency: "#e9bf7c"
  inconsistency-ink: "#422d10"
  supported: "#deeadc"
  supported-ink: "#245037"
  context: "#e4e5ed"
  context-ink: "#484763"
  workspace-ink: "#173a2c"
  workspace-foreground: "#24372c"
  workspace-surface: "#fcfbf7"
  workspace-paper: "#f3f2eb"
  workspace-muted: "#657164"
  workspace-line: "#dedfd6"
  workspace-navigation: "#183b2d"
  relation-supports-stroke: "#4b7958"
  relation-supports-text: "#315841"
  relation-conflicts-stroke: "#b57539"
  relation-conflicts-text: "#835025"
  relation-context-stroke: "#83709b"
  relation-context-text: "#67547e"
  relation-related-stroke: "#8e9e91"
  relation-related-text: "#546758"
typography:
  display:
    fontFamily: "Rufina, Georgia, serif"
    fontSize: "clamp(58px, 5.85vw, 90px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Caslon Display, Georgia, serif"
    fontSize: "clamp(42px, 4.2vw, 64px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Caslon Display, Georgia, serif"
    fontSize: "33px"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.35
  workspace-body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  workspace-case-title:
    fontFamily: "Rufina, Georgia, serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.6px"
  workspace-finding-title:
    fontFamily: "Caslon Display, Georgia, serif"
    fontSize: "25px"
    fontWeight: 400
    lineHeight: 1.25
rounded:
  control: "5px"
  action: "7px"
  workspace: "9px"
  status: "30px"
spacing:
  small: "8px"
  medium: "16px"
  gutter: "20px"
  inset: "24px"
  section: "84px"
  section-mobile: "55px"
components:
  button-cream:
    backgroundColor: "{colors.button-cream}"
    textColor: "{colors.button-ink}"
    rounded: "{rounded.action}"
    padding: "10px 30px"
  button-cream-hover:
    backgroundColor: "{colors.button-hover}"
    textColor: "{colors.button-ink}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.action}"
    padding: "10px 29px"
  button-outline-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
  status-inconsistency:
    backgroundColor: "{colors.inconsistency}"
    textColor: "{colors.inconsistency-ink}"
    rounded: "{rounded.status}"
    padding: "7px 18px"
  status-supported:
    backgroundColor: "{colors.supported}"
    textColor: "{colors.supported-ink}"
    rounded: "{rounded.status}"
    padding: "7px 18px"
  status-context:
    backgroundColor: "{colors.context}"
    textColor: "{colors.context-ink}"
    rounded: "{rounded.status}"
    padding: "7px 18px"
---

# Design System: Jude

## Overview

**Creative North Star: "The Editorial Case File"**

Jude uses the user-approved warm-paper and forest-green editorial direction. Expansive serif headings establish a composed voice; plain sans-serif explanations and precise source annotations support close reading. The visual rhythm moves between spacious framing and denser evidence, retaining a clear hierarchy in both.

Material is purposeful: a dark photographic case-file backdrop frames the hero, while a separate ivory paper texture carries the evidence comparison. The source sheet remains visually distinct from the surrounding workspace. This record describes the built direction A, “Stay with the testimony,” selected by the user after correcting the earlier C choice.

The working application extends that identity with flat ivory reading surfaces, a forest case rail, and compact Manrope controls. Its case and finding titles retain the serif hierarchy, while testimony, citations, and review actions remain practical and closely grouped. Marketing imagery and textures stay on the introduction; the operating workspace uses tonal separation and fine rules.

**Key Characteristics:**
- Deep forest framing and warm ivory reading surfaces.
- Rufina hero, wordmark, and source-introduction heading; Caslon Display supporting serif; Manrope body text.
- Source-linked quotations, quiet dividers, and qualified status labels.
- Stacked mobile evidence with visible keyboard and selected states.

## Colors

The palette combines forest-green framing with warm, low-chroma paper; amber, sage, and soft lavender distinguish finding states. Frontmatter values are normative; CSS remains the implementation source.

### Primary
- **Forest Green** (`primary`): action text, focus-related accents, and the green family used for framing. The photographic hero has its own dark-green fallback and the closing section uses a nearby green, rather than one flattened color.
- **Cream on Green** (`primary-foreground`): light hero copy and outlined actions.

### Secondary
- **Warm Accent** (`accent`): the shared warm accent token.
- **Amber** (`inconsistency`), **Sage** (`supported`), and **Lavender** (`context`): status surfaces, each paired with its named ink token. Status meaning also appears in text.

### Neutral
- **Warm Background** (`background`): the continuous page canvas.
- **Ivory Paper** (`paper`): textured comparison surface and light hover surface.
- **Forest Ink** (`foreground`): default copy.
- **Muted Ink** (`muted`): secondary prose.
- **Paper Line** (`line`): quiet structural dividers.
- **Action Cream** (`button-cream`), **Action Ink** (`button-ink`), and **Warmed Hover** (`button-hover`): the filled action family.

**The Material Separation Rule.** Keep the ivory evidence texture separate from the green case-file backdrop so source text always sits on a light reading surface.

### Workspace extension

The `workspace-*` tokens describe the operating application independently of the marketing canvas. Forest navigation frames the case list; pale paper surrounds the near-white reading surface. Muted ink and thin lines organize metadata without adding elevation. Finding labels retain the amber/supporting-sage/context-lavender meanings; insufficient evidence uses a quiet neutral treatment. Every status also names its meaning in text.

Evidence relationships use separate stroke and text tokens for support, conflict, context, and related material. Graph lines and legend swatches use the stroke family; connection labels use the darker text family on pale surfaces. Preserve the distinction rather than reusing a low-contrast line color for small text. Relationship meaning always appears in words as well as color; dashed connections indicate unreviewed suggestions, while solid connections indicate reviewed links.

## Typography

All three families load from local font files. On the marketing introduction, Rufina supplies the hero headline, wordmark, and source-introduction heading; Caslon Display supplies the remaining headings, quotations, and prominent buttons. Manrope supplies navigation, explanations, controls, and annotations, with regular, medium, and semibold files.

The frontmatter display and headline roles describe the desktop hero and recurring section headings. Workflow titles use the title role. The body role is the page default; individual explanatory blocks range from compact supporting copy to a larger introductory lead. Labels use sentence case except for document metadata. Preserve the contrast between expressive serif reading and practical sans-serif control text.

The hero display becomes `7vw` at widths up to (1100px), then `clamp(44px, 8.4vw, 63px)` with line-height (1.03) at widths up to (760px). Section headings generally become (43px) on mobile. Hero quotations use `clamp(27px, 2.65vw, 42px)` on desktop and (33px) on mobile. The source-introduction heading uses Rufina at `clamp(40px, 4vw, 64px)` and (42px) on mobile. The wordmark is (53px) on desktop, (47px) on mobile, and (43px) in the footer. Buttons use Caslon Display at (23px), reducing to (21px) on mobile.

**The Two Serif Roles Rule.** Use Rufina for the hero headline, wordmark, and source-introduction heading, and Caslon Display for the remaining serif hierarchy; keep controls and explanatory prose in Manrope except for the established prominent button treatment.

In the operating workspace, Rufina supplies case titles and Caslon Display supplies the selected finding title. Manrope supplies all action controls and testimony. Case titles reduce to (30px) at widths up to (900px), then (28px) at widths up to (640px). Pane headings use compact semibold Manrope, with subordinate timestamps in tabular numerals. Small metadata is an annotation treatment, not the default size for new reading content.

## Layout

The main container is (90%) wide with a maximum of (1440px). Desktop evidence uses an inset (85%) surface capped at (1340px), with a three-column comparison in a `1.1fr 1fr 1.1fr` ratio. The synthetic demo is a `1.14fr 1fr` finding-and-source workspace. Workflow steps form ruled rows rather than a repeated card grid. Other explanatory sections pair a large heading with narrower supporting content.

At widths up to (1100px), the evidence panel expands to (90%), internal spacing tightens, and the main comparison remains side by side. At widths up to (760px), the container has (20px) side gutters, navigation switches to a menu, and evidence, demo quotes, demo panes, and editorial sections stack. The hero comparison reads testimony, earlier statement, then qualified finding; the connecting line disappears, while source buttons remain. Source controls and menu toggle use a (44px) minimum target at this breakpoint. Regular section spacing reduces from the desktop section token to the mobile section token. At widths from (1600px), hero top and bottom spacing increases.

The working application uses a full-height case rail beside the main record. The wide hearing view keeps transcript, finding list, and inspector adjacent, with independently scrollable reading areas. At widths up to (1320px), the inspector spans below the other panes; at widths up to (900px), all three panes stack. At widths up to (640px), the case rail becomes a drawer, and the closed drawer is hidden from keyboard traversal. Selecting a finding in stacked layouts moves focus and scroll to the inspector; a return action leads back to the initiating control. The workspace's density and breakpoints are separate from the marketing section rhythm.

The evidence view pairs a map or connection list with an inspector, stacking them at widths up to (900px). On these smaller layouts, the map retains a readable internal canvas (720px wide) inside horizontal scrolling rather than shrinking its labels to fit the screen. The connection-list alternative remains available beside the map control. Hearing libraries use full-width ruled rows; transcript previews place speaker labels beside statements on wider screens and stack those fields on mobile.

Assistant and practice views place a narrow saved-history rail beside an ivory dialogue or setup surface. At widths up to (760px), history becomes a bounded scrolling section above the main surface, paired setup fields and condition summaries stack, and composer actions span the reading column. Dialogue history scrolls within its own reading area while the composer remains a separate ruled section below it.

## Elevation & Depth

Depth comes primarily from material contrast, thin borders, and nested light surfaces. Shadows are soft and limited to the inset hero paper, source excerpt, and floating mobile navigation. They separate reading layers without competing with typography. The case-file backdrop uses `/images/jude-case-files.webp`; the paper overlay uses `/images/ivory-paper.webp` at a (600px) repeating scale. Exact shadow values are recorded in the sidecar.

The operating workspace stays flat: border rules separate panes, pale tonal surfaces identify source passages and verification steps, and selection changes the row fill. Do not carry the marketing hero's photographic depth into evidence reading.

## Shapes

Buttons have gently rounded corners; selectors are slightly tighter, the demo workspace slightly softer, and status badges fully pill-like. The hero paper has rounded top corners with square bottom corners. Document excerpts remain rectangular. Fine rules structure workflow rows, sources, and disclosures. Circular status dots and line endpoints support the evidence relationship; inline SVG icons retain a fine stroke.

Workspace controls and source surfaces use restrained corners (5px), the enclosing hearing surface slightly softer corners (7px), and status labels compact corners (4px). These status labels are deliberately less rounded than the marketing pills. Findings form ruled rows rather than individually elevated cards.

## Components

### Buttons

Filled cream actions and outlined light actions share Caslon Display, centered content, and a small directional SVG. Filled actions have a desktop minimum height of (56px), outlined navigation actions (48px); mobile filled actions reduce to (50px). Hover warms the fill or inverts the outline onto paper, while arrows shift (4px). Background, color, and arrow transitions last (0.2s). Disabled buttons lower opacity and show a not-allowed cursor.

### Navigation

The desktop navigation is a simple horizontal Manrope row with underline on link hover. On mobile a bordered green menu toggle reveals a floating green list, with expanded state exposed to assistive technology. Escape closes the menu and returns focus to its toggle. The wordmark remains a Rufina text link.

### Status labels and example selectors

Finding labels pair readable text with amber, sage, or lavender surfaces. They are informational pills, not buttons. Example selectors are bordered rectangular controls with a status dot and directional arrow; selection becomes dark green with cream text and `aria-pressed`. Mobile selectors stack at full available width.

### Evidence comparison and source workspace

The hero comparison places source-linked quotations on ivory paper. The desktop center column uses fine vertical rules and a connecting line; mobile moves its finding below both quotations. In the demo, finding copy and source excerpts remain distinct panes. Selected source controls use weight and an underline; source buttons remain underlined and switch the corresponding excerpt. The excerpt uses line numbers, a pale amber passage highlight, and document metadata. Changed findings and excerpts use polite live regions.

### Review, copy, and disclosure controls

The review control exposes its toggle state through `aria-pressed`, icon, wording, and weight. Copy feedback uses a status region and offers visible failure text when copying is unavailable. FAQs use native details and summary, ruled separation, and an SVG chevron that rotates when open.

### Keyboard and motion states

Interactive controls and programmatically focused headings receive a (2px) amber outline with (6px) offset. A skip link becomes visible on focus. Reduced-motion preference disables CSS transitions and animations, changes page scrolling to automatic, and is also respected by demo navigation. Hover, selection, expanded state, and keyboard focus remain separate signals. The sidecar snippets demonstrate CSS states; application behavior is owned by the Svelte components.

The original landing composition uses a finite 3.2-second source-comparison sequence: the sheet settles smoothly, each quoted time highlights, the connector draws, and the qualified finding receives emphasis. A replay control repeats the comparison. The headline reveal and workflow arrows provide bounded supporting motion. Each sequence pauses offscreen or while the document is hidden. Source-excerpt changes use a brief opacity transition (180ms). Reduced motion and no JavaScript retain the complete readable presentation and working source links. No perpetual loops or new visual assets are introduced.

### Workspace controls and inspection

Workspace actions use Manrope, compact corners, and forest fill for primary actions; secondary actions remain outlined. Fields share a light surface, quiet border, and forest caret. Keyboard focus uses an amber outline (2px) with a tighter offset (3px) suited to the dense controls. Selection highlighting, thin themed scrollbars, and tabular timestamps carry the same reading system into browser-owned details.

Case-section tabs expose selected state and support Arrow Left/Right, Home, and End. The mobile case drawer moves focus inside when opened, keeps keyboard traversal within it, and restores focus on Escape or close. Mobile finding links, source downloads, copy controls, and drawer controls have a minimum hit height (44px).

The inspector separates testimony, the exact source quotation, verification, uncertainty, and a suggested question through type hierarchy and pale surfaces. Quote highlighting stays within the source passage. Review notes remain editable across finding changes, with explicit save/review actions; clipboard feedback appears beside the question and never replaces source evidence. Reduced-motion preference removes transitions; focus movement remains immediate.

Transcript search and speaker selection sit above the reading pane in the existing field treatment. Search matches literal text without case sensitivity; matching words use pale amber passage emphasis. An active filter exposes the matching/total statement count through a status region and a clear-reset action. Following new testimony pauses visibly while filtering, and the filtered pane contracts to its content within the existing scroll limit. Empty results explain that filtering leaves the hearing record intact.

Review progress uses a textual reviewed/total count beside a direct Next unreviewed action, which becomes unavailable when no findings remain to review. These controls wrap within narrow panes. A changed review note shows an inline unsaved notice beside its explicit save actions; saved review state and unsaved edits remain distinct signals.

### Hearing library and import preview

Hearing upload uses a pale, dashed-border well with a direct upload action. The preview is an inline review surface, not a modal: its header identifies the source file, editable fields show the hearing title, date, speakers, and statements, and a distinct footer action confirms import. Ruled hearing rows combine a serif title with date, origin, statement/finding counts, and a text status. Case-level `.jude` import remains in the case rail, while export is an explicit case-header action; file-transfer actions share the workspace's existing control treatment.

Library discovery pairs a search field covering hearing title, date, and transcript text with a Needs review toggle. The toggle exposes its pressed state and uses the existing forest selected treatment; controls wrap on mobile. A status region reports matching/total hearings, while each row with findings states the remaining review count or All reviewed. An empty filtered view offers a clear-filters action rather than obscuring the underlying library.

### Evidence map, connections, and source inspection

The map uses numbered passage nodes and separately filled hearing-statement nodes, with labeled relationships and visible selection/focus strokes. A segmented control exposes map and connection-list views; the active view uses forest fill. Selecting a node, connection, or search source opens exact text in the inspector. On narrow layouts, selection moves focus and scroll to that inspector, with an explicit return to the originating evidence control. Connection review is a separate action from selection, and suggested/reviewed state remains visible in both text and line treatment.

Case questions use a full-width search field with a direct action. Results pair the response with individually inspectable source excerpts and provenance; the result surface does not replace the evidence map's source trail. Similarity and relationship labels remain qualified explanatory information rather than confidence decoration.

### Loading placeholders

Use the shared `Skeleton.svelte` component for asynchronous workspace, case, graph, conversation, reader, list, form and compact processing states. Shapes follow the expected content geometry; muted sage bars sit on the existing flat ivory surfaces, with an inverse variant for the forest case rail. Controls, drafts and loaded content remain available during background refreshes. Explicit navigation or searches show placeholders in the destination region, while a pending assistant reply appears beneath existing messages.

Placeholder groups use a smooth 1.8-second opacity pulse, paused offscreen or while the document is hidden. Reduced-motion preference uses static shapes. Every group has a named status region with `aria-busy`, and decorative shapes are hidden from assistive technology. Initial loading is distinct from an empty record or a failed request; failures remove placeholders and retain error/retry controls. The static landing page does not add artificial loading delays.

### Case assistant and courtroom practice

Dialogue extends the flat workspace treatment with ruled response rows, pale filled user turns, and explicit speaker or role labels. Saved-history selection combines a pale green fill with a pressed state. Source disclosures identify the document and page or hearing, then reveal the quotation, surrounding source text, and an original-document or hearing action. Material references and optional legal lookup use disclosures above the labeled composer; evidence handed into the assistant appears as a selected reference. Sources-only mode, source-selection limits, and hypothetical practice remain visible in explanatory text. New messages use a polite live log, and busy feedback includes a text status with reduced-motion-aware animation.

Practice setup uses ordinary labeled fields with editable conditions and an explicit AI or guided-drill choice. Suggested conditions receive a pale inline review surface. During practice, the header names the user's role and mode, saved conditions stay available in a disclosure, and changing setup is explicitly an action for a new rehearsal. Finish and debrief remains a separate control; a completed session shows a pale completion strip and a new-rehearsal action. Citation disclosures, source links, and reference checkboxes retain generous mobile hit areas within the existing control system.

## Do's and Don'ts

### Do:
- **Do** retain separate dark case-file framing and light paper reading surfaces.
- **Do** preserve the Rufina, Caslon Display, and Manrope role separation.
- **Do** keep source links available when evidence stacks on mobile.
- **Do** communicate status and selection with text or shape as well as color.
- **Do** preserve keyboard focus visibility and reduced-motion behavior.

### Don't:
- **Don't** merge the paper texture into the dark hero image.
- **Don't** turn every editorial section into an elevated card.
- **Don't** replace source annotations or qualification text with decorative badges.
- **Don't** treat the smallest document metadata as a default body or control text size.

### Task-focused interface and source comparison motion

Use task language in the workspace: unavailable features explain what users can do next; configuration, provider credentials and retrieval mechanics belong in operator documentation and logs. Keep source provenance, practice boundaries and consequential limitations visible. Empty cases use two ruled action rows for documents and hearings, not an empty evidence canvas. The forest case rail includes a title/reference search. Small screens collapse conversation history behind a count-bearing disclosure. Speaker labels remain a case task rather than a connection-status dashboard.

The landing retains its original forest-and-ivory composition. A finite comparison sequence highlights each quoted time, draws the source connection, then emphasizes the finding over roughly three seconds. A replay control lets visitors revisit it. Heading and workflow transitions provide bounded supporting motion. Visibility and reduced-motion behavior apply to every sequence; default markup stays readable without scripts. Working screens retain restrained feedback rather than marketing motion.
