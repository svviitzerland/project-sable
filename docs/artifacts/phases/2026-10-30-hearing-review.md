# Hearing discovery and review refinement

The user authorized continuing interface and feature improvements. This iteration makes long hearings and review queues easier to navigate while preserving the existing workspace and original landing page.

- Search hearings by title, date, or transcript phrase; combine with a needs-review toggle and see per-hearing review counts.
- Search testimony literally, filter by speaker, and highlight matching words. Auto-follow pauses during filtering while capture remains independent. Reset restores the selected follow preference.
- Show reviewed/total counts and cycle through every unreviewed finding. Opening a transcript's finding resets incompatible finding filters.
- Distinguish unsaved note edits from saved review state. Existing draft retention between selections remains intact.

## Validation

Frontend lint, TypeScript, production build, and the complete Chromium acceptance suite, extended for combined filters, no matches, literal punctuation, queue cycling, draft feedback, source navigation, and mobile views. All checks passed, including finishing the review queue and disabling its next action when complete. No browser errors were reported. Independent visual review returned `ship` with no material fixes. The targeted design detector reported no findings.

The workspace had a pre-existing uncommitted reversion in `be/app/factory.py`. It is untouched. The browser preview uses an isolated copy of the committed backend and disposable SQLite data; no backend behavior changes are included in this iteration. Live provider requests remain unverified.
