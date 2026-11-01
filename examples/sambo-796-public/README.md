# Perkara Ferdy Sambo — 796/Pid.B/2022/PN Jkt.Sel (catatan publik)

*English below.*

## Bahasa Indonesia

Paket ini adalah kasus demo Jude yang dibangun dari **catatan publik**, bukan dari berkas klien. Ini satu-satunya perkara demo di aplikasi: dimuat saat memilih "Buka perkara demo" (`/auth/demo` atau `/cases/synthetic`).

### Isi

| Berkas | Isi |
|---|---|
| `sambo-796-public.jude` | Arsip kasus lengkap: dokumen asli, potongan teks, dua sidang, temuan. Impor lewat "Import .jude". Sama dengan `apps/web/static/demo/sambo-796-public.jude`. |
| `documents/putusan-796-kutipan.pdf` | Kutipan 68 halaman dari putusan (lihat peta halaman). Halaman tidak diubah; hanya halaman lain dan sumber daya font yang tidak dipakai yang dibuang. |
| `hearings/sidang-2022-11-08-bagian-{1,2}.json` / `.txt` | Transkrip otomatis sidang dalam format sidang Jude (JSON) dan teks berlabel pembicara. **Tidak ada audio.** |

### Sumber

- **Putusan:** Pengadilan Negeri Jakarta Selatan Nomor 796/Pid.B/2022/PN Jkt.Sel (Terdakwa Ferdy Sambo), diputus 13 Februari 2023, 696 halaman, dari Direktori Putusan Mahkamah Agung: <https://putusan3.mahkamahagung.go.id/direktori/putusan/zaedb645ac0ce0f89305303932333037.html>. Putusan pengadilan tidak dilindungi hak cipta (UU 28/2014 Pasal 42).
- **Sidang:** siaran publik KOMPASTV, video YouTube `tyhOkQ0q1-o` ("[FULL] Deretan Pengakuan ART Susi dan Kodir di Depan Ferdy Sambo dan Putri", kanal KOMPASTV ACEH, ±72 menit). Sidang Ferdy Sambo dan Putri Candrawathi tanggal **8 November 2022** di PN Jakarta Selatan dengan saksi Susi, Diryanto alias Kodir, Damianus Laba Koban (Damson) dan Marjuki. Tanggal unggah video tidak diverifikasi. Audio hanya diunduh sementara untuk transkripsi dan tidak disertakan.

### Peta halaman kutipan

| Halaman di Jude | Halaman asli putusan | Isi |
|---|---|---|
| 1–13 | 202–214 | 17. Saksi SUSI; 18. DIRYANTO alias KODIR; 19. DAMIANUS LABA KOBAN (Damson); 20. ALFONSIUS DUA LUREN; 21. ABDUL SOMAD; 22. MARJUKI (hal. 214 juga memuat awal saksi berikutnya) |
| 14–68 | 267–321 | 51. Saksi RICHARD ELIEZER PUDIHANG LUMIU; 52. RICKY RIZAL WIBOWO; 53. KUAT MA'RUF (hal. 321 juga memuat Saksi Sirajul Umam dan Sartini) |

Halaman asli = halaman Jude + 201 untuk halaman 1–13, dan halaman Jude + 253 untuk halaman 14–68.

### Batasan penting

- **BAP asli tidak publik.** Pembanding dalam kasus ini adalah **ringkasan keterangan saksi yang ditulis majelis hakim dalam putusan**, bukan BAP. Ringkasan itu merangkum keterangan saksi di sidang perkara Ferdy Sambo, termasuk sidang yang ditranskripsi di sini.
- **Temuan adalah perbandingan dokumen untuk diverifikasi manusia**, bukan penilaian kredibilitas, kejujuran, atau kesalahan siapa pun. "Potential inconsistency" berarti bunyi transkrip berbeda dengan kutipan putusan dan perlu diperiksa, misalnya karena salah dengar ASR, parafrase, atau konteks yang hilang.
- **Transkrip adalah keluaran mesin.** Amazon Transcribe (id-ID) salah mengenali banyak nama (mis. "Qodir", "Ferdi", "Putri Crawati", "Durian Tiga", "Saguli") dan diarisasi menggabungkan penanya dan saksi. Pergantian pembicara dan label peran diusulkan dengan bantuan AI lalu dicek otomatis agar setiap kata tetap sama dengan keluaran ASR. Label `spk_N` berarti peran tidak pasti. Kutipan dari transkrip harus dicek ke video sebelum dipakai.
- Putusan memuat dugaan kekerasan seksual yang ditolak pengadilan. Paket ini tidak menambah detail di luar isi putusan dan siaran. Nama anak terdakwa yang terdengar di transkrip (dua kali) diganti "[nama anak disamarkan]". Teks putusan asli menyebut nama salah satu anak terdakwa satu kali (hal. asli 206, hal. Jude 5); nama itu disunting (redaksi permanen) di PDF kutipan dan di arsip, diganti "[nama anak disamarkan]". Selain itu isi putusan tidak diubah.

## English

This pack is a Jude demo case built from a **public record**, not from client files. It is the only demo case in the app: it loads when you choose "Open the demo case" (`/auth/demo` or `/cases/synthetic`).

### Contents

| File | What it is |
|---|---|
| `sambo-796-public.jude` | Complete case archive: original document, source passages, two hearings, findings. Use "Import .jude". Identical to `apps/web/static/demo/sambo-796-public.jude`. |
| `documents/putusan-796-kutipan.pdf` | 68-page excerpt of the decision (see page map). Pages are unchanged; only other pages and unused font resources were removed. |
| `hearings/sidang-2022-11-08-bagian-{1,2}.json` / `.txt` | Automatic transcript in the Jude hearing format (JSON) and as speaker-labeled text. **No audio is included.** |

### Sources

- **Decision:** District Court of South Jakarta No. 796/Pid.B/2022/PN Jkt.Sel (defendant Ferdy Sambo), read 13 February 2023, 696 pages, from the Supreme Court's Direktori Putusan: <https://putusan3.mahkamahagung.go.id/direktori/putusan/zaedb645ac0ce0f89305303932333037.html>. Court decisions are not protected by copyright in Indonesia (Law 28/2014, Article 42).
- **Hearing:** public KOMPASTV broadcast, YouTube video `tyhOkQ0q1-o` ("[FULL] Deretan Pengakuan ART Susi dan Kodir di Depan Ferdy Sambo dan Putri", channel KOMPASTV ACEH, about 72 minutes): the 8 November 2022 session of the Ferdy Sambo and Putri Candrawathi trial at the South Jakarta District Court with witnesses Susi, Diryanto alias Kodir, Damianus Laba Koban (Damson) and Marjuki. The upload date was not verified. The audio was downloaded only temporarily for transcription and is not included.

### Page map

Jude pages 1–13 are original pages 202–214 (17. Saksi SUSI; 18. DIRYANTO alias KODIR; 19. DAMIANUS LABA KOBAN (Damson); 20. ALFONSIUS DUA LUREN; 21. ABDUL SOMAD; 22. MARJUKI). Jude pages 14–68 are original pages 267–321 (51. Saksi RICHARD ELIEZER PUDIHANG LUMIU; 52. RICKY RIZAL WIBOWO; 53. KUAT MA'RUF). Original page = Jude page + 201 for pages 1–13 and Jude page + 253 for pages 14–68.

### Important limits

- **The original BAP (police examination records) is not public.** The comparison source is **the court's summary of each witness's testimony in the decision**, not the BAP. That summary covers the witnesses' testimony in the Ferdy Sambo trial, including the session transcribed here.
- **Findings are document comparisons for human verification**, not judgments about anyone's credibility, truthfulness or guilt. "Potential inconsistency" means the transcript wording differs from a quoted passage and needs checking; ASR errors, paraphrase or missing context are common explanations.
- **The transcript is machine output.** Amazon Transcribe (id-ID) misrecognizes many names ("Qodir", "Ferdi", "Putri Crawati", "Durian Tiga", "Saguli") and its diarization merged questioners with witnesses. Turn boundaries and role labels were proposed with AI assistance and automatically checked so every word still matches the ASR output. A `spk_N` label means the role is uncertain. Check any transcript quotation against the video before relying on it.
- The decision discusses sexual-assault allegations that the court rejected. This pack adds no detail beyond the decision and the broadcast. Names of the defendants' children heard in the transcript (two mentions) are replaced with "[nama anak disamarkan]". The court's decision names one of the defendants' children once (original p. 206, Jude p. 5); that name is permanently redacted in the excerpt PDF and the archive as "[nama anak disamarkan]". The decision is otherwise unchanged.

### How it was built

1. Ingestion: the excerpt PDF was uploaded through Jude's document API. Direktori Putusan MA watermark letters, headers ("Hal. X dari 696 hal. Putusan Nomor ..."), the `putusan.mahkamahagung.go.id` line and the per-page disclaimer are removed from the extracted text; the stored original is unchanged. The full 696-page decision also ingests (about 1.8 s, 1,812 passages).
2. Transcription: Amazon Transcribe batch, `id-ID`, speaker labels (max 6), ap-southeast-1. Audio and job output were deleted from S3 afterwards.
3. Hearings: 916 verified turns, filler-only turns removed, consecutive turns of the same speaker merged, split into two hearings because a Jude hearing holds at most 500 turns.
4. Analysis: Jude's own per-statement analysis on Amazon Bedrock for the 359 witness turns (`Saksi …` and uncertain `spk_N`); bench and counsel turns are kept without analysis. Screening `claude-haiku-4-5` with independent review of potential inconsistencies by `claude-sonnet-4-6`; turns that failed validation were retried once with `claude-sonnet-4-6` screening and `claude-haiku-4-5` review. Each hearing was compared only with the decision excerpt. Quotes are verified against the source passages before a finding is saved.

### Result

97 findings: 40 supported, 36 context needed, 21 insufficient evidence, **0 potential inconsistencies** (one was flagged by screening and rejected by the independent reviewer as a paraphrase or missing-context difference). 245 witness turns were judged not checkable (answers such as "Siap", procedure, fragments) and 17 could not be analyzed after retries (the model omitted required fields). The court's summary was written from this very trial, so close agreement is expected; the publicly reported differences concern the unpublished BAP. Many context-needed findings are weak (fragmentary ASR turns, unclear referents) and some explanations are in English. Treat every finding as a prompt to check the page, not a conclusion.
