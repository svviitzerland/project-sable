# Research

Each topic has its own folder. Notes mark claims that were verified against a source and claims that still need checking; check article numbers against official texts before quoting them.

| Topic | Contents |
|---|---|
| [`kebutuhan-sistem/`](kebutuhan-sistem/) | [REPORT.md](kebutuhan-sistem/REPORT.md): what an evidence-grounded courtroom copilot needs (Indonesian criminal procedure, legal AI research, existing products, ethics and regulation), how Jude meets it, and priorities. Supporting notes: `masalah_persidangan_indonesia.md`, `riset_ai_hukum.md`, `produk_yang_ada.md`, `etika_regulasi.md`. |
| [`dataset-kasus-indonesia/`](dataset-kasus-indonesia/) | [SOURCES.md](dataset-kasus-indonesia/SOURCES.md): public Indonesian hearing records, transcripts, decisions and datasets usable for testing, with licensing and suitability notes. |
| [`hosting-dan-biaya/`](hosting-dan-biaya/) | [Report](hosting-dan-biaya/reports/Lokasi%20data%20dan%20biaya%20hosting%20Jude.md): whether Jude must keep data in Indonesia (PP 71/2019, UU PDP, PP 33/2026), AWS Jakarta vs Singapore, free alternatives considered (Supabase, Neon, R2) and why they were rejected, and AWS cost cuts. Decision: [docs/engineering/decisions/0001](../engineering/decisions/0001-hosting-dan-lokasi-data.md). |

Used so far: the Mahkamah Konstitusi risalah and video for Perkara 115/PUU-XXII/2024 back the voice evaluation in [`apps/voice/evaluation`](../../apps/voice/evaluation/README.md) and the native risalah import test.
