# Jude interchange format, version 1

A `.jude` file is a ZIP archive with UTF-8 `manifest.json`. Its media type is `application/vnd.jude+zip`. Every manifest has `format: "jude"`, `version: 1`, and `kind: "hearing"` or `"case"`. Unknown versions are rejected. Archives are never extracted to disk using supplied paths.

## Hearing

Download a template from Hearings or `GET /api/v1/hearing-template`. This manifest can also be uploaded directly as a `.json` file:

```json
{
  "format": "jude",
  "version": 1,
  "kind": "hearing",
  "title": "Witness examination",
  "date": "2026-10-30",
  "segments": [
    {"speaker": "Counsel", "text": "When did you arrive?", "start": 0, "end": 3},
    {"speaker": "Witness", "text": "At eight in the morning.", "start": 4, "end": 8}
  ]
}
```

`date` may be empty. Times are seconds from hearing start; both zero means timing was not supplied. A hearing contains 1–500 turns, each up to 6,000 characters. Speakers are labels, not verified identities. CSV uses a required `text` column and optional `speaker,start,end`. TXT accepts `Speaker: statement` lines, optionally prefixed with `[hh:mm:ss]`. SRT/VTT preserve cue times; unknown speakers remain Unknown. Uploads are limited to 6 MB and conversion input to 100,000 extracted characters. Scanned PDFs and binary formats need text extraction/OCR outside Jude first.

Preview: `POST /api/v1/cases/{case}/hearings/preview` with multipart `file` and optional `convert=true`. Conversion is explicit, uses the configured OpenRouter analysis model, and may omit content or mis-group turns; every resulting statement must occur in the source. Review before confirming. Confirm: `POST /api/v1/cases/{case}/hearings/import` with the original `file` and reviewed manifest JSON in `transcript`. New testimony remains pending until Analyze hearing is requested. `GET /api/v1/cases/{case}/hearings/{hearing}/export.jude` exports the canonical transcript.

## Complete case

`GET /api/v1/cases/{case}/export.jude` packages a case. The manifest contains `case`, `documents`, `sources`, `hearings`, `segments`, `findings`, and `links`. Each document has a `file` path under `originals/` and a SHA-256 checksum; its original bytes are bundled. Source IDs are referenced by citations and graph links. The authoritative schemas are `CaseArchive`/`LinkOut` in `be/app/services/jude_archive.py` and the DTOs in `be/app/models.py`; API request schemas are available in FastAPI's `/docs`.

`POST /api/v1/cases/import` accepts multipart `file`. It creates a new private case owned by the signed-in user. It never replaces an existing case. IDs and references are remapped, notes are preserved, and imported findings/relationships are marked unreviewed. Imported material is not a newly generated analysis. External legal metadata is cleared rather than treating bundled URLs as verified references. Embeddings, passwords, sessions, provider keys, and storage credentials are not included. Click Find connections to index imported evidence with the configured embedding model.

Limits: 64 MB compressed and expanded; 12 MB manifest; 40 originals, each up to 6 MB; 100 hearings; 2,000 transcript turns/findings; 14,000 source passages; 1,000 evidence links. Duplicate paths, traversal paths, encryption, duplicate IDs/content, missing references, invalid quotes, and hash mismatches are rejected. An export over these limits fails explicitly; it is never silently truncated.

Archives are portable copies of case material and originals. A checksum detects byte changes; it does not authenticate the author, establish the truth of extracted passages, or prove a finding. Review imported content against the original files.
