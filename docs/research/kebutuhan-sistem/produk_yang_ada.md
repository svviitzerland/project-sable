# Existing products and initiatives competing with or adjacent to Jude (evidence-grounded courtroom copilot), globally and in Indonesia, and their gaps

Research date: 2026-11-01. Method: about 17 web searches and fetches. Most product descriptions come from vendor pages and are marked **[vendor claim]**. Pricing for global enterprise legal AI comes mostly from third-party estimates, not vendor rate cards. Snippet-only items are flagged.

## 1. Global legal AI: who offers live testimony versus document contradiction detection, and who supports Indonesian?

### Takeaway
A small group of 2026 US/UK products now offers live or near-live testimony analysis: Loom Analytics Live Testimony Verification (launched 2026-06-17), Filevine Depo CoPilot, Verbit, and Deposely. Only Loom explicitly claims to check live testimony against an indexed evidence library with cited sources. All of them are built for US/UK civil depositions or common-law trials, and none advertises Bahasa Indonesia or Indonesian criminal procedure. The big research copilots (Harvey, CoCounsel, Lexis+ AI/Protégé) are document and research tools priced at roughly USD 125–2,400 per seat per month (third-party estimates). Courts' own AI (China, India, Brazil) does transcription, triage and research for judges, not defense-side contradiction finding.

### Cited Findings
**Live testimony versus evidence (closest competitors to Jude's core)**
- Loom Analytics "Live Testimony Verification", launched 2026-06-17 and promoted at LegalTechTalk 2026 London. It transcribes testimony in real time, searches the user's evidence library, and shows contradictions, confirmations and related evidence on a dashboard as the witness speaks. It cites sources (prior statements, police reports, "Exhibit A") and exports timestamped records. Its illustrative example shows a "97% confidence" contradiction. Stated audiences are trial counsel, judges/hearing officers, law enforcement and in-house counsel. It can ingest a court reporter's Real-Time Capture feed. No languages, jurisdictions or pricing are stated. **[vendor claim]** — [Loom Analytics](https://www.loomanalytics.com/articles/live-testimony-verification)
- Filevine Depo CoPilot offers "real-time transcripts and AI insights", timestamped speaker tags, audio-synced lines, and AI that will "surface contradictions, vague responses, and missed opportunities". It also suggests live follow-up questions. Users can attach case files and reference "past depos, contracts, and medical records". The page does not say contradictions are checked against those documents. No language or pricing information; demo only. **[vendor claim]** — [Filevine Depo CoPilot](https://www.filevine.com/p/depo-copilot-transforms-depositions-expanded/); [Filevine webinar](https://filevine.com/webinars/live-demo-what-ai-powered-depositions-actually-look-like/)
- Verbit markets live legal transcription with flagging and contradiction/inconsistency detection across testimony (search summary of its "Legal Visor" deposition playbook). Its Legal Capture product pairs its legal-trained "Captivate" ASR with human review for admissible transcripts and claims multi-speaker recognition and timestamps. On 2026-08-06 it announced a partnership with eSteno to deploy Legal Capture to Latin American court systems; this was seen via a job-aggregator reproduction, not the original release. **[vendor claim]** — [Verbit playbook](https://info.verbit.ai/legal-visor-deposition-playbook); [Verbit courtroom](https://verbit.ai/courtroom-transcription); [Simplify (Verbit news)](https://simplify.jobs/c/Verbit)
- Deposely LX is described as an "AI second chair for depositions" with live transcription (directory listing only, not verified further). — [Legal Technology Hub](https://www.legaltechnologyhub.com/vendors/deposely/)
- Lexitas Deposition Insights+ lists contradiction and key-admission identification, but the page still labels it "coming soon". This is post-deposition, not live. — [Lexitas](https://www.lexitaslegal.com/solutions/deposition-insights-plus)
- V7 Labs offers an agent that compares testimony across deponents, or one deponent over time, to flag inconsistencies (post hoc). — [V7 Labs](https://www.v7labs.com/automations/deposition-transcript-analysis)
- Opus 2 Magnum Realtime is a live hearing portal. It time-stamps the transcript, annotations, chat and exhibits on a "Wall", shows bundles and previous transcripts beside the live feed, and syncs audio to the final transcript. Its AI features as of 2026 are deposition-designation oriented: an agent flags passages relevant to issues (LawNext, Sept 2026). No live contradiction detection was found. — [Opus 2 transcription](https://www.opus2.com/transcription.html); [LawNext 2026-09](https://www.lawnext.com/2026/09/opus-2-ingenuity-transforms-deposition-designations-with-innovative-use-of-agentic-ai.html)
- Quality caveat: GoTranscript QA guidance warns that AI deposition summaries can invent facts, swap speakers, soften admissions, and "turn uncertainty into certainty". — [GoTranscript](https://gotranscript.com/en/blog/ai-deposition-summary-qa-checklist-prevent-hallucinations-misquotes)
- Bloomberg Government (2026-10-06) ran the headline "AI Transcription Savings May Outweigh Errors, Texas Justices Say". Only the headline was seen. — [Bloomberg Government](https://news.bgov.com/litigation/ai-transcription-savings-may-outweigh-errors-texas-justices-say)

**Research and drafting copilots (pricing is third-party estimates; no official 2026 rate cards found)**
- Harvey has no public price list. Estimates are about USD 1,200/seat/month with 20-seat minimums, or about USD 2,400 with the Lexis bundle. One outlier source says "starting around $100/user/month". — [Vaquill](https://www.vaquill.ai/blog/harvey-ai-price-increase-per-seat-2026); [Artificial Lawyer 2025-06-30](https://www.artificiallawyer.com/2025/06/30/harvey-lexisnexis-the-potential-pricing-impact/); [Costbench](https://costbench.com/compare/harvey-ai-vs-cocounsel/)
- Thomson Reuters CoCounsel: Core seat about USD 225/month; Westlaw-tier about USD 639–750/month (estimates conflict). — [Vaquill](https://www.vaquill.ai/blog/harvey-legora-cocounsel-pricing-reality-2026); [Costbench](https://www.costbench.com/compare/cocounsel-vs-harvey/)
- Lexis+ AI / Protégé is quote-based, estimated at USD 128–494/user/month, or USD 250–500 all-in. Lexis says pricing "varies". — [Vaquill Lexis+ AI pricing](https://www.vaquill.ai/blog/lexis-plus-ai-pricing)
- A Justisio blog post (2026-05-23) lists Lexis+ AI as used by large corporate firms handling Indonesian-law work, for conversational search, drafting and contract-risk analysis. This is a competitor's blog and is weak evidence. — [Justisio](https://justisio.com/blog/top-5-ai-riset-hukum-indonesia-2026)

**AI rehearsal and trial simulators (adjacent to Jude's rehearsal mode)**
- MockTrialOnline is free and covers 8 trial phases. It has an AI judge that rules on objections, witnesses that behave differently on direct and cross, and 4-dimension scoring. trialOS (LitigationLabs) offers AI-agent courtroom simulation under evidence rules. Supreme Mind runs a cross or deposition "20+ different ways". DepoSim (Altaclaro) provides an AI witness, opposing counsel and court reporter. Atelier simulates an evasive witness. LexPar AI and LeetCourt are hackathon projects with voice opposing counsel and a judge scorecard. LexAI is an open-source project with contradiction detection during cross. All are US/common-law and English. — [hunted.space MockTrialOnline](https://hunted.space/product/mocktrialonline); [LTH LitigationLabs](https://www.legaltechnologyhub.com/vendors/litigationlabs/); [LTH Supreme Mind](https://www.legaltechnologyhub.com/vendors/supreme-mind); [LTH DepoSim](https://www.legaltechnologyhub.com/vendors/deposim-by-altaclaro/); [lablab LexPar](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-ii/monolith-one/lexpar-ai); [GitHub LexAI](https://github.com/naimakader/Lexai); [Bloomberg Law](https://news.bloomberglaw.com/ip-law/ai-flight-simulators-will-replace-grunt-work-in-lawyer-training)

**Court-side AI abroad**
- China: courts have deployed OCR, automatic speech recognition and NLP for automated trial transcription. By the end of 2022, "smart courts" had AI in most core adjudication and enforcement processes across basic-level courts. Critics call it surveillance-oriented. — [Stimson 2026](https://www.stimson.org/2026/ai-in-global-majority-judicial-systems/); [BTLJ 40.4 Ferrari (2026)](https://btlj.org/wp-content/uploads/2026/03/40.4_Ferrari.pdf)
- India: SUPACE assists Supreme Court judges with research, case summaries and case law. Digital Courts 2.1 provides voice-to-text and translation. SUVAS was not confirmed in the results. — [Sify](https://www.sify.com/ai-analytics/5-6-cr-pending-cases-how-india-is-letting-ai-slip-through-even-as-world-courts-revolution/); [Informatica 2023](https://www.informatica.si/index.php/informatica/article/view/4361)
- Brazil: the STF's VICTOR classifies cases for general-repercussion review, and SIGMA assists judges in drafting decisions. — [Techloy](https://www.techloy.com/how-brazilian-courts-are-turning-to-ai-to-fight-overload/)

### Inferences
- Loom Analytics is the closest functional analogue to Jude's testimony-versus-BAP flagging. Its "97% confidence" framing contrasts with Jude's exact-verified-quote approach. Jude can position itself as "quote-verified, not a confidence score".
- Global products assume US/UK proceedings (depositions, court reporters, stenographic feeds, exhibits) and English. None is set up for KUHAP-style hearings where the BAP is the core prior statement and the defense has no deposition stage.
- Enterprise pricing (USD 100s–1,000s per seat per month) is far beyond solo or small Indonesian criminal defense practices.

### Gaps
- No vendor in this group states Bahasa Indonesia support for live contradiction features. Absence of a claim is not proof of absence.
- Clio Duo, vLex Vincent, Casetext (now inside CoCounsel), EvenUp, Everlaw/Relativity transcript analysis, CaseMark, LiveNote/CaseView, Rev and Otter were not individually researched in this pass due to tool budget. From background knowledge, which is unverified here: these are document, eDiscovery, personal-injury demand or generic transcription tools without live testimony-versus-document checking.
- No independent accuracy evaluation of any live contradiction tool was found.
- No specific US court AI transcription pilot was confirmed beyond the Texas headline.

## 2. Indonesia: legal AI, court digital systems, and Indonesian ASR

### Takeaway
Indonesian legal AI in 2026 is research and regulation focused: Hukumonline AIlex, Veritask, Justisio, Klaussa and Pasal.id. Court digitization (SIPP, e-Court, e-Berpadu, Smart Majelis) handles administration, case files and judge assignment, not in-hearing analysis for advocates. No Indonesian product was found that live-transcribes hearings or checks testimony against the BAP for criminal defense. Indonesian ASR with diarization exists as general APIs (Speechmatics, AssemblyAI, Deepgram, ElevenLabs, Whisper) and local meeting tools (Prosa.ai Meemo), not as courtroom products.

### Cited Findings
**Hukumonline (AIlex / Ask Hukumonline AI)**
- Hukumonline launched what it calls Indonesia's first generative-AI legal research platform in Sept 2024; the date comes from a secondary source. **[vendor claim: "first"]** — [Yespress](https://yespress.io/hukumonline-com); [SWA](https://swa.co.id/read/451149/hukumonline-optimalkan-ai-untuk-akurasi-dan-kecepatan-di-riset-hukum); earlier GPT chatbot beta: [Hukumonline](https://www.hukumonline.com/berita/a/hukumonline-kembangkan-chatbot-berbasis-teknologi-gpt-lt643e54b6eb6a4?page=all)
- "AIlex for Good" (article dated 2026-06-05) gave free AIlex access to chairs and officers of 13 Peradi DPC branches (North/West/Central/East Jakarta, Papua, Wates, Mataram, Jambi, Bantul, Padang, Tasikmalaya, Greater Bekasi, Malang Regency). It was later extended to LBH PP GP Ansor. AIlex Classroom gives academics 2 months free. — [Hukumonline 2026-06-05](https://www.hukumonline.com/berita/a/program-hukumonline-ailex-for-good--13-dpc-peradi-dapat-akses-gratis-ai-riset-hukum-lt6a2235dc4a27a/); [Hukumonline (GP Ansor)](https://www.hukumonline.com/berita/a/hukumonline-perluas-manfaat-ailex-for-good-ke-lbh-pp-gp-ansor-lt6a6323a2ac6d6/); [AIlex Classroom](https://www.hukumonline.com/berita/a/akses-ailex-classroom-gratis-dibuka--saatnya-sivitas-akademika-naik-kelas-dalam-riset-lt69eb43aba392f)
- AIlex is described as giving direct answers with references to articles and Hukumonline analysis, built on decades of curated regulations and decisions. This is from a competitor's blog. — [Justisio 2026-05-23](https://justisio.com/blog/top-5-ai-riset-hukum-indonesia-2026)

**Other Indonesian legal AI**
- Veritask AI claims 300,000+ regulations, 3M+ articles and 1M+ decisions. Features include the "AiYU" chatbot with citations, a confidence level and a "Terverifikasi" badge; a regulation status/amendment database; drafting, review and translation; legal opinions and risk scoring; Law Firm 360; and Litigation OS (case strategy, evidence and deadline tracking). It offers a 7-day free trial; prices were not on the page. It does not mention criminal (pidana) work, courtroom use or transcription. **[vendor claim]** — [Veritask](https://veritask.ai/id); [About](https://veritask.ai/en/tentang-kami)
- Justisio is an AI research agent with flowchart visualization, regulation consolidation and harmonization support. It offers a 24-hour free trial and individual subscriptions. **[vendor claim; self-ranked #1 on its own blog]** — [Justisio blog](https://justisio.com/blog/top-5-ai-riset-hukum-indonesia-2026); [Justisio pricing](https://justisio.com/pricing)
- Klaussa indexes 3M+ articles and answers plain-language questions with the full article text; it targets in-house counsel. — [Justisio blog](https://justisio.com/blog/top-5-ai-riset-hukum-indonesia-2026)
- Pasal.id is a free, AI-native, machine-readable database of Indonesian regulations. It has a REST API, a Python client (PyPI, released 2026-03-18), and an MCP server that can search regulations, resolve references, read text by selector and search Constitutional Court decisions. Coverage claims conflict: 100,000+ regulations and 2M articles, versus 40,143 regulations and 937,155 Pasal in its GitHub README. Its terms prohibit redistributing the structured database wholesale. The official peraturan.go.id offers only PDF downloads. — [Pasal.id connect](https://pasal.id/connect); [GitHub README](https://raw.githubusercontent.com/ilhamfp/pasal/HEAD/README.md); [PyPI](https://pypi.org/project/pasal/); [Terms](https://pasal.id/id/ketentuan); [Editorial policy](https://pasal.id/id/kebijakan-editorial)
- Justika is a marketplace connecting clients to advocates (seed funded by East Ventures and Skystar; date not shown). Its CEO said Indonesia had at least 21 legaltech companies, second in Southeast Asia after Singapore's 25 (older claim). — [DailySocial](https://en.dailysocial.id/post/initial-funding-justika-east-ventures-skystar-capital); [Hukumonline](https://www.hukumonline.com/berita/a/perkuat-kemitraan-regional--justikacom-ikut-luncurkan-asean-legaltech-lt5d56304e3e809)
- IndoHukum and Hukumku appear only as Stanford CodeX TechIndex entries without detail. — [CodeX IndoHukum](https://techindex.law.stanford.edu/companies/indohukum)

**Mahkamah Agung and justice-sector systems**
- Smart Majelis is MA's AI decision-support system that assigns judicial panels by qualification, competence and workload. It is used at MA for cassation and PK, with a target of first-instance and appellate courts by the end of 2025. A Badilag pilot in religious courts was announced on 8 Aug 2025. Hukumonline has discussed its ethical challenges. — [MARINews 5 hal](https://marinews.mahkamahagung.go.id/berita/5-hal-penting-yang-harus-kamu-ketahui-tentang-smart-majelis-0ga); [MARINews Badilag pilot](https://marinews.mahkamahagung.go.id/berita/badilag-umumkan-pemberlakuan-pilot-project-smart-majelis-0tD); [Hukumonline ethics](https://www.hukumonline.com/berita/a/smart-majelis-dan-tantangan-etika-pemanfaatan-ai-di-lingkungan-peradilan-lt6971cc27af348/); [Dandapala SIPP 6.0.1](https://dandapala.com/article/detail/sipp-601-hadirkan-smart-majelis-untuk-perkuat-kredibilitas-pengadilan); [Katadata](https://katadata.co.id/amp/berita/nasional/64e2fbd5c54f5/permudah-penanganan-perkara-ma-rilis-aplikasi-berbasis-ai/)
- A speaker at a forum in Brunei, reported by MARINews, said AI *could* help compile trial transcripts. This is a stated possibility, not a deployed feature. The same report notes accuracy, bias and privacy risks. — [MARINews](https://marinews.mahkamahagung.go.id/berita/ma-kenalkan-smart-majelis-di-forum-syariah-nusantara-0bzF); [MARINews AI article](https://marinews.mahkamahagung.go.id/artikel/artificial-intelligence-peluang-dan-tantangan-pemanfaatan-0q8)
- e-Berpadu (Elektronik Berkas Pidana Terpadu), launched 19 Aug 2022, digitizes criminal case administration. It links courts with Polri, Kejaksaan, KPK and Ditjenpas, under Perma 8/2022 (amending Perma 4/2020) and SK KMA 239/KMA/SK/VIII/2022. Field obstacles include the preparation of electronic case files by prosecutors and investigators. Photo, video or audio recording during hearings requires the presiding judge's permission (per search summary). — [PN Sukadana brochure](https://pn-sukadana.go.id/2021/pdf/Brosur/Brosur_Pidana_EBerpadu.pdf); [e-Berpadu manual](https://eberpadu.mahkamahagung.go.id/resources/manual/BUKU_PANDUAN_EBERPADU_Ver_4_SEPT_2023.pdf); [Perma 4/2020](https://jdih.mahkamahagung.go.id/legal-product/perma-nomor-4-tahun-2020/download/dokumen)
- Overview of MA and MK AI use: — [Hukumonline](https://www.hukumonline.com/berita/a/melihat-penerapan-artificiai-intelligence-oleh-ma-dan-mk-lt66b76f620a8ab/?page=all)

**Indonesian ASR**
- Prosa.ai is an Indonesian NLP and speech company. Products include Speech-to-Text, Meeting Transcription (Meemo) and Voice Biometric (speaker recognition, which is not diarization). Listed customers are BPJS Kesehatan, Revcomm and Bio Farma; no judicial customers were found. — [SI Lab directory](https://www.thesilab.com/vendor-directory/prosa-ai); [Kontan](https://momsmoney.kontan.co.id/news/prosaai-aplikasi-ai-bantu-pekerjaan-karyawan)
- General Indonesian STT vendors: Speechmatics (including real-time Indonesian), AssemblyAI (Indonesian page lists speaker diarization), Deepgram, ElevenLabs, and STT.ai. A TECHNOPEX-2025 academic paper built Indonesian meeting minutes on Whisper. — [Speechmatics](https://www.speechmatics.com/speech-to-text/indonesian); [AssemblyAI](https://www.assemblyai.com/languages/indonesian); [Deepgram](https://deepgram.com/product/speech-to-text/indonesian); [ElevenLabs](https://elevenlabs.io/pl/speech-to-text/indonesian); [ITI paper](https://semnas.iti.ac.id/tpx/index.php/c/article/download/227/76/875)

### Inferences
- The Indonesian market leader (Hukumonline) is already courting Peradi advocates with free AIlex access, but its product is research, not hearing support. Jude would complement it rather than replace it. Pasal.id integration lets Jude offer legal references without licensing Hukumonline content.
- e-Berpadu digitizes BAP and case files between agencies. This could eventually make BAP ingestion easier, but advocates' access to it was not confirmed.
- The judge-permission rule on audio recording is a real operational constraint for live transcription in Indonesian courtrooms. Jude needs a consent and permission workflow and should treat outputs as notes, not official records.

### Gaps
- Perqara, Legalku, Kontrak Hukum, LexMind and Lexin were not found in this pass; their status and features are unknown.
- Kejaksaan and Polri systems (e.g., CMS Kejaksaan, e-Manajemen Penyidikan) were not researched individually.
- Bahasakita, Notula and Google STT Indonesian diarization quality were not verified. No published WER/DER benchmarks on Indonesian courtroom audio were found.
- Whether advocates can access e-Berpadu documents is unconfirmed.

## 3. Pricing and market for Indonesian advocates

### Takeaway
Indonesian legal AI is priced for organizations: Hukumonline Pro tiers are reported at Rp 5–12.5 million per month. Free and trial access is used as a wedge (AIlex for Good, Veritask 7 days, Justisio 24 hours). No per-advocate courtroom tool price exists to benchmark against.

### Cited Findings
- Search summary of Hukumonline pages: Pro Intelligence packages are Pro at Rp 5,000,000/month, Pro AI at Rp 8,200,000/month ("terfavorit"), and Pro Compliance at Rp 12,500,000/month. These appear organization-oriented. **Unverified: the exact source URL could not be confirmed, and the fetched AIlex for Good page showed no prices.** — [Hukumonline (search result set)](https://www.hukumonline.com/berita/a/program-hukumonline-ailex-for-good--13-dpc-peradi-dapat-akses-gratis-ai-riset-hukum-lt6a2235dc4a27a/)
- Veritask offers a 7-day free trial with no card required; Justisio offers a 24-hour free trial and individual subscriptions. — [Veritask](https://veritask.ai/id); [Justisio pricing](https://justisio.com/pricing)
- Global copilots cost about USD 128–2,400 per seat per month (third-party estimates; see Section 1).

### Inferences
- A solo or small-firm criminal defense price point well below Rp 5 million per month, or a per-case or per-hearing model, plus pro bono and LBH access, would be uncontested. Hukumonline's Peradi/LBH program shows that bar associations and legal aid organizations are a working distribution channel.

### Gaps
- No data was found on the number of Indonesian criminal defense advocates, their income, or their willingness to pay.

## 4. Legaltech hackathons and competitions (Indonesia and ASEAN): what judges rewarded

### Takeaway
No documented 2025–2026 Indonesian legaltech hackathon winners or judging criteria were found. Known events are the 2019 @america–IRLA/Jakarta Legal Hackers hackathon and the LexisNexis Asia AI Hackathon 2026 (winners announced 2026-10-08, awards 2026-10-29; names not seen).

### Cited Findings
- LexisNexis Asia AI Hackathon 2026 timeline: proposals due 2026-09-13, online judging 24–30 Sept, winners announced 2026-10-08, awards 2026-10-29. Winner names were not on the pages fetched. — [LexisNexis Asia](https://asia.lexisnexis.com/ai-hackathon-2026); [LexisNexis HK blog](https://www.lexisnexis.com/blogs/hk-legal/b/industry-insights/posts/lexisnexis-asia-ai-hackathon-2026)
- The @america–IRLA Regtech/Legaltech Hackathon (Indonesia Regtech and Legaltech Association with Jakarta Legal Hackers) was held in 2019; no winner data was found. — [hackathon.com](https://www.hackathon.com/event/america-irla-regtech-legaltech-hackathon-84371325907); [@america](https://atamerica.or.id/events/detail/the-competition-of--america-hackathon-legal-technology)
- UI Fasilkom students built AI to test regulatory harmony (undated; likely linked to Satria Data 2023). — [Hukumonline](https://www.hukumonline.com/berita/a/calon-legaltech-penguji-keharmonisan-regulasi-berhasil-diciptakan-mahasiswa-ui-lt64eebd2f1b53a)
- Global hackathon courtroom projects (LexPar AI, LeetCourt) emphasized voice interaction and live AI opposing counsel and judges. — [lablab LexPar](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-ii/monolith-one/lexpar-ai); [AI Tinkerers](https://aitinkerers.org/hackathons/h_1de1QREJyuU/entries/ht_0IeR1gTrAIY)

### Inferences
- Visible Indonesian legal AI projects lean toward regulation harmony and research. A live-hearing, criminal-defense tool would stand out as novel against that baseline.

### Gaps
- Judging rubrics for Indonesian or ASEAN legaltech competitions were not found. The LexisNexis Asia 2026 winners need a follow-up check.

## 5. Gaps Jude can exploit

### Takeaway
Combining the findings above, Jude's unoccupied space is: Indonesian-language live hearing transcription with diarization, plus testimony-versus-BAP checks backed by exact verified quotes, plus Indonesian statute retrieval, plus a KUHAP-style rehearsal, priced and distributed for Indonesian criminal defense advocates.

### Cited Findings
- Live contradiction tools exist only for US/UK depositions and trials and claim no Indonesian support. — [Loom](https://www.loomanalytics.com/articles/live-testimony-verification); [Filevine](https://www.filevine.com/p/depo-copilot-transforms-depositions-expanded/)
- Indonesian legal AI is research and compliance oriented, with no courtroom or transcription features. — [Veritask](https://veritask.ai/id); [Justisio](https://justisio.com/blog/top-5-ai-riset-hukum-indonesia-2026)
- MA's AI (Smart Majelis) is court-administration side, and AI trial transcripts are only an aspiration. — [MARINews](https://marinews.mahkamahagung.go.id/berita/ma-kenalkan-smart-majelis-di-forum-syariah-nusantara-0bzF)
- Hallucinated or misattributed quotes are a documented risk of AI transcript summaries. — [GoTranscript](https://gotranscript.com/en/blog/ai-deposition-summary-qa-checklist-prevent-hallucinations-misquotes)
- Rehearsal simulators are US/common-law (jury, objections), not an Indonesian majelis hakim/JPU/PH format. — [hunted.space MockTrialOnline](https://hunted.space/product/mocktrialonline)

### Inferences
- **Language:** no live contradiction product supports Bahasa Indonesia, while Indonesian STT with diarization is available as commodity APIs, so the barrier is integration and the legal domain, not core ASR.
- **Criminal defense focus:** global tools target civil litigation (depositions, personal injury); Indonesian tools target corporate and compliance work. Defense-side BAP versus testimony is unserved.
- **Live hearing context:** only Loom, Filevine, Verbit and Deposely operate live, and all in common-law deposition or trial settings.
- **Verifiable citations:** competitors show "confidence %" (Loom) or "Terverifikasi" badges (Veritask) without exposing the quote-matching mechanism. Exact verified quotes from both the transcript and the BAP is a defensible differentiator.
- **Offline and privacy:** no Indonesian vendor advertises local or offline mode. Jude's local SQLite mode and portable archive address client-confidentiality concerns, and Verbit-style SOC 2 claims set the bar.
- **Price:** Rp 5M+ per month organizational pricing leaves the solo advocate and LBH segment open; distribution through Peradi and LBH is proven by Hukumonline.
- **Risks:** judge permission is required to record hearings; Hukumonline could extend AIlex into litigation support; Loom or Verbit could localize (Verbit is already expanding into Latin American courts).

### Gaps
- No user research on Indonesian advocates' in-hearing workflow or demand was found in this pass.
