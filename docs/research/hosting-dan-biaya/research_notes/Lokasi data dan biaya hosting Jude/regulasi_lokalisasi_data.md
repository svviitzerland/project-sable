# Indonesian data localization and cross-border transfer rules for Jude (as of 2 November 2026)

Scope: whether a cloud SaaS for criminal defense advocates (case documents, BAP, court decisions, hearing audio and transcripts, AI findings, voiceprints) must keep data in Indonesia, and on what conditions data may be stored or processed abroad (currently AWS Singapore ap-southeast-1, with Bedrock global cross-region inference).

Source caveat: many PP 33/2026 details below come from law-firm and consultancy summaries, not the gazetted text (Lembaran Negara 2026 No. 88). Article numbers attributed to PP 33/2026 must be checked against the official text on peraturan.go.id or JDIH Setneg. Statements about UU 27/2022 and UU 18/2003 marked "(not re-fetched this session)" come from the statute text as previously known and should be verified on peraturan.bpk.go.id before publication.

## 1. PP 71/2019 (PSTE) and Permenkominfo 5/2020: public vs private scope, localization, PSE registration

### Takeaway
Jude is a private-scope electronic system operator (PSE Lingkup Privat). PP 71/2019 lets private-scope operators manage, process and store data in Indonesia, abroad, or both, provided ministries and law enforcement can still supervise and access it. Mandatory local storage applies to public-scope operators (state agencies and institutions they appoint). Jude must register as a PSE Lingkup Privat through OSS, and Komdigi actively enforced this through 2026 by cutting off access.

### Cited Findings
- PP 71/2019 defines public-scope PSE as "instansi penyelenggara negara dan institusi yang ditunjuk instansi". Private scope covers operators supervised by ministries or agencies, and those running portals, websites or apps for trade, financial transactions, paid digital content, communications, search, or **personal data processing** — [Hukumonline, Mengenal pokok-pokok aturan baru PP PSTE (2019)](https://www.hukumonline.com/berita/a/mengenal-pokok-pokok-aturan-baru-pp-pste-lt5de653d86d627/?page=all)
- Public scope: "wajib melakukan pengelolaan, pemrosesan, dan/atau penyimpanan SE/DE di wilayah Indonesia", except where "teknologi penyimpanan tidak tersedia di dalam negeri" (a committee of Kominfo, BSSN, BPPT and others decides) — [Hukumonline (2019)](https://www.hukumonline.com/berita/a/mengenal-pokok-pokok-aturan-baru-pp-pste-lt5de653d86d627/?page=all). These are PP 71/2019 Art. 20 (public scope) and Art. 21 (private scope). The source did not print the article numbers. Commonly cited numbering, consistent with Art. 20(7) being the basis for Permenkomdigi 5/2025 (below).
- Private scope "may store data inside Indonesia, abroad, or both". If abroad, it "wajib memastikan efektivitas pengawasan oleh Kementerian atau Lembaga" and law enforcement. Financial-sector operators are further governed by BI and OJK — [Hukumonline (2019)](https://www.hukumonline.com/berita/a/mengenal-pokok-pokok-aturan-baru-pp-pste-lt5de653d86d627/?page=all)
- Government data classification at the time: strategic data must stay in Indonesia, and data funded by APBN or public funds stays domestic. High-risk data with limited impact may go abroad only with regulator approval, and low-risk data may go abroad — [Hukumonline (2019)](https://www.hukumonline.com/berita/a/mengenal-pokok-pokok-aturan-baru-pp-pste-lt5de653d86d627/?page=all). This classification was described in 2019 commentary. I found no 2026 instrument that formally applies it to private-scope operators.
- "PP 71/2019 secara tegas mengatur kewajiban pengelolaan, pemrosesan dan penyimpanan ... khususnya PSE lingkup publik di dalam negeri dengan pengecualian terbatas". For private PSE, data center placement depends on the data classification — [search summary of Hukumonline/SIP Law coverage](https://www.hukumonline.com/berita/a/pp-pste-dikhawatirkan-ganggu-kedaulatan-data-lt5dc0b5f2420a8?page=all)
- Permenkomdigi No. 5 of 2025 on PSE Lingkup Publik was issued under PP 71/2019 Art. 20(7) — [PM Komdigi No 5 Tahun 2025 (domain.go.id)](https://domain.go.id/file-landing/PM-Komdigi-No-5-Tahun-2025.pdf). Its content was not fetched in this session.
- Permenkominfo 5/2020 Art. 1(6) classifies cloud computing providers as PSE Lingkup Privat. Art. 7(2): operators without a Tanda Daftar PSE may have access blocked. PP 71/2019 Art. 6(3) jo. Art. 2(2)(b) is cited for the registration obligation. SIP Law also notes that the data-in-Indonesia obligation applies to public-service PSEs under UU 25/2009 and PP 96/2012 — [SIP Law Firm, Cloud computing](https://siplawfirm.id/resources/cloud-computing)
- Primary texts: [PP 71/2019 (BPK)](https://peraturan.bpk.go.id/Details/122030/pp-no-71-tahun-2019); [Permenkominfo 5/2020 (BPK)](https://peraturan.bpk.go.id/Details/203049/permenkominfo-no-5-tahun-2020)
- 2026 enforcement: Komdigi says registration still rests on PM Kominfo 5/2020 and runs through OSS. On 16 September 2026 it sent notices to 25 PSE Lingkup Privat (23 domestic, 2 foreign) with a 22 September 2026 deadline, warning of warning letters and access termination. An earlier group had a 13 July 2026 deadline — [Kompas, 9 Jul 2026](https://nasional.kompas.com/read/2026/07/09/12144631/komdigi-baru-3-dari-25-pse-wajib-daftar-yang-penuhi-komitmen); [Tirto](https://tirto.id/komdigi-peringatkan-25-pse-privat-segera-penuhi-kewajiban-daftar-hCZ3); [GEBRAK.ID, Sep 2026](https://www.gebrak.id/2026/09/komdigi-minta-25-pse-segera-penuhi-kewajiban-pendaftaran-tenggat-22-september-2026.html)
- On 25 February 2026 Komdigi restricted login on auth.wikimedia.org because Wikimedia had not registered as a PSE Privat — [ePPID Komdigi](https://eppid.komdigi.go.id/berita/detail/kemkomdigi-batasi-fitur-login-wikimedia-karena-belum-daftar-pse-privat)
- Registration portal: [pse.komdigi.go.id](https://pse.komdigi.go.id/home)

### Inferences
- Jude, sold to private advocates, law firms and NGO legal aid organizations, is a private-scope PSE. PP 71/2019 does not by itself force Indonesian hosting for that customer base. Hosting in AWS Singapore is permissible if Jude can give Komdigi and law enforcement effective access to systems and data, which Permenkominfo 5/2020 requires.
- Jude processes personal data for users in Indonesia, so it falls within the PSE Lingkup Privat registration duty. Registration is through OSS and requires an Indonesian legal entity (or foreign-PSE registration). Without it, access can be blocked, a risk Komdigi demonstrably exercised in 2026.
- The public-scope localization rule becomes relevant if Jude is procured or operated for a state agency (a court, the Attorney General's Office, BPHN itself) or an institution appointed by one. A legal aid organization funded by BPHN is still a private entity, so funding alone probably does not make Jude public-scope. Data "funded by APBN" was flagged for domestic storage in the 2019 classification, which creates residual uncertainty.
- No new ministerial regulation replacing Permenkominfo 5/2020 was found through November 2026. The Kominfo-to-Komdigi rename (October 2024) did not change the private-scope rules found here.

### Gaps
- I could not fetch the verbatim text of PP 71/2019 Art. 20–21 or Permenkominfo 5/2020 Art. 2, 21 and 36 (access for supervision and law enforcement) this session. Verify against BPK.
- The content of Permenkomdigi 5/2025 (public-scope PSE), including whether it defines "institutions appointed by agencies" in a way that could catch vendors to courts, was not reviewed.
- I found no 2025–2026 Komdigi regulation on cloud or data-center classification applying to private-scope PSEs.

## 2. UU 27/2022 (UU PDP) and PP 33/2026: enforcement status, Lembaga PDP, cross-border transfer, specific data, DPIA, roles, penalties

### Takeaway
UU PDP has been fully applicable since 17 October 2024. Its implementing regulation, PP 33/2026, was signed and promulgated on 16 July 2026 and takes effect on 16 January 2027. The PDP agency still did not exist as of September 2026 (a Perpres was awaiting presidential signature). Cross-border transfer follows a tiered order: adequacy, then appropriate safeguards (agency-issued SCCs or BCRs), then consent as a limited last resort. The adequacy list and SCCs depend on the agency that doesn't exist yet, so in practice controllers rely on documented safeguards plus consent. Jude processes specific personal data (biometric voiceprints and data on criminal proceedings) with AI, which triggers a DPIA and likely a DPO.

### Cited Findings
**Status and timeline**
- PP 33/2026 was signed by President Prabowo and promulgated on 16 July 2026 (LN 2026 No. 88). It has 225 articles in 12 chapters and takes effect on 16 January 2027 (Art. 225) — [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp); [SIP Law Firm](https://siplawfirm.id/id/publikasi/pp-33-2026-pelindungan-data-pribadi)
- Kompas reported that the PP circulated among industry only weeks after enactment, and called it a leaked copy — [Kompas.id](https://www.kompas.id/artikel/peraturan-pelaksana-uu-pdp-akhirnya-terbit-lembaga-pengawas-masih-dinanti)
- Hukumonline: UU PDP criminal provisions already apply and convictions exist, but the technical procedures depend on PP 33/2026 taking effect and on the agency operating — [Hukumonline](https://www.hukumonline.com/berita/a/pelindungan-data-pribadi-dalam-penegakan-hukum-dan-konfigurasi-beracara-di-bawah-pp-33-2026-lt6ac4acd9db1bd/)
- UU PDP's two-year transition ended on 17 October 2024 (Art. 74), after which it applies in full. *(UU 27/2022 text, not re-fetched this session)* [UU 27/2022 (BPK)](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022)

**Lembaga PDP**
- UU PDP Art. 58(5) requires the agency to be created by Perpres. A draft Perpres went public in late February 2026 and was sent to the State Secretariat. Under it, the agency would be a non-ministerial body reporting to the President through Komdigi, led by a Head and three deputies — [AHP client update, 11 Mar 2026](https://www.ahp.id/indonesias-pdp-law-updates-dpa-u-s-traderelated-data-transfers-and-recent-court-rulings/)
- The draft was submitted to the President on 20 May 2026 and was still unsigned in September 2026. In the interim, Komdigi's Directorate General of Digital Space Supervision performs the PDP function. Case No. 236/PUU-XXIV/2026 at the Constitutional Court challenges UU PDP Art. 58(5) and 61 over the delay — [Kompas, 27 Jul 2026](https://nasional.kompas.com/read/2026/07/27/15423511/komdigi-ungkap-perpres-pembentukan-badan-perlindungan-data-pribadi-sedang); [Kompas, 4 Sep 2026](https://nasional.kompas.com/read/2026/09/04/17150021/segera-bentuk-badan-pelindungan-data-pribadi?page=all); [ANTARA Jatim](https://jatim.antaranews.com/berita/1031282/kemkomdigi-targetkan-pembentukan-badan-pdp-rampung-2026)

**Cross-border transfer**
- UU PDP Art. 56 requires the controller to ensure the destination jurisdiction offers protection equal to or higher than the PDP Law. AHP expects this to be met through a formal adequacy decision by the agency — [AHP](https://www.ahp.id/indonesias-pdp-law-updates-dpa-u-s-traderelated-data-transfers-and-recent-court-rulings/)
- Structure of Art. 56 *(UU 27/2022 text, not re-fetched this session)*:
  - (2) Adequacy: the destination's protection must be equal or higher.
  - (3) If adequacy is not met, adequate and binding safeguards are required.
  - (4) If neither is met, the data subject's consent is required.
- The Constitutional Court rejected a challenge to Art. 56, holding that adequacy assessment is an executive-administrative matter and the tiered framework is constitutional — [AHP](https://www.ahp.id/indonesias-pdp-law-updates-dpa-u-s-traderelated-data-transfers-and-recent-court-rulings/)
- PP 33/2026 Art. 162–165, per secondary sources:
  - Art. 162–164: the controller must assess transfer risks and inform data subjects before transfer.
  - Art. 165, adequacy: the agency publishes a list of adequate countries.
  - Art. 165, safeguards: agency-issued SCCs, or BCRs for corporate groups (BCRs need prior agency approval).
  - Art. 165, consent: a last resort, only for non-recurring transfers with limited data subjects, after a risk assessment, and reported to the agency.
  — [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp); [SIP Law Firm](https://siplawfirm.id/id/publikasi/pp-33-2026-pelindungan-data-pribadi)
- About 20 PP provisions delegate details to agency regulations, including the adequacy list, SCCs, DPIA methodology and sanction procedures. Art. 223 (transition) says processing must comply with PP 33/2026 in the meantime — [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp); [SIP Law Firm](https://siplawfirm.id/id/publikasi/pp-33-2026-pelindungan-data-pribadi)
- As of mid-2025 Indonesia had published no list of adequate countries — [ABNR, 18 Aug 2025](https://www.abnrlaw.com/news/the-data-deal-what-the-indonesia-us-reciprocal-trade-agreement-means-for-cross-border-data-transfers)
- The secondary sources reviewed do not describe any data-localization requirement in PP 33/2026, only transfer conditions — [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp)

**Specific personal data, DPIA, DPO**
- UU PDP Art. 4(2) lists specific personal data, including (a) health data, (b) biometric data, (c) genetic data, (d) criminal records ("catatan kejahatan"), (e) child data and (f) personal financial data. *(UU 27/2022 text, not re-fetched this session)* [UU 27/2022 (BPK)](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022)
- UU PDP Art. 34 requires a DPIA for high-risk processing, which includes processing specific data, large-scale processing, automated decisions with legal effect, and new technologies. *(not re-fetched)*
- PP 33/2026 Art. 120–122 DPIA triggers include significant automated decision-making, specific data, large-scale processing, profiling or systematic monitoring, dataset matching, and new technologies. The Elucidation names AI and machine learning as examples — [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp); [SIP Law Firm](https://siplawfirm.id/id/publikasi/pp-33-2026-pelindungan-data-pribadi)
- DPO (PPDP), PP 33/2026 Art. 142–147: mandatory for public services, large-scale systematic monitoring, or large-scale processing of specific data. It may be internal or external and must be independent. Constitutional Court Decision No. 151/PUU-XXII/2024 changed "dan" to "dan/atau" in UU PDP Art. 53(1), so any single condition triggers the duty — [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp); [SIP Law Firm](https://siplawfirm.id/id/publikasi/pp-33-2026-pelindungan-data-pribadi)

**Controller vs processor, breach, sanctions**
- Processor contracts must contain 11 minimum elements (PP Art. 14–15), and sub-processors need the controller's prior written approval. Art. 138 requires audits. Art. 74–75 and 116–117 require a ROPA with at least 13 elements, a retention policy and an incident policy — [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp)
- Breach notice: written notice within 3×24 hours to data subjects and the agency (PP Art. 114–115) — [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp)
- Administrative sanctions (PP Art. 184–195): warning, suspension, deletion, and fines up to 2% of annual revenue (Art. 185, gross inflows, not profit). Decisions are published (Art. 195) — [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp); [SIP Law Firm](https://siplawfirm.id/id/publikasi/pp-33-2026-pelindungan-data-pribadi)
- UU PDP criminal provisions (Art. 67–70) carry imprisonment and fines (for example, unlawful collection under Art. 67(1): up to 5 years and/or IDR 5 billion). Corporate fines can be up to 10 times the individual fine, plus additional penalties. *(UU 27/2022 text, not re-fetched this session)*
- At least 23 criminal and 7 civil cases involving the PDP Law had been identified by March 2026 — [AHP](https://www.ahp.id/indonesias-pdp-law-updates-dpa-u-s-traderelated-data-transfers-and-recent-court-rulings/)
- Law enforcement data requests (PP Art. 155) must be signed at the level of the Police Chief, Attorney General or Chief Justice, with a copy to the agency — [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp)

### Inferences
- **Neither UU PDP nor PP 33/2026 imposes data localization.** Storing in Singapore and running inference in third countries is a cross-border transfer that is lawful if Art. 56 is satisfied.
- **Role split:** the advocate, law firm or legal aid organization is the controller for client and case data. Jude is a processor for that data and a controller for its own account and billing data. Jude's terms need a PP 33/2026-compliant processing agreement (11 elements) and disclosure of AWS and Bedrock as sub-processors with prior written approval. Bedrock global cross-region inference makes the sub-processing location non-deterministic, which complicates the "inform data subjects of the destination" duty and the risk assessment.
- **Practical transfer basis before the agency exists:** there is no adequacy list and no official SCCs. A defensible posture is a documented transfer impact assessment, contractual safeguards (the AWS DPA, which includes its standard clauses), and advocate or client consent where feasible. Singapore (PDPA 2012) is the easiest destination to argue as equivalent. Global inference that can route to the US, EU or elsewhere is harder to document. Pinning Bedrock to Asia-Pacific or Singapore-only inference profiles narrows the analysis.
- **Specific data:** voiceprints are biometric (Art. 4(2)(b)). Case files often contain data on alleged offences. Whether "catatan kejahatan" covers a pending accusation in a BAP, not just a conviction record, is unsettled, but conservative practice treats it as specific data. Together with AI analysis, this almost certainly triggers a DPIA before 16 January 2027 and likely a DPO at scale.
- **Consent as the transfer basis is weak** for recurring SaaS transfers under PP 33/2026, because consent is limited to non-recurring transfers with limited subjects. Jude cannot rely on consent alone for routine storage abroad once the PP is in force. It needs safeguards (SCCs or BCRs) or adequacy once the agency issues them.

### Gaps
- I could not verify the official gazetted PP 33/2026 text. Article numbers rest on two secondary summaries that agree with each other.
- I found no source on whether PP 33/2026 defines "catatan kejahatan" or addresses data on ongoing proceedings, or on any legal-profession or legal-privilege exemption.
- Whether the Perpres on the agency was signed between September and November 2026 is unknown. My search found nothing after early September 2026.
- No official Indonesian SCC template exists yet.

## 3. Sector rules: advocate confidentiality, court recording, e-Court data, public-scope clients, BPHN legal aid

### Takeaway
No sector rule found requires advocates' working files to be hosted in Indonesia. Advocate confidentiality (UU 18/2003, Kode Etik) is a duty of secrecy, not of location, but it makes vendor security and confidentiality contracts essential. Recording a hearing requires the presiding judge's prior permission under Perma 5/2020 (as amended by Perma 6/2020). Hosting for courts or other state bodies would trigger public-scope localization.

### Cited Findings
- Perma 5/2020 on courtroom protocol and security, Art. 4(6): "Pengambilan foto, rekaman audio dan/atau rekaman audio visual harus seizin hakim/ketua majelis hakim yang bersangkutan yang dilakukan sebelum dimulainya persidangan". It was set on 27 November 2020, promulgated on 4 December 2020, and amended by Perma 6/2020. The MA Chair stated recording is not banned but needs the judge's permission — [Hukumonline](https://www.hukumonline.com/berita/a/melihat-pedoman-protokol-dan-pengamanan-persidangan-lt5fdc57afbee7d/); [Medcom](https://www.medcom.id/nasional/hukum/yNL4Ov6N-ma-bantah-larang-pengambilan-gambar-dan-audio-di-persidangan); [BPK: Perma 5/2020](https://peraturan.bpk.go.id/Details/206077/perma-no-5-tahun-2020); [BPK: Perma 6/2020](https://peraturan.bpk.go.id/Details/206078/perma-no-6-tahun-2020)
- The earlier instrument was a Badilum Director General circular, SE No. 2/2020 (7 February 2020), not a SEMA. It drew criticism, for example from YLBHI — [Kumparan](https://kumparan.com/kumparannews/ambil-foto-saat-sidang-harus-izin-hakim-ma-tegaskan-bukan-batasi-kerja-jurnalis-1uoe4YFhyWT); [rm.id](https://rm.id/baca-berita/nasional/58047/keluarin-aturan-foto-dan-rekam-sidang-harus-izin-hakim-ma-kok-gitu-sih)
- New KUHAP: the DPR passed it on 18 November 2025. Commentary says it strengthens advocates' role, including the right to request CCTV footage for the defense. A draft Art. 253(3) barred live publication of hearings without court permission, but the final text was not verified — [Hukumonline](https://www.hukumonline.com/berita/a/kuhap-baru-perkuat-peran-advokat-dalam-proses-peradilan-pidana-lt698450c56ffb2); [Kompas TV](https://www.kompas.tv/nasional/582636/bahas-ruu-kuhap-di-dpr-advokat-usulkan-larangan-liputan-langsung-di-persidangan)
- UU 18/2003 on Advocates, Art. 19(1): advocates must keep confidential everything they learn from clients in their professional relationship. Art. 19(2): advocates are entitled to the confidentiality of their relationship with clients, including protection of files and documents against seizure and examination, and of electronic communications. The Kode Etik Advokat Indonesia (2002) Art. 4(h) has a parallel duty. *(statute text, not re-fetched this session)* [UU 18/2003 (BPK)](https://peraturan.bpk.go.id/Details/40446/uu-no-18-tahun-2003)
- The public-scope localization rule covers state agencies and institutions appointed by them — [Hukumonline (2019)](https://www.hukumonline.com/berita/a/mengenal-pokok-pokok-aturan-baru-pp-pste-lt5de653d86d627/?page=all)

### Inferences
- **Confidentiality:** hosting abroad does not breach Art. 19 per se. Foreign hosting could expose files to foreign legal process (for example, US CLOUD Act reach over AWS), which conflicts with the Art. 19(2) protection that exists under Indonesian law. This is an argument law firms may raise in procurement, not a legal prohibition.
- **Hearing audio:** the legal risk for Jude is the user's lack of judge permission, not hosting location. The product should prompt users to confirm permission. Recordings contain voices of judges, prosecutors, witnesses and defendants, which is personal data, and voiceprints derived from them are biometric.
- **Court and government clients:** selling to MA, Kejaksaan, Polri or BPHN as operator would make the deployment public-scope, requiring Indonesian hosting (AWS Jakarta ap-southeast-3 or a national data center) unless the technology is unavailable domestically. It may also pull in SPBE and national data center (PDN) policies, which were not researched here.
- **BPHN-funded legal aid organizations (OBH under UU 16/2011):** they remain private entities. I found no rule requiring their case data to be hosted locally, but BPHN grant terms or SIDBANKUM reporting may impose conditions. Unverified.

### Gaps
- I found no MA regulation or SEMA on e-Court or e-Berpadu data reuse or storage by third parties, and no 2021–2026 SEMA specifically on recording hearings.
- The final enacted new KUHAP text on courtroom recording and live broadcast, and its law number, were not verified.
- No BPHN regulation or grant condition on data hosting was found.
- I found no Peradi or KAI guidance on cloud use by advocates.

## 4. Indonesia–US / Singapore developments and 2026 guidance

### Takeaway
The US–Indonesia Agreement on Reciprocal Trade (signed 19 February 2026) commits Indonesia, in Annex III Art. 3.2, to recognize the US as providing adequate data protection under Indonesian law. As of March 2026 it was not legally effective in Indonesia (pending DPR process), and the government says transfers remain subject to UU PDP. For Jude, the US is relevant only because global Bedrock inference may route there. It does not yet give a usable adequacy basis.

### Cited Findings
- The agreement is dated 19 February 2026. Annex III Art. 3.2 requires Indonesia to recognize the US as a jurisdiction with adequate data protection under Indonesian law. It is not yet effective, since it must go to the DPR under Art. 84 of Law 7/2014 on Trade (as amended). AHP says the agreement cannot replace an agency adequacy assessment — [AHP, Mar 2026](https://www.ahp.id/indonesias-pdp-law-updates-dpa-u-s-traderelated-data-transfers-and-recent-court-rulings/). Note: AHP's text cites "Law No. 7 of 2004" in my extraction. The Trade Law is Law 7/2014, so this is likely an extraction typo.
- The government (Presidential Communication Office) says transfers remain subject to domestic rules and are restricted to select commercial exchanges — [Tempo English](https://en.tempo.co/read/2088778/data-transfers-to-the-us-remain-subject-to-indonesian-rules); [ANTARA](https://en.antaranews.com/amp/news/368549/indonesia-us-trade-deal-limits-data-transfer-scope)
- The 22 July 2025 joint statement first announced the commitment. Komdigi said purposes are limited (cloud storage, search, social media, e-commerce, research). The Coordinating Ministry said the data is commercial, not personal or strategic — [ABNR, 18 Aug 2025](https://www.abnrlaw.com/news/the-data-deal-what-the-indonesia-us-reciprocal-trade-agreement-means-for-cross-border-data-transfers)
- ELSAM criticized the deal, and a constitutional challenge was reported. Its outcome was not established in my sources — [Indonesia Business Post](https://indonesiabusinesspost.com/4823/society-environment-and-culture/indonesia-asked-to-reassess-data-privacy-terms-in-new-u-s-trade-deal); [Captain Compliance](https://captaincompliance.com/education/trading-sovereignty-for-data-flows-indonesias-constitutional-challenge-to-the-us-reciprocal-trade-agreement-privacy-and-cybersecurity-risks-from-an-academic-lens/)

### Inferences
- Until the agency publishes an adequacy list, neither the US nor Singapore has formal adequacy status. Singapore remains the lower-risk destination for storage. US routing of biometric or criminal-case data should be avoided or tightly documented.

### Gaps
- I did not verify whether the DPR ratified the agreement between March and November 2026, or the outcome of the constitutional challenge.
- I found no Indonesia–Singapore data-transfer arrangement and no ASEAN Model Contractual Clauses recognition in PP 33/2026.
- I found no 2026 Komdigi guidance specifically on AI inference abroad.

## 5. Market expectation: do Indonesian buyers require in-country data?

### Takeaway
Evidence is thin. AWS opened a Jakarta region (ap-southeast-3) in December 2021 aimed at local residency, and some public-sector-linked customers moved data there for residency reasons. I found no source documenting that Indonesian law firms require in-country hosting in procurement.

### Cited Findings
- AWS launched the Asia Pacific (Jakarta) region, ap-southeast-3, on 14 December 2021, enabling workloads and data to stay in Indonesia — [Amazon press release](https://press.aboutamazon.com/2021/12/aws-launches-region-in-indonesia); [AWS Indonesia compliance center](https://aws.amazon.com/financial-services/security-compliance/compliance-center/id/)
- An IDC note cites Pos Indonesia (a state-owned enterprise) moving data to the local region to meet rules requiring PII to reside in-country — [IDC market note (AWS reprint)](https://pages.awscloud.com/rs/112-TZM-766/images/22-apj-en_id-idc-market-note-aws-launches-indonesia-region-reprint.pdf)
- Financial-sector PSEs are subject to further BI and OJK rules beyond PP 71/2019 — [Hukumonline (2019)](https://www.hukumonline.com/berita/a/mengenal-pokok-pokok-aturan-baru-pp-pste-lt5de653d86d627/?page=all)

### Inferences
- Enterprise, state-owned and government buyers are likely to ask for Indonesian hosting as a procurement preference, and it is a legal requirement for public-scope deployments. Small firms and legal aid organizations are more price-sensitive. An "Indonesia-hosted" option (AWS Jakarta) is a credible differentiator for a product handling BAP and voiceprints, especially as PP 33/2026 takes effect in January 2027. Bedrock model availability in ap-southeast-3 should be checked separately.

### Gaps
- I found no survey or procurement document showing Indonesian law-firm hosting requirements.
- I found no confirmed hosting choices for Indonesian legaltech (for example, Hukumonline, Justika, Kontrak Hukum, Legalku) or healthtech (SATUSEHAT integration rules under Kemenkes) in this session.
- OJK and Kemenkes localization specifics were not researched (out of core scope).
