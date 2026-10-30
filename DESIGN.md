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

## Typography

All three families load from local font files. Rufina supplies the hero headline, wordmark, and source-introduction heading; Caslon Display supplies the remaining headings, quotations, and prominent buttons. Manrope supplies navigation, explanations, controls, and annotations, with regular, medium, and semibold files.

The frontmatter display and headline roles describe the desktop hero and recurring section headings. Workflow titles use the title role. The body role is the page default; individual explanatory blocks range from compact supporting copy to a larger introductory lead. Labels use sentence case except for document metadata. Preserve the contrast between expressive serif reading and practical sans-serif control text.

The hero display becomes `7vw` at widths up to (1100px), then `clamp(44px, 8.4vw, 63px)` with line-height (1.03) at widths up to (760px). Section headings generally become (43px) on mobile. Hero quotations use `clamp(27px, 2.65vw, 42px)` on desktop and (33px) on mobile. The source-introduction heading uses Rufina at `clamp(40px, 4vw, 64px)` and (42px) on mobile. The wordmark is (53px) on desktop, (47px) on mobile, and (43px) in the footer. Buttons use Caslon Display at (23px), reducing to (21px) on mobile.

**The Two Serif Roles Rule.** Use Rufina for the hero headline, wordmark, and source-introduction heading, and Caslon Display for the remaining serif hierarchy; keep controls and explanatory prose in Manrope except for the established prominent button treatment.

## Layout

The main container is (90%) wide with a maximum of (1440px). Desktop evidence uses an inset (85%) surface capped at (1340px), with a three-column comparison in a `1.1fr 1fr 1.1fr` ratio. The synthetic demo is a `1.14fr 1fr` finding-and-source workspace. Workflow steps form ruled rows rather than a repeated card grid. Other explanatory sections pair a large heading with narrower supporting content.

At widths up to (1100px), the evidence panel expands to (90%), internal spacing tightens, and the main comparison remains side by side. At widths up to (760px), the container has (20px) side gutters, navigation switches to a menu, and evidence, demo quotes, demo panes, and editorial sections stack. The hero comparison reads testimony, earlier statement, then qualified finding; the connecting line disappears, while source buttons remain. Source controls and menu toggle use a (44px) minimum target at this breakpoint. Regular section spacing reduces from the desktop section token to the mobile section token. At widths from (1600px), hero top and bottom spacing increases.

## Elevation & Depth

Depth comes primarily from material contrast, thin borders, and nested light surfaces. Shadows are soft and limited to the inset hero paper, source excerpt, and floating mobile navigation. They separate reading layers without competing with typography. The case-file backdrop uses `/images/jude-case-files.webp`; the paper overlay uses `/images/ivory-paper.webp` at a (600px) repeating scale. Exact shadow values are recorded in the sidecar.

## Shapes

Buttons have gently rounded corners; selectors are slightly tighter, the demo workspace slightly softer, and status badges fully pill-like. The hero paper has rounded top corners with square bottom corners. Document excerpts remain rectangular. Fine rules structure workflow rows, sources, and disclosures. Circular status dots and line endpoints support the evidence relationship; inline SVG icons retain a fine stroke.

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

Interactive controls and programmatically focused headings receive a (2px) amber outline with (6px) offset. A skip link becomes visible on focus. Reduced-motion preference disables CSS transitions and animations, changes page scrolling to automatic, and is also respected by demo navigation. Hover, selection, expanded state, and keyboard focus remain separate signals. The sidecar snippets demonstrate CSS states; application behavior is owned by the React components.

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
