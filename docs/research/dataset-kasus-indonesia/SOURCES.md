# Real Indonesian court material for testing Jude

Researched 2026-11-01. Each item is labeled with how it was checked:

- **VERIFIED**: the page was opened, or a HEAD/API request returned 200, during this research.
- **INDEXED**: the item appears in a search engine or YouTube search results with the title, channel and length shown, but the page was not opened.
- **UNVERIFIED**: the item comes from secondary sources such as news articles or theses only.

No large files were downloaded. One small MK risalah PDF (600 KB) was fetched to check its format.

## Access notes (read first)

- **Direktori Putusan MA** (`putusan3.mahkamahagung.go.id`) is behind a Cloudflare JS challenge. curl and WebFetch get 403. In a normal browser, individual `/direktori/putusan/<id>.html` pages open and offer a "Download PDF" link. **Full-text search on the site needs a "Saya bukan robot" CAPTCHA.** An agent cannot do that step. A person has to run the searches suggested in section 4 by hand.
- **pasal.id** mirrors MA decisions as plain HTML, including full text and a link back to putusan3. This was checked on `https://pasal.id/peraturan/putusan-ma/ma-138-pk-pid-2023`. It is good for scripted text access. It does not cover every decision; for example, `ma-498-k-pid-2017` returned an empty page.
- **mkri.id** listing pages are behind Cloudflare, but the risalah PDFs under `/public/content/persidangan/risalah/` download directly (HTTP 200, `application/pdf`).
- **YouTube**: news channels upload broadcasts under standard YouTube terms. Use the videos only for internal evaluation. Do not redistribute the audio or ship it in the repo. Keep a list of video IDs and fetch the audio locally when you need it.

## Legend: how Jude can use each item

- **ASR**: Indonesian word error rate on real courtroom audio.
- **DIAR**: speaker diarization and stable labels (judge, prosecutor, counsel, witness, defendant).
- **INCONS**: testimony vs. earlier statement. Court audio where a witness's testimony differs from the BAP or the witness retracts it, cross-checked against the putusan's summary of that testimony.
- **RETR**: retrieval and quoting from long legal PDFs (putusan, risalah).

---

## 1. Recorded criminal trials with witness examination (highest value)

### 1A. Ferdy Sambo cs: murder of Brigadir Nofriansyah Yosua Hutabarat (PN Jakarta Selatan, Oct 2022 to Feb 2023)

**Putusan (VERIFIED in browser):** PN Jakarta Selatan, Nomor **796/Pid.B/2022/PN JKT.SEL** (defendant Ferdy Sambo).
- Read 13 Feb 2023. Registered 10 Oct 2022. Presiding judge Wahyu Iman Santoso. Sentence: death.
- URL: https://putusan3.mahkamahagung.go.id/direktori/putusan/zaedb645ac0ce0f89305303932333037.html (PDF and ZIP downloads are on the page).
- Related decisions listed on the page: 797/Pid.B/2022/PN JKT.SEL (Putri Candrawathi); appeal 53/PID/2023/PT DKI; cassation 813, 814, 815 and 816 K/Pid/2023.
- The evidence list in the amar names specific **BAP saksi with dates**. Examples: Prayogi Iktara Wikaton (12, 19, 25 and 28 Jul 2022), Adzan Romer (12, 19, 22 and 25 Jul 2022), Putri Candrawathi (9 Jul 2022). It also lists the handwritten "testimoni" of Ricky Rizal (8 Aug 2022) and Richard Eliezer (6 Aug 2022). This gives real metadata on which statements existed, although the BAP texts themselves are not public.
- Co-defendant cases (numbers from news and theses; **UNVERIFIED** on the directory): Richard Eliezer **798/Pid.B/2022/PN Jkt.Sel**, Ricky Rizal **799/Pid.B/2022/PN Jkt.Sel**. Kuat Ma'ruf's number is unclear: one source says 780, another implies 800. Check by hand.

**Documented testimony vs. BAP differences (news, with dates):**
- **31 Oct 2022.** Susi, Sambo's household worker, testified in the Eliezer/Ricky/Kuat trial. Judge Wahyu Iman Santoso confronted her with her BAP: the BAP says Yosua was about to lift Putri, but in court she said he did not. She said she was "kacau" during the BAP examination. The judge warned she could be prosecuted and ordered a confrontation with Kuat Ma'ruf. Sources: [detik, "Susi ART Sambo Ralat BAP di Sidang"](https://www.detik.com/sulsel/hukum-dan-kriminal/d-6379726/susi-art-sambo-ralat-bap-di-sidang-soal-yosua-sudah-angkat-putri), [Antara](https://www.antaranews.com/berita/3213357/majelis-hakim-sebut-keterangan-art-sambo-berubah-ubah-bisa-dipidanakan), [Kompas TV](https://www.kompas.tv/article/343289/hakim-semprot-art-putri-candrawathi-dinilai-ketahuan-beri-kesaksian-bohong-di-sidang-bharada-e).
- **Late Nov to early Dec 2022.** Ricky Rizal withdrew the part of his BAP about Sambo wearing gloves. Eliezer's lawyer, Ronny Talapessy, said Ricky and Kuat changed their gloves account in later BAPs. Sources: [detik](https://news.detik.com/berita/d-6434384/pengacara-bharada-e-kuat-maruf-ricky-ubah-bap-soal-lihat-sarung-tangan-sambo/amp), [Kompas TV](https://www.kompas.tv/article/355363/pengacara-bharada-e-kesaksian-ricky-rizal-soal-sarung-tangan-seperti-ingin-melindungi-ferdy-sambo).
- **13 Dec 2022.** Richard Eliezer testified in Sambo's trial. Sambo's lawyer Arman Hanis pressed him on changing his BAP (the early "skenario" BAPs of 5 Aug 2022 versus his later statements). Sources: [Kompas TV](https://www.kompas.tv/article/357882/pengacara-ferdy-sambo-bentak-eliezer-karena-ubah-bap-hakim-larang-arman-hanis-tanya-langsung), [Kompas TV, BAP 5 Agustus](https://www.kompas.tv/article/362971/bap-eliezer-5-agustus-dipersoalkan-ronny-itu-masih-skenario-didampingi-pengacara-dari-ferdy-sambo).

**Videos (INDEXED via YouTube search, 2026-11-01):**

| Video ID / URL | Length | Channel | Content |
|---|---|---|---|
| https://www.youtube.com/watch?v=I_Ti7W3ZZPI | 2:51:45 | CNN Indonesia | Live: witness examination of Richard Eliezer, Ricky Rizal and Kuat Ma'ruf |
| https://www.youtube.com/watch?v=h9RfxWTc7aU | 1:51:44 | Kompas.com | Live: continued Eliezer/Kuat/Ricky trial, witness examination |
| https://www.youtube.com/watch?v=YRZipGmNL_A | 1:23:00 | iNews | Live: witness examination of Eliezer, Ricky, Kuat ("12/12") |
| https://www.youtube.com/watch?v=TTVSKf7gJWY | 3:30:21 | Tribun Jateng | Live: Ricky Rizal and Kuat Ma'ruf as witnesses for Eliezer |
| https://www.youtube.com/watch?v=UkfuSF1_xWc | 2:31:12 | KOMPASTV | [FULL] Eliezer's testimony in the session examining Ricky and Kuat |
| https://www.youtube.com/watch?v=95j7kbp86A8 | 1:47:06 | Kompas.com | Live: Sambo/Putri trial, Susi and Kodir testify again |
| https://www.youtube.com/watch?v=tyhOkQ0q1-o | 1:12:06 | KOMPASTV ACEH | [FULL] Susi and Kodir before Sambo and Putri |
| https://www.youtube.com/watch?v=rX_bz83BYJY | 5:00 | KOMPASTV BENGKULU | Clip: "Kesaksian Susi ... Berbeda Dengan BAP" (short labeled clip of the moment) |
| https://www.youtube.com/watch?v=hDfQz8FGvTY | 1:05:26 | CNN Indonesia | Ferdy Sambo testifies in Bharada E's trial |
| https://www.youtube.com/watch?v=Pawjmeid370 | 2:12:01 | CNN Indonesia | Eliezer examined as defendant |
| https://www.youtube.com/watch?v=gdsflz6374U | 46:07 | Corry News (third party) | Eliezer vs. Sambo's counsel exchange (re-upload; lower provenance) |

- **Language:** Indonesian.
- **Caveats:**
  - The trial includes allegations of sexual assault against Putri Candrawathi, which the court rejected. Exclude those segments, or tag them as sensitive. The victim, Yosua, is deceased.
  - The victim's family is a real private party.
  - Live streams include studio commentary before and after the hearing, so trim to courtroom audio.
- **Use:** ASR, DIAR, INCONS. The Susi session (31 Oct 2022) is a clean "testimony differs from BAP" case: the judge reads out the BAP and the witness answers. Cross-check what she said against how the putusan summarizes her testimony.

### 1B. Jessica Kumala Wongso: "kopi sianida" case (PN Jakarta Pusat, Jun to Oct 2016)

**Putusan (VERIFIED in browser):** PN Jakarta Pusat **777/Pid.B/2016/PN.JKT.PST**.
- Read 27 Oct 2016. Registered 8 Jun 2016. Presiding judge Kisworo, with Partahi Tulus Hutapea and Binsar M. Gultom. Sentence: 20 years.
- URL: https://putusan3.mahkamahagung.go.id/direktori/putusan/7dce3c848cb3b2ff6a8dd6bd2d0ea5b2.html (PDF available).
- Related decisions: appeal 393/PID/2016/PT.DKI; cassation 498 K/PID/2017; review (PK) 69 PK/Pid/2018; second PK 78 PK/PID/2025.

**About the trial:**
- Every session was broadcast live (Kompas TV, iNews and others). Medcom reports 46 witnesses in total, with witness examination finished by session 25.
- **Differences from BAP:** Jessica herself said her BAP differed from her court testimony because of pressure (Republika, 28 Sep 2016). Otto Hasibuan challenged two versions of the BAP on how the evidence was stored (CNN Indonesia, 25 Oct 2016). The judge called barista Rangga's testimony "berbelit" (convoluted).

**Videos (INDEXED):**

| Video ID / URL | Length | Channel | Content |
|---|---|---|---|
| https://www.youtube.com/watch?v=jazRR8Gr4uI | 6:49:12 | KOMPASTV | Live stream, "Sidang ke-16" |
| https://www.youtube.com/watch?v=eJbU6BIEpzg | 11:54:59 | KOMPASTV | Live stream, Breaking News |
| https://www.youtube.com/watch?v=0-5Fh_UcRt8 | 11:13:45 | KOMPASTV | Live stream, Breaking News |
| https://www.youtube.com/watch?v=A2WC5Z2E80Q | 1:48:18 | KOMPASTV JAWA TIMUR | [Full] Witness Hani (Mirna's friend), 13 Jul 2016 session (archive) |
| https://www.youtube.com/watch?v=5uK_mIGd2WY | 2:40:05 | KOMPASTV GORONTALO | Testimony of Olivier café staff, part 2 (archive) |
| https://www.youtube.com/watch?v=cJPoe8oAPYQ (also `tLDLD6RU9Tw`) | 4:53:11 | KOMPASTV | [Full] Prosecutor examines Jessica (defendant) |
| https://www.youtube.com/watch?v=EDi9P6uABQo (also `QSK63E1FRXU`) | 1:24:35 | KOMPASTV | [Full] Judge examines Jessica |
| https://www.youtube.com/watch?v=UUJ5tlJP3lg | 1:24:48 | CNN Indonesia | FULL4: Jessica's many "lupa / tidak ingat" answers |

- **Language:** Indonesian. Some expert witnesses spoke English with an interpreter, which makes useful code-switching material.
- **Caveats:** Audio from 2016 TV broadcasts. The 11-hour streams include breaks. The victim is deceased and her family members testified.
- **Use:** ASR, DIAR (many speakers, long sessions), INCONS: the defendant's statement versus her BAP, and witness accounts that differ from each other.

### 1C. Teddy Minahasa narcotics case (PN Jakarta Barat, Feb to May 2023)

- **Case numbers:**
  - AKBP Dody Prawiranegara: **97/Pid.Sus/2023/PN Jkt.Brt** (from news, UNVERIFIED on the directory).
  - Teddy Minahasa: number not found. Search the directory by hand.
- **What happened in court:**
  - Teddy withdrew his initial BAP (his lawyer Hotman Paris explained why).
  - Linda Pujiastuti and Dody testified against him around 27 Feb to 1 Mar 2023. Dody also read out a letter he said came from Teddy.
- **Videos (INDEXED):**
  - https://www.youtube.com/watch?v=odB7pTWvBg0 (10:34:48, KOMPASTV live: Dody and Linda testify in Teddy's trial)
  - https://www.youtube.com/watch?v=dzUoaIWEp74 (1:03:54, judge questions Linda)
  - https://www.youtube.com/watch?v=_qCLJId-X0Y (1:09:16)
  - https://www.youtube.com/watch?v=MUTiPwRs03I (32:16, Hotman Paris vs. Linda)
- **Caveat:** Linda's testimony covers a claimed intimate relationship. That is a privacy-sensitive adult topic, though not a sexual-violence case.
- **Use:** ASR, DIAR with heated, overlapping speech (good stress test), INCONS: the defendant retracting his BAP, and conflicting accounts between co-defendants.

### 1D. e-KTP corruption: Miryam S. Haryani retracts her BAP (Tipikor Jakarta, 2017)

This is the textbook Indonesian case of a witness retracting a BAP.
- **23 Mar 2017:** testifying in the trial of Irman and Sugiharto, Miryam withdrew all her BAPs (dated 1, 7 and 14 Dec 2016 and 24 Jan 2017), saying KPK investigators had pressured her.
- KPK played video of her questioning in court and confronted her with three investigators testifying as verbalisan witnesses.
- She was later convicted of giving false testimony: 5 years, read 13 Nov 2017, presiding judge Frangki Tumbuwun.

**Putusan:**
- Irman & Sugiharto: **41/Pid.Sus/TPK/2017/PN.JKT.PST** (VERIFIED as a directory entry; **no PDF attached** on this entry). URL: https://putusan3.mahkamahagung.go.id/direktori/putusan/204795b84717a9a73786daee2ca8f626.html. Related: 33/PID-TPK/2017/PT.DKI, 430 K/Pid.Sus/2018, and a duplicate entry "41/Pid.Sus-Tpk/2017/PN.Jkt.Pst" that may have the PDF.
- Miryam's own Tipikor verdict: number **not found**. Search the directory for "Miryam" by hand.

**Videos (INDEXED, short news clips only; no full session found):**
- https://www.youtube.com/watch?v=ENjPleHa2lE (21:05, CNN: Miryam confronted with KPK investigators)
- https://www.youtube.com/watch?v=Y4_O7iB3c54 (6:22)
- https://www.youtube.com/watch?v=OnnbYD6C2CA (0:53)

**News:**
- [Hukumonline, the indictment's BAP dates](https://www.hukumonline.com/berita/a/alasan-pencabutan-bap-ini--miryam-didakwa-berikan-keterangan-tidak-benar-lt59673c4f7d83b/)
- [Bisnis, the moment of retraction](https://kabar24.bisnis.com/read/20170323/16/639717/korupsi-e-ktp-ini-saat-saat-saksi-kunci-mencabut-keterangan-di-bap)
- [Tirto, the judge relied on her in-court testimony](https://tirto.id/hakim-gunakan-keterangan-miryam-di-persidangan-ketimbang-bap-cs7A)

**Use:** INCONS gold standard. Both the putusan and the news state explicitly which BAP was retracted and why.

### 1E. Tragedi Kanjuruhan (PN Surabaya, Jan to Mar 2023)

- **2 Feb 2023:** police witnesses Bambang and Nur Adnan gave testimony that differed from their BAPs. They said they were tired when the investigators questioned them, and the prosecutor reprimanded Bambang. Nur Adnan's account of the coordination-meeting minutes (15 and 28 Sep 2022) also differed. Sources: suarasurabaya.net reports (dated 2023; the site header wrongly shows 2026), [Tirto](https://tirto.id/pakar-sidang-kanjuruhan-didesain-untuk-tidak-menyalahkan-polisi-gDFy).
- Two police defendants were acquitted in March 2023. The Supreme Court overturned the acquittals in August 2023 ([Kompas.id](https://www.kompas.id/baca/english/2023/08/24/en-ma-hukum-dua-polisi-dalam-kasus-tragedi-kanjuruhan-batalkan-vonis-bebas-pn)).
- **Trial monitoring report:** ICJR / Fachrizal et al., https://icjr.or.id/wp-content/uploads/2023/06/Bagian-Kesatu-Laporan-Pemantauan-Fachrizal-dkk.-FULL.pdf (INDEXED). It is a structured record of the hearings, useful as a reference for INCONS.
- Putusan numbers and full-session videos were **not found**. A YouTube search returned only clips.
- **Caveat:** 135 people died and victims' families are involved. Treat as sensitive.

### 1F. Recent hearings uploaded in full (2025–2026)

- **"Studio Hukum" channel.** Full witness sessions of the *Korupsi Kuota Haji Tambahan 2023–2024* trial (Tipikor Jakarta, Sep to Oct 2026), labeled by date and by prosecution witness number. Examples (INDEXED):
  - https://www.youtube.com/watch?v=G78v8WHEqA4 (8/9/2026, 1:34:03)
  - https://www.youtube.com/watch?v=CI96-YB9Ia4 (17/9/2026, 5:15:33)
  - https://www.youtube.com/watch?v=mnJ9G5a2A68 (15/10/2026, 3:49:09)
  - https://www.youtube.com/watch?v=CXhN7CilPVM (20/10/2026, 1:00:40)
  
  The case is still running, so the putusan does not exist yet. That makes it useful for live-workflow tests, but there is no ground truth yet. Who runs the channel is unknown.
- **Tom Lembong sugar-import trial (Tipikor Jakarta, 2025):**
  - https://www.youtube.com/watch?v=xLcimubgsYc (5:06:01, KOMPASTV, defendant examination)
  - Expert sessions on the "Voice of Tom Lembong" channel: `kserTq3SRuw`, `AgyE1cT4Xdo`. That channel is run by the defendant's side and may be edited.
- **Customs (Bea Cukai) bribery trial, Tipikor Jakarta, 21 Jul 2026.** Witness John Field (PT Blueray Cargo) withdrew part of his BAP about payments to the police. The presiding judge said a witness "boleh mempertahankan ... mencabut atau memperbaiki" (may keep, withdraw or correct the statement). Source: [Joglosemar News](https://joglosemarnews.com/2026/07/sidang-suap-bea-cukai-memanas-saksi-cabut-keterangan-dugaan-setoran-ke-polri/). A video of the session was not found. This is a very recent INCONS candidate to follow.

### Unsuitable or exclude

- **Mario Dandy (2023):** the victim (David) and co-defendant AG are minors. **Unsuitable.**
- **Vina Cirebon (2016; reviews and Liga Akbar's retraction in 2024–2025):** involves minors, including a juvenile defendant, and alleged sexual violence against the victim. The Supreme Court decision **1688 PK/Pid.Sus/2024** rejected Liga Akbar's retraction as novum. **Unsuitable** for the dataset. Cite it only as legal reference.
- **HF `Haeryz/putusan-structured-extraction`** (CC-BY-4.0): built from Anak, Asusila and TPPO corpora, i.e. cases involving children, sexual offences and trafficking. **Unsuitable.**

---

## 2. Verbatim transcripts with speaker labels

### 2A. Mahkamah Konstitusi "Risalah Sidang": best ground truth for ASR and diarization (VERIFIED)

- **Listing:** https://www.mkri.id/perkara/persidangan/risalah. It can be filtered with `?jenis=PUU|SKLN|PHPU...`. The listing is behind Cloudflare, so open it in a browser.
- **PDF URL pattern:** `https://www.mkri.id/public/content/persidangan/risalah/<id>_Risalah-pdf_PERKARA NOMOR <no>.PUU-<roman>.<year> tgl. <date>.pdf`. The host `s.mkri.id` works too. Downloads return HTTP 200 with no challenge.
- **Format (checked):**
  - Numbered turns, each with a role, a speaker name and an offset from the start of the hearing, e.g. `1. KETUA: ARSUL SANI [00:00]`, `2. KUASA HUKUM PEMOHON: BUCE ABRAHAM BERUAT [00:07]`.
  - Procedural cues such as `KETUK PALU 3X`, plus `SIDANG DIBUKA PUKUL 13.27 WIB` / `DITUTUP PUKUL 14.30 WIB`.
  - Each risalah states that the written record follows the audio recording.
- **Verified pair of transcript and video:**
  - Transcript: https://s.mkri.id/public/content/persidangan/risalah/11038_Risalah-pdf_PERKARA%20NOMOR%20115.PUU-XXII.2024%20tgl.%203%20September%202024.pdf. Perkara 115/PUU-XXII/2024 (KUHP and ITE judicial review), preliminary examination, 3 Sep 2024, 13:27–14:30. 622 KB, about 1,350 lines.
  - Video: https://www.youtube.com/watch?v=FUI-bAfaWsY ("Sidang Perkara Nomor 115/PUU-XXII/2024. Selasa, 3 September 2024", official Mahkamah Konstitusi RI channel, 1:03:51). The length matches the 63-minute session.
  - Later sessions of the same case: `bndCIsfchB0` (19 Sep 2024), `apdvNyMxBs0` (10 Oct 2024), `21SogcU_imE` (29 Oct 2024), `kkHgkmeO13U` (5 Dec 2024), `CRVF52gonAY` (17 Dec 2024).
- **Sessions with witness and expert examination:**
  - PHPU Presiden 2024, Perkara 1/PHPU.PRES-XXII/2024. Video `eZkRCAk2Y5Q` (1 Apr 2024, 8:20:31) and `w0AGBJ3RDKI` (4 Apr 2024, 11:54:58). The matching risalah PDFs were not located; find them through the listing.
  - PHPU Legislatif 2024, Panel 1, 31 May 2024 (witnesses and experts), INDEXED: https://mkri.id/public/content/persidangan/risalah/10645_Risalah-pdf_Risalah%20Panel%201,%20Jumat,%2031%20Mei%202024,%20Pkl%2013.30%20WIB%20rev.pdf. It returned a 302 redirect, then HTTP 200 (1.35 MB); the content type was not checked.
- **License:** public court records published by MK. The videos are on MK's official channel. No explicit open license was found, so treat as public-sector information: internal evaluation use, with attribution.
- **Caveat:** constitutional court, not a criminal trial. There is no BAP, and witnesses testify about facts, not accusations.
- **Use:** **ASR and DIAR ground truth** (verbatim text, role-labeled speakers, offsets, multi-party online and in-room audio), plus role-label mapping (KETUA / HAKIM ANGGOTA / KUASA HUKUM / SAKSI / AHLI). This is the best freely available labeled Indonesian hearing audio found.

### 2B. DPR risalah rapat (INDEXED)

- PDFs on `berkas.dpr.go.id/akd/dokumen/...`. Examples:
  - Komisi III: https://berkas.dpr.go.id/akd/dokumen/K3-23-e403224156b4dfd8c9320999495c2a87.pdf
  - BAKN RDPU of 27 Jan 2020: https://berkas.dpr.go.id/akd/dokumen/bakn-Rapat-Dengar-Pendapat-Umum-BAKN-DPR-RI-dengan-Dewan-Pimpinan-Pusat-Serikat-Pekerja-Bank-Tabungan-Negara-terkait-Dugaan-Tindak-Korupsi-dan-Praktek-Window-Dressing-Laporan-Keuangan-BTN-Tahun-2018-1724814007.pdf
- There is no central index page, and some files are marked "RISALAH SEMENTARA" (provisional) or are from closed sessions.
- The DPR TV / YouTube channel has the matching videos (not paired here).
- **Use:** extra ASR and DIAR material. Lower priority than MK.

---

## 3. Datasets

| Dataset | URL | Contents | Size | License | Status | Use |
|---|---|---|---|---|---|---|
| **Indo-Law** (UI IR-NLP) | https://github.com/ir-nlp-csui/indo-law | Criminal putusan from Direktori MA, XML with 11 section tags (identitas, riwayat perkara, fakta, fakta hukum, pertimbangan, amar…) and metadata (classification, court, sentence length) | 22,630 documents (the paper says 21,630) | README: free to use with citation (Nuranti, Yulianti & Husin 2022, *Computers* 11(6):88), **no public redistribution**; sidebar shows AGPL-3.0, which conflicts | VERIFIED | RETR; extract the "fakta" sections summarizing witness testimony for a testimony-summary corpus. Filter out Anak/Asusila cases first. |
| **IndoLER** | https://github.com/ir-nlp-csui/indoler ; paper: [IJECE 14(5) 2024](https://ijece.iaescore.com/index.php/IJECE/article/view/35275) | Legal NER, IOB tags, about 20 entity types (case number, court, defendant, prosecutor, judge, articles…), plus verdict/indictment/lawyer fields | 993 putusan, about 6M tokens, about 25k entities | **No license stated** in the repo; ask the authors | VERIFIED | Entity extraction for case setup (party names, case numbers, articles) |
| **Maleo-Short** | https://huggingface.co/datasets/maleo-ai/maleo-short (DOI 10.57967/hf/7944) ; paper: [JOIN](https://join.if.uinsgd.ac.id/index.php/join/article/view/1781) | In-the-wild Indonesian multi-speaker clips (podcasts, drama…), ELAN-annotated segmentation and transcripts; the HF card describes **metadata pointing at YouTube Shorts** | 110 clips, 1h32m | CC-BY-4.0 (card); gated ("auto") | VERIFIED (API) | DIAR baseline (published best DER 32.64%, WER 33.78%). Not courtroom audio. |
| **TITML-IDN** | https://huggingface.co/datasets/SEACrowd/titml_idn ; https://research.nii.ac.jp/src/en/TITML-IDN.html | Read speech, 20 speakers × 343 sentences | about 14.5 h | "other" (NII-SRC terms) | VERIFIED (API) | ASR only. **Not conversational, so not suitable for diarization.** |
| **SpeechDataAI Indonesian Conversational Speech** | https://huggingface.co/datasets/SpeechDataAI/indonesian-conversational-speech | 2,000 h of spontaneous two-person conversations, dual-channel, time-aligned | Card only; free samples | **Commercial license** | VERIFIED (API) | DIAR/ASR if bought; the free samples suit a quick check |
| Pyannote domain adaptation for Indonesian | https://arxiv.org/abs/2601.03684 | 25 h of synthetic TTS conversations with RTTM; zero-shot DER 53.47% improved to 29.24% | n/a | No dataset release found | VERIFIED (abstract) | Method reference only |
| Other HF legal sets | e.g. `DahonoLabs/Indonesian-Legal-Reasoning-QA` (CC-BY-4.0), `Azzindani/Indonesian_Legal_QA` (Apache-2.0) | Legal QA, mostly statutes | n/a | as listed | VERIFIED (API search) | Low relevance |

- **Courtroom audio datasets:** none found for Indonesia. No public Indonesian courtroom ASR or diarization dataset exists as far as these searches could find. The MK risalah paired with MK YouTube videos (section 2A) is the closest substitute and has to be assembled by Jude.
- **Court decision prediction:** Nasution & Suprapto 2025 (IJCCS, [journal.ugm.ac.id/ijccs/article/view/108377](https://journal.ugm.ac.id/ijccs/article/view/108377)) reuse the Indo-Law corpus. No separate release.

---

## 4. Putusan explicitly discussing testimony that differs from or retracts the BAP (Pasal 163 KUHAP)

The directory's full-text search needs a CAPTCHA, so these candidates come from secondary sources. Open each by hand to confirm, and check the case type before use.

1. **PN Singaraja 292/Pid.Sus/2012/PN.SGR** (23 Apr 2013). The panel explicitly applied Pasal 163: KUHAP does not regulate retraction, and the presiding judge must warn the witness and record the explanation. It found the witnesses' reasons for retracting unfounded ("lupa kacamata", forgot their glasses, was not accepted) and used the BAP as *petunjuk* (circumstantial evidence). Source: [hukum-hukum.com](https://www.hukum-hukum.com/2016/12/variabel-bebas-alat-bukti-keterangan-saksi.html). **UNVERIFIED** on the directory, and a site search found nothing under that number. The offence type ("Pid.Sus") is unknown, so screen it for minors first.
2. **PN Pelaihari 171/Pid.B/2018/PN Pli**, with cassation **1118 K/Pid/2018**. The defendants retracted all their BAPs, saying they were pressured. Verbalisan witnesses were called. The PN accepted the retraction and the Supreme Court took a different view. Source: thesis at [repositori.uma.ac.id/…/1441](https://repositori.uma.ac.id/jspui/handle/123456789/1441). **UNVERIFIED.**
3. **e-KTP, 41/Pid.Sus/TPK/2017/PN.JKT.PST** (Irman & Sugiharto, read 20 Jul 2017). This covers witness Miryam's full BAP retraction, the investigators as verbalisan witnesses, and the video of her questioning. Directory entry VERIFIED (section 1D). Pair it with Miryam's own false-testimony conviction (number to be found).
4. **Ferdy Sambo, 796/Pid.B/2022/PN JKT.SEL**, and **Richard Eliezer, 798/Pid.B/2022/PN Jkt.Sel**. Witness Susi's testimony differed from her BAP (31 Oct 2022). Ricky Rizal withdrew the gloves part of his BAP. Eliezer changed his BAPs from August 2022. 796 VERIFIED with PDF; 798 UNVERIFIED.
5. **PN Palangka Raya 399/Pid.Sus/2021/PN Plk** (narcotics). The defendant retracted the BAP, and the court held that a retraction alone is not enough. Source: [Trisakti journal](https://e-journal.trisakti.ac.id/index.php/refor/article/view/18639). **UNVERIFIED.**
6. *(Legal reference only, unsuitable as data)* **MA 1688 PK/Pid.Sus/2024** (Vina Cirebon). A witness retraction offered as novum was rejected. Source: [Narotama journal 2026](https://jurnal.narotama.ac.id/index.php/hukumbisnis/article/download/3607/2282). Involves minors.

**Manual search terms for the directory** (after the CAPTCHA): `"Pasal 163 KUHAP"`, `"mencabut keterangannya"`, `"berbeda dengan keterangan dalam BAP"`, `"saksi verbalisan"`. Filter by "Pidana Umum" and exclude the Anak and Kesusilaan categories.

Legal background for building test labels: [Hukumonline Klinik, "Saksi batalkan keterangan BAP di persidangan, bolehkah?"](https://www.hukumonline.com/klinik/a/saksi-batalkan-keterangan-bap-di-persidangan--bolehkah-lt62174874de8f7) and [Fungsi saksi verbalisan](https://www.hukumonline.com/klinik/a/fungsi-saksi-verbalisan-lt4f7260564b14d/).

---

## 5. Suggested test sets

1. **ASR + DIAR gold set:** 3–5 MK sessions with risalah and video (start with 115/PUU-XXII/2024 on 3 Sep 2024). Convert the `ROLE: NAME [mm:ss]` turns into reference segments. Note that the offsets are approximate (turn 7 is stamped [00:43] after turn 6 at [00:46]), so do not use them for frame-accurate DER without re-alignment.
2. **Criminal-court ASR + DIAR (no reference transcript):** the Susi session (`95j7kbp86A8` or `tyhOkQ0q1-o`), the Eliezer/Ricky/Kuat witness session (`I_Ti7W3ZZPI`), and Jessica witness Hani (`A2WC5Z2E80Q`). Hand-annotate 10–15 minutes of each for WER and DER.
3. **INCONS set:**
   - Statement side: the putusan PDFs (796/Pid.B/2022, 777/Pid.B/2016, 41/Pid.Sus/TPK/2017), which summarize each witness's testimony and sometimes the BAP content.
   - Testimony side: Jude's transcript of the matching video.
   - Expected flags: the documented differences in sections 1A and 1D, with dates.
   - The original BAPs are not public, so the "previous statement" has to be built from the putusan text and the BAP content read aloud in court (judges often read the BAP passage out).
4. **RETR:** Indo-Law XML (after filtering) plus the full putusan PDFs above.

## Open items to check by hand

- Download the 796 and 777 putusan PDFs in a browser and confirm the testimony-summary sections, including what they record about Susi's BAP.
- Find the putusan numbers for Kuat Ma'ruf (780 or 800?), Teddy Minahasa, Miryam S. Haryani (Tipikor 2017) and Kanjuruhan (PN Surabaya 2023).
- Find the MK risalah PDF for the PHPU Presiden witness sessions (1 and 4 Apr 2024).
- Confirm the terms of each YouTube channel. Use the videos only for internal evaluation.
