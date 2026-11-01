# Academic literature for an evidence-grounded courtroom copilot (Jude)

Research date: 2026-11-01. Each item is marked by how it was checked. **[V]** means a search result or fetched page confirmed it during this session. **[K]** means it comes from the researcher's prior knowledge of a well-known paper. The URL for a [K] item is the canonical arXiv, ACL, or DOI page, but it was not re-fetched this session, so check [K] numbers before quoting them. The researcher stopped at the tool-call budget of about 15 calls.

## 1. Legal RAG hallucination and sanctions for fake citations

### Takeaway
Purpose-built legal RAG tools still hallucinate on 17–33% of queries, and general LLMs hallucinate on at least 58% of verifiable legal questions. Courts have now ruled on more than 2,200 cases involving AI-fabricated content. "Hallucination-free" is not a credible claim, and the system has to verify every citation mechanically.

### Cited Findings
- **Magesh, Surani, Dahl, Suzgun, Manning, Ho, "Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools".** Preprint May 2024. Published in the *Journal of Empirical Legal Studies* 22 (2025): 216–242, DOI 10.1111/jels.12413. **[V]**
  - Lexis+ AI hallucinated on about 17% of queries.
  - Westlaw AI-Assisted Research hallucinated on about 33%, nearly double.
  - Both tools hallucinate less than GPT-4, but vendor claims to be "hallucination-free" are overstated.
  - Sources: [arXiv 2405.20362](https://arxiv.org/abs/2405.20362v1), [Stanford Law page](https://law.stanford.edu/publications/hallucination-free-assessing-the-reliability-of-leading-ai-legal-research-tools), [JELS PDF (Manning site)](https://nlp.stanford.edu/~manning/papers/Magesh-Hallucination%E2%80%90Free-2025.pdf), [preprint PDF](https://dho.stanford.edu/wp-content/uploads/Legal_RAG_Hallucinations.pdf)
- **Accuracy, from the same study:** Lexis+ AI answered about 65% of queries accurately. Westlaw AI-AR answered about 42% accurately. **[V]** ([Stanford Law page](https://law.stanford.edu/publications/hallucination-free-assessing-the-reliability-of-leading-ai-legal-research-tools))
  - A 2026 vendor blog gives different Westlaw figures. That blog is not reliable.
  - The tools have since been renamed and updated, so these numbers describe 2024 versions.
- **Magesh et al. taxonomy [K].**
  - Responses are scored on two dimensions: *correctness* (factually accurate) and *groundedness* (the cited source actually supports the claim).
  - A **hallucination** is a response that is incorrect, or one that is "misgrounded": it cites a source that does not support the proposition, even if a real source exists.
  - Responses can also be *incomplete*: refusals, or answers with no supporting citation.
  - The paper names RAG-specific failure modes: naive retrieval, inapplicable authority, sycophancy toward false premises, and reasoning errors.
  - Implication: a real citation that does not support the claim still counts as a hallucination. This matches Jude's design of rejecting citations whose quote does not support the claim. ([arXiv 2405.20362](https://arxiv.org/abs/2405.20362v1); exact category wording to verify)
- **Dahl, Magesh, Suzgun, Ho, "Large Legal Fictions: Profiling Legal Hallucinations in Large Language Models".** *Journal of Legal Analysis* 16(1) (2024): 64–93, DOI 10.1093/jla/laae003. **[V]**
  - Across public models, including GPT-4, LLMs hallucinated **at least 58%** of the time on verifiable questions about US federal cases.
  - On specific questions about random federal cases, the hallucination rate was **69% for ChatGPT 3.5** and **88% for Llama 2**.
  - The models often fail to correct a user's false legal premise ("contra-factual bias").
  - The models are poorly calibrated: they cannot reliably tell when they are hallucinating.
  - Sources: [Stanford Law page](https://law.stanford.edu/publications/large-legal-fictions-profiling-legal-hallucinations-in-large-language-models), [arXiv 2401.01301](https://arxiv.org/abs/2401.01301v2), [JLA PDF](https://dho.stanford.edu/wp-content/uploads/Hallucinations_JLA.pdf)
  - The 58% figure is a floor across models and tasks. The 69–88% figures come from one specific task. The two numbers do not contradict each other.
- **Mata v. Avianca, Inc. (S.D.N.Y., June 22, 2023) [K].**
  - Two lawyers and their firm were sanctioned **$5,000** under Rule 11 for filing a brief with ChatGPT-fabricated cases.
  - They were also ordered to notify the judges falsely named as authors of the fake opinions.
  - Source: Mata v. Avianca, No. 22-cv-1461 (PKC), Opinion and Order on Sanctions, 678 F. Supp. 3d 443. Verify the citation before use.
- **Damien Charlotin's AI Hallucination Cases database: 2,246 decisions, last updated 31 October 2026. [V, fetched directly]**
  - By the party that used AI:

    | Party | Decisions |
    |---|---|
    | Pro se litigants | 1,296 |
    | Lawyers | 887 |
    | Judges | 33 |
    | Experts | 17 |
    | Prosecutors | 5 |

  - By jurisdiction:

    | Jurisdiction | Decisions |
    |---|---|
    | USA | 1,517 |
    | Canada | 240 |
    | Australia | 112 |
    | UK | 89 |
    | Israel | 58 |
    | Brazil | 41 |
    | India | 16 |
    | Singapore | 8 |

  - No Indonesian entries were visible in the top list.
  - Source: [damiencharlotin.com/hallucinations](https://www.damiencharlotin.com/hallucinations/)
  - Growth trajectory, from secondary blogs:

    | Date | Decisions |
    |---|---|
    | Early 2026 | ~1,227 |
    | 9 Sep 2026 | 2,028 |
    | 6 Oct 2026 | 2,149 |
    | 19 Oct 2026 | 2,202 |

    Sources: [Platinum IDs](https://blog.platinumids.com/blog/ai-hallucination-crisis-courts-2026), [Inside Legal AI](https://www.insidelegalai.com/articles/2026-09-09-legal-ai-hallucination-database-2028-cases), [HAQQ](https://www.haqq.ai/blog/ai-legal-hallucination-audit)
  - The database counts decisions, not unique filings, and includes some cases where AI use was alleged but not confirmed. It is a monitoring indicator, not an official count. ([Inside Legal AI](https://www.insidelegalai.com/articles/2026-09-09-legal-ai-hallucination-database-2028-cases))

### Inferences
- Even the best commercial legal RAG system gives a wrong or misgrounded answer about 1 time in 6. Jude therefore cannot rely on the model's own citations.
  - Deterministic exact-substring verification of quotes directly addresses the "fabricated quote" and "nonexistent source" failures.
  - It does **not** catch *misgrounding*: a real quote that does not support the claim. Catching that still needs the reviewer stage and the human.
- 887 decisions involve lawyers, and judges have started appearing too. Professional consequences are real. Jude should make provenance visible and should never present unverified text as a quotation.

### Gaps
- I did not confirm the Magesh et al. category definitions word for word from the PDF.
- I found no Indonesian-specific sanctions or rulings on fake AI citations.
- The Mata sanction details are from memory [K].

## 2. Citation and attribution verification, and grounding metrics

### Takeaway
Benchmarks show that even strong LLMs leave a large share of generated statements without full citation support. Automatic NLI-based attribution metrics correlate with human judgement but are imperfect. The most reliable designs combine retrieval, a requirement that quotes be extractive, and an independent entailment check.

### Cited Findings
- **ALCE: Gao, Yen, Yu, Chen, "Enabling Large Language Models to Generate Text with Citations".** EMNLP 2023. **[V]**
  - First benchmark for automatic evaluation of LLM citations. It scores fluency, correctness, and citation quality; citation quality is measured as recall and precision, using an NLI model (TRUE/T5-11B) [K for the model detail].
  - The automatic metrics correlate strongly with human judgement.
  - "Even the best model" left **49 generations on ELI5 without complete citation support**. Check the exact denominator in the paper.
  - Sources: [ACL Anthology 2023.emnlp-main.398](https://aclanthology.org/2023.emnlp-main.398), [arXiv 2305.14627](https://arxiv.org/abs/2305.14627v2), [GitHub](https://github.com/fallcat/ALCE)
- **AIS (Attributable to Identified Sources): Rashkin et al. [K].**
  - Defines attribution as a test: would a generic hearer agree that "according to source P, s"?
  - Annotators judge this in two stages, first interpretability and then attribution.
  - This is the conceptual basis for "is the claim supported by the cited quote".
  - Source: [arXiv 2112.12870](https://arxiv.org/abs/2112.12870); published in *Computational Linguistics* 2023.
- **Attributed QA: Bohnet et al. 2022 [K].** Benchmarks QA systems that must return an attribution passage. AutoAIS, an NLI-based automatic version of AIS, correlates with human AIS ratings. ([arXiv 2212.08037](https://arxiv.org/abs/2212.08037))
- **RAGAS: Es et al. [K].** EACL 2024 demo.
  - Reference-free RAG metrics: *faithfulness* (share of answer claims inferable from the retrieved context), *answer relevance*, and *context relevance*.
  - Faithfulness works by splitting the answer into atomic statements and having an LLM verify each one against the context. This is the same decomposition Jude uses for testimony claims.
  - Source: [arXiv 2309.15217](https://arxiv.org/abs/2309.15217)
- **FActScore: Min et al. [K].** EMNLP 2023. Splits generations into atomic facts and scores the share supported by a knowledge source. ChatGPT biographies scored about 58% supported. ([arXiv 2305.14251](https://arxiv.org/abs/2305.14251))
- **ContractNLI also requires evidence-span identification, at sentence granularity** (see section 3). The authors chose whole-sentence spans so a lawyer can check support in context. **[V]** ([Hitachi blog by Koreeda](https://www.hitachi.com/rd/sc/aiblog/202202_embracing-the-power-of-linguistics/index.html))

### Inferences
- What works, by layer:
  1. Retrieval constrained to the case file.
  2. Extractive quotes, verified mechanically. This guarantees the quote *exists* in the source, which no metric from the literature guarantees.
  3. An NLI or LLM entailment check that the quote *supports* the claim, matching the AIS/AutoAIS decomposition.
  4. Human review.
- Jude's exact-substring rule is stricter than ALCE/AIS, which measure support, not exact quotation. It eliminates fabricated quotes but needs tolerance for normalization: whitespace, OCR artifacts, and Indonesian diacritics or casing. Without that tolerance, valid citations get rejected and recall drops.
- Grounding should be scored per atomic claim, as RAGAS and FActScore do, not per answer.

### Gaps
- I found no published metric or benchmark for exact-quote verification in legal RAG.
- I found no study measuring how often a verbatim quote exists but is misused (misgrounding).
- The RAGAS, FActScore, and AIS numbers are [K].

## 3. Contradiction and inconsistency detection, fact verification, LLM-as-judge, and independent review

### Takeaway
Contradiction is the hardest NLI label in legal text. On ContractNLI, contradiction F1 is far below entailment F1. LLMs cannot reliably self-correct without external feedback, and multi-agent debate adds little over cheaper self-consistency. An independent reviewer helps only when it brings independent signal, such as different evidence, a different model, or a deterministic check. Agreement between two LLMs is not ground truth.

### Cited Findings
- **ContractNLI: Koreeda and Manning.** Findings of EMNLP 2021, pp. 1907–1919. **[V]**
  - 607 annotated NDAs.
  - Document-level 3-way classification: entailed, contradicted, or not mentioned, plus evidence-span identification.
  - Negation by exception makes the task harder.
  - Third-party leaderboard figures for the Span NLI BERT-large baseline: accuracy ~0.875, evidence mAP ~0.922, **entailment F1 0.834 but contradiction F1 only 0.357**. Another aggregator reports 0.820 accuracy and 0.899 mAP. These conflict, so check the paper's tables.
  - Sources: [arXiv 2110.01799](https://arxiv.org/abs/2110.01799v1), [ACL Anthology](https://preview.aclanthology.org/new-sigs/2021.findings-emnlp.164/), [benchmarklist](https://benchmarklist.com/benchmarks/contractnli/), [benchlm](https://benchlm.ai/benchmarks/contractnli)
  - The 3-way label set (entailed / contradicted / not mentioned) maps directly onto Jude's Supported / Potential Inconsistency / Insufficient Evidence.
- **FEVER: Thorne et al. [K].** NAACL 2018.
  - 185,445 claims labelled Supported / Refuted / NotEnoughInfo, each with evidence sentences from Wikipedia.
  - The baseline pipeline reached 31.87% accuracy when correct evidence was required, versus 50.91% when evidence was ignored.
  - Lesson: requiring correct evidence sharply lowers scores.
  - Source: [arXiv 1803.05355](https://arxiv.org/abs/1803.05355)
- **Huang et al., "Large Language Models Cannot Self-Correct Reasoning Yet".** ICLR 2024. **[V]**
  - Without external feedback, LLMs struggle to self-correct, and performance sometimes *degrades* after self-correction.
  - Earlier gains relied on oracle labels.
  - The paper finds multi-agent debate no better than self-consistency at equal compute. Secondary summaries give conflicting GSM8K numbers (debate 83.2% vs self-consistency 82.5% with 3 responses; another reports 83.0% vs 88.2% with 9 responses). Check the paper.
  - Sources: [arXiv 2310.01798](https://arxiv.org/abs/2310.01798v2), [ICLR record](https://mlanthology.org/iclr/2024/huang2024iclr-large)
- **Zheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" [K].** NeurIPS 2023 D&B.
  - GPT-4 as judge agrees with humans more than 80% of the time, about the same as human–human agreement.
  - The paper documents position bias, verbosity bias, and **self-enhancement bias**: judges favour their own outputs.
  - Source: [arXiv 2306.05685](https://arxiv.org/abs/2306.05685)
- **Panickssery et al., "LLM Evaluators Recognize and Favor Their Own Generations" [K].** NeurIPS 2024. Self-recognition ability correlates linearly with self-preference strength. ([arXiv 2404.13076](https://arxiv.org/abs/2404.13076))
- **Du et al., "Improving Factuality and Reasoning in Language Models through Multiagent Debate" [K].** ICML 2024. Reports factuality gains from debate. The Huang et al. results above argue these gains shrink to nothing once compute is matched. ([arXiv 2305.14325](https://arxiv.org/abs/2305.14325))

### Inferences
- Contradiction detection is the weakest link: contradiction F1 was about 0.36 on ContractNLI.
  - "Potential Inconsistency" should be a high-precision, explicitly tentative label.
  - It should always come with both conflicting spans shown side by side.
- The reviewer LLM gives real independence only if it:
  - is a different model family, or at least gets a different prompt and sees the evidence fresh;
  - cannot see the analyst's rationale, to avoid anchoring;
  - is backed by deterministic checks (substring verification).
- When the analyst and reviewer disagree, the system should show the disagreement or downgrade to "Context Needed". It should not resolve the disagreement silently.
- FEVER's NotEnoughInfo, and ContractNLI's "not mentioned", support keeping "Insufficient Evidence" as a first-class outcome rather than forcing a binary label.

### Gaps
- I found no published dataset or benchmark for **testimony vs. prior-statement inconsistency detection** in court transcripts, in any language.
- I did not retrieve TACL 2024 surveys on when self-correction works.
- The Zheng and Panickssery figures are [K].

## 4. ASR and diarization for courtrooms and for Indonesian

### Takeaway
Courtroom transcription is error-prone even with humans: certified court reporters got only 59.5% of AAE sentences fully correct. Whisper-class ASR occasionally invents whole phrases, and 38% of those inventions are harmful. Indonesian ASR degrades most on spontaneous speech. Diarization on realistic overlapping audio still has DER around 19–27%. Every transcript-derived claim therefore needs a link back to the audio, and speaker labels need human confirmation.

### Cited Findings
- **Jones, Kalbfeld, Hancock, Clark, "Testifying While Black: An Experimental Study of Court Reporter Accuracy in Transcription of African American English".** *Language* 95(2), 2019. **[V]**
  - 27 Philadelphia court reporters, all certified at a 95% accuracy standard.
  - Average **sentence-level accuracy was 59.5%** and **word-level accuracy was 82.9%**.
  - Reporters paraphrased correctly on only about 33% of sentences.
  - The certification test is based mostly on the speech of lawyers and judges.
  - Sources: [Language Magazine](https://www.languagemagazine.com/2019/04/02/a-new-study-finds-that-philadelphia-court-reporters-did-not-accurately-transcribe-the-speech-of-speakers-of-african-american-english-aae/), [Philadelphia Inquirer](https://fusion.inquirer.com/news/court-reporter-stenographer-african-american-english-aae-philly-transcript-study-20190122.html), [Criminal Legal News](https://www.criminallegalnews.org/news/2019/jul/16/court-reporters-likely-fail-accuratelytranscribe-testimony-speakers-african-american-english/)
- **Koenecke, Choi, Mei, Schellmann, Sloane, "Careless Whisper: Speech-to-Text Hallucination Harms".** FAccT 2024. **[V]**
  - **About 1.4% of audio segments** produced hallucinated sequences, in April–May 2023 experiments with the Whisper API.
  - **38% of hallucinations contained explicit harms**: violence, invented personal information, or false authority.
  - The rate was higher for speakers with aphasia; longer pauses and silences are a likely trigger.
  - OpenAI has since improved the model, and the rate decreased.
  - Sources: [arXiv 2402.08021](https://arxiv.org/html/2402.08021v2), [Cornell news](https://www.news.cornell.edu/stories/2024/06/ai-speech-text-can-hallucinate-violent-language), [PDF](https://talkbank.org/aphasia/publications/2024/Koenecke24.pdf)
- **Adila et al., "Enhancing Indonesian Automatic Speech Recognition: Evaluating Multilingual Models with Diverse Speech Variabilities".** O-COCOSDA 2024. **[V]**
  - Fine-tuned Whisper beat MMS on WER and CER across the Indonesian datasets.
  - **Speaking style (read vs spontaneous) hurt performance more than any other variable.**
  - Secondary review: Whisper is more robust on spontaneous speech, MMS on formal speech.
  - Sources: [arXiv 2410.08828](https://arxiv.org/abs/2410.08828v2), [HTML](https://arxiv.org/html/2410.08828v2)
- **Other Indonesian ASR work:**
  - **[V]** Whisper on Javanese and Sundanese under noise: Whisper is more robust than wav2vec 2.0 and XLS-R. Relevant for regional-language code-switching in Indonesian courts. ([arXiv 2509.25878](https://arxiv.org/html/2509.25878v1))
  - **[V]** A 2026 stuttering-aware Indonesian ASR paper exists. ([arXiv 2601.03727](https://arxiv.org/pdf/2601.03727))
  - **[V]** Local journal benchmarks of Whisper variants on Indonesian dialogue. ([Polibatam JAIC](https://jurnal.polibatam.ac.id/index.php/JAIC/article/download/11826/3379/38614), [PNL JAISE](https://e-jurnal.pnl.ac.id/JAISE/article/download/9201/6245))
- **Diarization: pyannote speaker-diarization v2.1.1 model card.** Self-reported, scored with overlapped speech included and no collar. **[V]**

  | Benchmark | DER |
  |---|---|
  | DIHARD III (Full) | 26.94% (miss 8.41%, false alarm 10.50%) |
  | AMI headset-mix | 18.91% |
  | AMI array1 (far-field) | 27.12% |

  Source: [pyannote model card](https://huggingface.co/pyannote/speaker-diarization/blob/main/README.md)
- **Whisper paper: Radford et al. 2022 [K].** On FLEURS, Whisper large-v2 Indonesian WER was in the single digits (about 7%). Read-speech benchmarks overstate accuracy on spontaneous courtroom speech. ([arXiv 2212.04356](https://arxiv.org/abs/2212.04356); exact value to verify)

### Inferences
- Even human "gold" court records carry dialect-dependent error. Jude's transcript is a working aid, not the official record, and the UI should say so.
- Every extracted claim should keep its timestamp, segment ID, and audio link so the lawyer can replay the source before acting on a flagged inconsistency.
- An apparent "inconsistency" may be an ASR artefact. Hallucinated phrases during silences are a known failure, so Jude should flag low-confidence segments and avoid treating text from silence or overlap as testimony.
- With diarization error around 20–27% on overlapping or far-field audio, a claim could be attributed to the wrong speaker, for example witness vs prosecutor. Speaker labels need easy correction, and claim extraction should depend on confirmed speaker roles.

### Gaps
- I found no peer-reviewed WER figures for **Speechmatics on Indonesian**, or for any ASR on **Indonesian courtroom audio**.
- I found no Indonesian diarization benchmark.
- I did not extract Adila et al.'s per-condition WER table.
- I found no study comparing Indonesian court clerks' (panitera) minutes (berita acara sidang) with ASR output.

## 5. Indonesian legal NLP

### Takeaway
Indonesian legal NLP is small but growing. There is a 1K-document NER corpus (IndoLER), Supreme Court decision corpora of about 21K documents used for sentence/penalty prediction, and IndoBERT-based classifiers. There are no Indonesian datasets for legal RAG, citation grounding, NLI, or hearing transcripts, so Jude cannot be benchmarked on public Indonesian data for its core task.

### Cited Findings
- **IndoLER: Yulianti et al., "Named entity recognition on Indonesian legal documents: a dataset and study using transformer-based models".** IJECE. **[V]**
  - About 1K Supreme Court decision documents, about 6M words, about 25K annotated entities, 20 fine-grained legal entity types.
  - XLM-RoBERTa performed best, at **F1 0.9295**.
  - Repository: ir-nlp-csui/indoler.
  - Sources: [IJECE](https://ijece.iaescore.com/index.php/IJECE/article/view/35275), [UI repository](https://dara.ui.ac.id/research-output/81c8cc6d-dcad-4f15-ac1c-02b840fe996d)
- **Nasution and Suprapto, "Court Decision Prediction Model Using NLP and Random Forest".** IJCCS 2025. **[V]**
  - 21,630 Supreme Court of Indonesia decisions, converted from PDF to XML.
  - Penalty-category classification accuracy of 63–81%.
  - Sources: [IJCCS](https://journal.ugm.ac.id/ijccs/article/view/108377)
- **Other Indonesian legal corpora [V]:**
  - A corruption-case NER corpus of 450 Supreme Court documents under Law 31/1999, tagged with IndoBERT NER (2025).
  - Tax-court verdict classification: IndoBERT at 75.83% accuracy vs Bi-LSTM at 67.57% (2023).
  - Sources: [UIN Saizu journal](https://ejournal.uinsaizu.ac.id/index.php/tids/article/view/13592), [Garuda](https://garuda.kemdikbud.go.id/documents/detail/2091993)
- **IndoNLU: Wilie et al. [K].** AACL 2020.
  - 12-task Indonesian benchmark, plus IndoBERT pretrained on the Indo4B corpus (about 4B words).
  - Includes an NLI-style task (WReTE) but no legal domain.
  - Source: [arXiv 2009.05387](https://arxiv.org/abs/2009.05387)
- **IndoNLI: Mahendra et al. [K].** EMNLP 2021. The first human-elicited Indonesian NLI dataset, about 18K pairs; models lag humans on the expert-annotated test set. ([arXiv 2110.14566](https://arxiv.org/abs/2110.14566))

### Inferences
- The gaps relevant to Jude:
  - no Indonesian legal NLI or contradiction dataset;
  - no Indonesian legal RAG or citation benchmark;
  - no courtroom speech corpus;
  - most work targets judgment prediction, which is ethically fraught and not Jude's goal.
- Jude's synthetic evaluation set (`app/evaluation/`) fills a real gap. It should stay labelled as synthetic.
- IndoNLI and IndoBERT could support a cheap secondary contradiction check. Legal-domain transfer is untested.

### Gaps
- I could not confirm whether the IndoLER data can currently be downloaded.
- I found no Indonesian legal judgment prediction paper at a top venue (ACL/EMNLP); the work is mostly in regional journals.
- IndoNLU and IndoNLI are [K].

## 6. Witness psychology: inconsistency does not mean lying

### Takeaway
Courts and jurors treat inconsistency as strong evidence of inaccuracy or deception. Empirically, though, inconsistency explains only a small share of the variance in accuracy, and only some types matter. Memory is reconstructive and open to post-event misinformation. A tool must present inconsistencies as prompts for clarification, never as credibility findings.

### Cited Findings
- **Fisher, Brewer, Mitchell (2009), "The Relation between Consistency and Accuracy of Eyewitness Testimony: Legal versus Cognitive Explanations".** In *Handbook of Psychology of Investigative Interviewing*, pp. 121–136, DOI 10.1002/9780470747599.ch8. **[V citation only]** ([FIU record](https://discovery.fiu.edu/display/pub101425))
- **Brewer et al. (1999).** **[V via secondary]**
  - Mock jurors saw contradictions with earlier statements as the strongest sign of inaccuracy.
  - Yet **no single consistency measure explained more than about 10% of the variance** in overall accuracy.
  - Sources: [Fisher 2007 PDF](https://newiipdm.haifa.ac.il/wp-content/uploads/2014/11/Fisher_2007.pdf), [Flinders record](https://researchnow.flinders.edu.au/en/publications/beliefs-and-data-on-the-relationship-between-consistency-and-accu/)
- **Stanley and Benjamin (2016), "That's not what you said the first time".** *Cognitive Research: Principles and Implications.* **[V]**
  - Contradictions between recalls predict lower accuracy *for the contradicted item*.
  - Information *added* later (reminiscence) is not necessarily inaccurate.
  - Sources: [PMC5256441](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5256441/), [PDF](https://cognitiveresearchjournal.springeropen.com/track/pdf/10.1186/s41235-016-0012-9)
- **CREST guide "When does inconsistency matter?".** **[V]**
  - Only certain types of inconsistency are linked to a higher chance of memory error.
  - US juries are routinely told to weigh consistency in judging credibility.
  - Sources: [CREST](https://crestresearch.ac.uk/resources/guide-when-does-inconsistency-matter/), [In-Mind](https://www.in-mind.org/article/seeing-and-believing-common-courtroom-myths-in-eyewitness-memory?page=3)
- **Fisher et al., "Does testimonial inconsistency indicate memory inaccuracy and deception?" [V citation].** ([FIU record](https://discovery.fiu.edu/display/pub101389))
- **Loftus and Palmer (1974) [K].**
  - Changing the verb in a question ("smashed" vs "hit") changed speed estimates (about 40.8 vs 34.0 mph).
  - A week later, more "smashed" participants falsely reported seeing broken glass (32% vs 14%).
  - Source: *Journal of Verbal Learning and Verbal Behavior* 13:585–589, [DOI 10.1016/S0022-5371(74)80011-3](https://doi.org/10.1016/S0022-5371(74)80011-3)
  - Loftus (2005), a 30-year review of the misinformation effect: *Learning & Memory* 12:361–366, [DOI 10.1101/lm.94705](https://doi.org/10.1101/lm.94705) [K].
- **Vrij, Granhag, Porter (2010), "Pitfalls and Opportunities in Nonverbal and Verbal Lie Detection".** *Psychological Science in the Public Interest* 11(3) [K]. Lay and professional lie-detection accuracy is around 54%, near chance; cue-based credibility judgements are unreliable. ([DOI 10.1177/1529100610390861](https://doi.org/10.1177/1529100610390861))
- **Wixted and Wells (2017), PSPI [K].** Eyewitness confidence is diagnostic only when measured at the initial uncontaminated test. Later confidence inflates. ([DOI 10.1177/1529100616686966](https://doi.org/10.1177/1529100616686966))

### Inferences
- The label should stay "Potential Inconsistency", never "contradiction" or "lie". Each flag should:
  - show both statements, their sources, and their timing;
  - say what kind of discrepancy it is: omission/addition vs direct contradiction, peripheral vs central detail;
  - suggest a clarifying question rather than a conclusion.
- Additions should be weighted lower than direct contradictions (Stanley and Benjamin).
- Prior statements recorded under leading questioning (police BAP, Berita Acara Pemeriksaan) may be contaminated (Loftus). A contradiction with a BAP may reflect how the BAP was taken. "Context Needed" should cover this.
- This supports the AGENTS.md rule: "Findings support human verification, never guilt or credibility determinations."

### Gaps
- I could not access the full text of the Fisher et al. 2009 chapter.
- The search did not surface the phrase "consistency heuristic". I found no Indonesian-specific research on witness inconsistency or jury-free (judge-panel) evaluation of inconsistency.

## 7. Human factors: automation bias and live monitoring load

### Takeaway
Experts and novices both over-rely on imperfect decision aids, producing omission errors (missing what the aid missed) and commission errors (following wrong advice). Practice alone does not cure this, and it gets worse under multitasking. That fits a lawyer who must monitor a live hearing while also arguing their case. Design must limit alert volume, show the evidence, and require active verification.

### Cited Findings
- **Parasuraman and Manzey (2010), "Complacency and Bias in Human Use of Automation: An Attentional Integration".** *Human Factors* 52(3). **[V]**
  - Complacency and automation bias are overlapping phenomena driven by attention allocation.
  - Imperfect aids cause both omission and commission errors.
  - Complacency appears in both naive and expert users and **is not overcome by simple practice**.
  - [K] Complacency is most pronounced under multiple-task load.
  - Sources: [SAGE](https://journals.sagepub.com/doi/10.1177/0018720810376055), [TU Berlin full text](https://depositonce.tu-berlin.de/items/0c787d91-6021-480b-a333-009e0d1d0092/full)
- **Goddard, Roudsari, Wyatt (2012), "Automation bias: a systematic review of frequency, effect mediators, and mitigators".** *JAMIA* 19(1):121–127. **[V]**
  - Automation bias is mediated by user factors (cognitive style, task experience), by decision-support design, and by trust and confidence.
  - [K] Mitigators include reducing the prominence of advice and requiring users to justify or verify decisions.
  - Sources: [JAMIA](https://academic.oup.com/jamia/article/19/1/121/732254), [PMC3240751](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751)
- **Skitka, Mosier, Burdick (1999), "Does automation bias decision-making?".** *IJHCS* 51:991–1006 [K]. With an imperfect aid, participants missed events the aid failed to flag and followed incorrect recommendations, compared with non-automated controls. ([DOI 10.1006/ijhc.1999.0252](https://doi.org/10.1006/ijhc.1999.0252))
- **Bansal et al. (2021), "Does the Whole Exceed its Parts? The Effect of AI Explanations on Complementary Team Performance".** CHI 2021 [K]. Explanations increased acceptance of AI recommendations regardless of whether they were correct, and did not reliably improve human+AI team accuracy. ([arXiv 2006.14779](https://arxiv.org/abs/2006.14779))

### Inferences
- **Precision over recall for live alerts.** False alarms train users to ignore flags; missed flags train them to trust silence (omission errors). Live mode should show few, high-confidence, evidence-linked items and leave the rest for post-hearing review.
- **Evidence over explanation.** Showing the verbatim source quote and the transcript segment, both verifiable, is better than an LLM rationale. Bansal et al. show that rationales can raise blind acceptance.
- **Active verification.** Require a click-through to the source, or an explicit "verified / dismissed" action, before a finding can be exported or used. This follows the Goddard mitigators.
- **Never imply completeness.** "No inconsistencies found" should read as "none flagged; review not exhaustive", to counter omission bias.
- The SSE-advisory plus polled-authoritative-records design in AGENTS.md fits this: advisory signals stay distinct from the verified record.

### Gaps
- I found no empirical study of automation bias specifically among **lawyers using legal AI** during live proceedings.
- I found no measured cognitive-load study of attorneys monitoring live transcripts.
- The Goddard frequency figures and the Skitka and Bansal details are [K].
