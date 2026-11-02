# Cheaper or better speech-to-text and LLM options for Jude (AWS first), November 2026

All pages accessed 2026-11-02. The scope changed partway through: AWS-native savings come first, and non-AWS providers appear only as a short comparison. Prices are USD. "Unverified" means I found no primary source for that figure in this session.

Baseline from the brief: Amazon Transcribe streaming id-ID costs $0.60/hour in Singapore. Nova 2 Lite costs about $0.0045 per call, at about 300 calls per hearing hour, so roughly $1.35/hour. The Kimi K3 reviewer costs about $0.063 per call, which would be $18.90/hour if it reviewed every call.

## 1. AWS speech-to-text: Transcribe batch vs streaming, free tier, self-hosted Whisper on EC2

### Takeaway
Live hearings need streaming, so Transcribe streaming stays. For uploaded recordings, batch costs about 40% less than streaming per AWS's US example, and diarization is included in both at no extra charge. The free tier is too small to matter (60 minutes a month). Self-hosted Whisper on a spot GPU is only cheaper when one GPU serves several hearings at once, and it adds real work for streaming and diarization.

### Cited Findings
- Transcribe standard US East example rates: streaming $0.01/min ($0.60/hour), batch $0.006/min ($0.36/hour). Tiered rates "vary by region" and sit in a regional dropdown that wasn't in the fetched text, so the Singapore tier table is unverified. — [AWS Transcribe pricing](https://aws.amazon.com/transcribe/pricing/)
- Standard pricing "includes ... custom vocabularies, vocabulary filtering, speaker diarization, and language identification". Only automatic content redaction and custom language models cost extra. — [AWS Transcribe pricing](https://aws.amazon.com/transcribe/pricing/)
- Free tier: 60 minutes per month for 12 months from the first request, counted across all Regions, with no rollover. It excludes redaction and custom language models. — [AWS Transcribe pricing](https://aws.amazon.com/transcribe/pricing/)
- The fetched pricing text said nothing on data use or opting out of training. (AWS AI-services opt-out policies exist, but I didn't verify them this session.) — [AWS Transcribe pricing](https://aws.amazon.com/transcribe/pricing/)
- Cost floor for Whisper as a hosted batch API: Groq lists whisper-large-v3-turbo at $0.04/hour (12% WER, its own number) and whisper-large-v3 at $0.111/hour (10.3% WER). The page doesn't say whether either supports streaming. This is a useful reference for what self-hosting has to beat. — [Groq speech-to-text docs](https://console.groq.com/docs/speech-to-text)
- Evidence on Whisper large-v3 Indonesian accuracy is mixed. A Hugging Face card (sea-asr-id) appears to report about 5.8 WER on FLEURS-id for large-v3, though the table headers were garbled, and says large-v3 and Qwen3-ASR-1.7B beat its own CTC model. ElevenLabs claims 7.7% for Whisper large-v3 against 2.4% for Scribe on Indonesian, which is a vendor claim. — [sea-asr-id model card](https://huggingface.co/PixelML/sea-asr-id); [ElevenLabs Indonesian STT](https://elevenlabs.io/ja/speech-to-text/indonesian)
- A 2024 arXiv study on Indonesian ASR found fine-tuned Whisper gave the best results among the systems it tested. — [arXiv 2410.08828](https://arxiv.org/html/2410.08828v2)

### Inferences
- Live hearings: keep Transcribe streaming at $0.60/hour. Its id-ID speaker labels are included, and no other AWS option is a drop-in replacement.
- Uploaded audio, and re-transcription after a hearing: switch to Transcribe batch. That's about $0.36/hour at the US example rate, around 40% off, with diarization included.
- Self-hosting Whisper on EC2: one g6.xlarge (NVIDIA L4) runs about $0.8/hour on-demand and roughly $0.3–0.4/hour on spot. Both figures are my estimates, not checked against AWS pricing this session. Whisper large-v3-turbo with faster-whisper runs many times faster than real time on an L4, so one GPU could transcribe several hearings at once. Spot pricing beats $0.60/hour per hearing only at 1–2 or more concurrent hearings, or when the GPU runs only during hearings.
- Self-hosting costs extra work and risk:
  - Whisper isn't natively streaming. It needs chunked or VAD-based pseudo-streaming, which adds 1–3 s of latency.
  - Diarization needs pyannote, which needs a GPU for speed, and the repo recently removed voice diarization.
  - Spot instances can be interrupted mid-hearing.
- Not recommended for the competition stage. Worth revisiting once hearing volume is steady.
- SageMaker Serverless Inference doesn't support GPUs (from background knowledge, unverified this session), so it doesn't suit Whisper large models.

### Gaps
- Transcribe streaming and batch tier tables for ap-southeast-1, and whether Transcribe runs in ap-southeast-3 (Jakarta) for id-ID streaming. Neither was confirmed.
- Current EC2 g5/g6 spot prices in ap-southeast-1 or ap-southeast-3. No primary source was fetched.
- The exact FLEURS-id WER for Whisper large-v3 (Table in arXiv 2212.04356). Not confirmed.
- I found no direct WER comparison between Transcribe and other systems on Indonesian.

## 2. AWS LLM options: cheaper Bedrock models, prompt caching, batch, regions

### Takeaway
On Bedrock, the biggest cuts are:
- Prompt caching on Nova for the repeated case context. Nova Micro's cache-read price is 25% of its input price, and Nova 2 Lite likely gets a similar discount (unverified).
- Moving routine per-statement analysis to a cheaper model: Nova Micro, gpt-oss-120b, Ministral, or Qwen3 Next.
- Keeping the expensive Kimi reviewer for flagged statements only, not every call.

Batch inference is 50% off but can't be used for live analysis, and it can't be combined with prompt caching.

### Cited Findings
- Bedrock batch inference is "50% lower than on-demand for select models from Anthropic, Meta, Mistral AI, and Amazon". The Flex tier is 50% off Standard, and Priority costs a 75% premium. — [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)
- Prompt caching "is only supported for on-demand inference endpoints. It is not supported with the batch inference API." — [Bedrock prompt caching docs](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html)
- Caching details for Nova Micro, Lite, Pro and Nova 2 Lite: — [Bedrock prompt caching docs](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html)
  - Explicit caching: minimum 1K tokens per checkpoint, up to 4 checkpoints, 5-minute TTL, in the `system` and `messages` fields.
  - The cache holds at most 20K tokens per prompt.
  - Nova also caches implicitly (best effort) for all text prompts.
  - The TTL resets on every cache hit.
- Nova Micro: $0.035 input / $0.14 output per 1M tokens, cache read $0.00875 (25% of input), batch $0.0175 / $0.07. This is a secondary source that cites aws.amazon.com, dated Oct 17, 2026. — [Developers Digest, Nova Micro](https://www.developersdigest.tech/models/nova-micro)
- Nova 2 Lite: $0.30 input / $2.50 output per 1M tokens per one aggregator, and $0.33 / $2.75 per a Bedrock-sourced listing. The second may be a regional or cross-region price. I found no cache-read price. — [anotherwrapper](https://anotherwrapper.com/llm-pricing/nova-2-lite); [modelcompare.dev](https://modelcompare.dev/ja/models/amazon-bedrock/amazon-nova-2-lite)
- Cheap third-party models on Bedrock (Standard tier, per 1M tokens input/output, US Regions unless noted). The Nova price rows did not come through in the fetched page. — [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)

| Model | Input | Output | Note |
|---|---|---|---|
| Gemma 3 4B / Gemma 4 E2B | $0.04 | $0.08 | |
| Nemotron Nano 2 | $0.06 | $0.23 | |
| Ministral 3B | $0.10 | $0.10 | |
| Ministral 8B | $0.15 | $0.15 | |
| Qwen3 Next 80B A3B | $0.15 | $1.20 | |
| gpt-oss-20b (Sydney) | $0.0721 | $0.309 | Batch/Flex about half |
| gpt-oss-120b (Sydney) | $0.1545 | $0.618 | |
| MiniMax M2 | $0.30 | $1.20 | |
| DeepSeek V3.2 | $0.62 | $1.85 | |
| Kimi K2.5 | $0.60 | $3.00 | |

- Jakarta (ap-southeast-3) rows on the pricing page: DeepSeek V3.2 at $0.74/$2.22, MiniMax M2.1/M2.5 at $0.36/$1.44, Nemotron 3 Super at $0.18/$0.78. These show that some models run in Jakarta, at a premium over US rates. — [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)
- The Nova 2 Lite model card lists Jakarta with no in-region or geo cross-region support. Only global cross-region inference is available there, so requests can be served outside APAC. Nova Pro may be in-region in Jakarta, but the table headers were unclear. — [Nova 2 Lite model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.html); [Nova Pro model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-pro.html)
- The Bedrock pricing page links only to the general AWS Free Tier. I found no Bedrock-specific free credit figure. — [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)

### Inferences
Assumed token mix: about 10k input tokens (mostly static case context, of which about 8k is cacheable) and about 600 output tokens per call. This matches $0.0045 at $0.30/$2.50, but it's my estimate. All figures assume 300 calls per hearing hour.

| Option | Per call | Per hearing hour | Notes |
|---|---|---|---|
| Nova 2 Lite, no cache (today) | $0.0045 | $1.35 | |
| Nova 2 Lite with an 8k cached prefix | $0.0027 | $0.81 | Assumes a 75% cache discount like Nova Micro (unverified). The 20K cache cap and 5-min TTL fit, since calls arrive every ~12 s. |
| Nova Micro, with cache | about $0.0002–0.0004 | $0.06–0.13 | Text-only, smaller model; quality on Indonesian legal reasoning is unknown, so evaluate first. |
| gpt-oss-120b (Sydney) | about $0.0019 | $0.56 | Australian data location; supports tool use. |
| Qwen3 Next 80B A3B | about $0.0022 | $0.67 | |
| Ministral 8B | about $0.0016 | $0.47 | Weaker reasoning. |

- The biggest saving is the reviewer. Running Kimi on every call would cost about $18.90/hour. Running it on about 5% of flagged statements (15 per hour) costs about $0.95/hour. A cheaper reviewer also works, for example DeepSeek V3.2 at $0.62/$1.85 on Bedrock (about $0.0073 per call with the same mix) or Nova Pro.
- Batch at 50% off fits only post-hearing work, such as a full-hearing re-analysis or report generation. It doesn't fit live per-statement calls, and caching doesn't apply to batch calls.
- Provisioned throughput: at about 300 calls per hearing hour with idle time between hearings, provisioned throughput would almost certainly cost more than on-demand (background knowledge: hourly model-unit commitments). It isn't relevant at this stage.
- Data location:
  - Singapore in-region or APAC geo inference keeps data in APAC.
  - "Global" inference profiles, the only Nova 2 Lite option from Jakarta, can process data anywhere.
  - For a keep-in-Indonesia story, use Jakarta in-region models only, such as DeepSeek V3.2 and MiniMax M2.x listed with Jakarta prices.

### Gaps
- The official Nova 2 Lite on-demand, cache-read and batch prices in ap-southeast-1 didn't render in the fetched AWS pages.
- I didn't confirm whether Llama 4, Mistral Large or Qwen are in-region in ap-southeast-1 or ap-southeast-3.
- No Bedrock free-credit amount was found. New AWS accounts reportedly get Free Tier credits (background knowledge, unverified).
- I found no Indonesian legal-reasoning benchmark for Nova Micro, Nova 2 Lite or gpt-oss.

## 3. Non-AWS comparison (short): only options that are free or clearly cheaper

### Takeaway
For speech, Soniox (about $0.12/hour real-time) and Gemini 3.5 Transcribe Live ($0.30/hour) are clearly cheaper than Transcribe's $0.60/hour. Deepgram, Speechmatics and Azure are not cheaper once diarization is added. For the LLM, the Gemini API free tier is near-free for a demo, but Google uses free-tier data to improve products, so it's acceptable only for synthetic or public-record demo data. I found no Indonesian provider with published self-serve pricing (Prosa.ai, SEA-LION, Sahabat-AI).

### Cited Findings
Speech:
- Soniox's comparison page lists real-time prices per hour: Soniox stt-rt-v5 $0.12, ElevenLabs Scribe v2 Realtime $0.39, Speechmatics Enhanced $0.54, Google gemini-3.5-transcribe-live $0.54, AssemblyAI Universal-3.5 Pro Realtime $0.62, Deepgram Nova-3 Multilingual $0.75, OpenAI gpt-realtime-whisper $1.02, Azure $1.60. Competitor figures include add-ons such as diarization. This is a vendor-authored comparison. — [Soniox pricing comparison](https://soniox.com/compare/stt/pricing)
  - The page didn't confirm Soniox's Indonesian support or real-time diarization.
- Gemini API: Gemini 3.5 Transcribe Live costs $0.005/min ($0.30/hour), and 3.5 Transcribe (batch) costs $0.003/min ($0.18/hour). — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Deepgram: — [Deepgram pricing](https://deepgram.com/pricing); [Deepgram languages](https://developers.deepgram.com/docs/models-languages-overview)
  - Nova-3 streaming multilingual costs $0.0092/min pay-as-you-go, plus $0.0020/min streaming diarization, about $0.67/hour in total.
  - There's a $200 free credit that doesn't expire.
  - Indonesian (`id`) is supported on Nova-3 monolingual and multilingual and on Nova-2.
  - The pricing page shows only an EU residency endpoint.
- Speechmatics: — [Speechmatics pricing](https://www.speechmatics.com/our-technology/pricing)
  - Real-time rates: Melia 1 $0.40/hour, Standard $0.45, Enhanced $0.80.
  - Real-time diarization is not available on Melia.
  - $100 sign-up credit, with processing in the EU, US or AUS.
  - Indonesian isn't named on the page.
- Azure Speech: real-time costs $1/hour plus $0.30/hour per add-on feature such as diarization. These are secondary sources, and the regional price was not visible. — [Gladia comparison](https://gladia.io/blog/azure-speech-services-vs-gladia-enterprise-sla-data-residency-compliance-comparison); [Dasha](https://dasha.ai/blog/speech-to-text-pricing)
- Google Cloud Chirp 3 lists id-ID only as Preview. Its GA regions include asia-southeast1 (Singapore) but not asia-southeast2 (Jakarta), and sources disagree on whether diarization works outside batch. — [Chirp 3 docs](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3)
- Prosa.ai (Indonesia): no public STT API price was found. It's B2B and sold through its sales team. — [thesilab vendor directory](https://www.thesilab.com/vendor-directory/prosa-ai)

LLMs:
- The Gemini API free tier is "free of charge" for 2.5 Flash-Lite, 2.5 Flash, 3.1 Flash-Lite, 3.5 Flash-Lite, 3.6 Flash and 3.8 Flash, and free-tier data is used to improve Google products. Paid prices per 1M tokens: — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
  - 2.5 Flash-Lite: $0.10 input / $0.40 output.
  - 3.1 Flash-Lite: $0.25 / $1.50.
  - 3.5 Flash-Lite: $0.30 / $2.50.
  - 3.6 and 3.8 Flash: $0.75 / $3.75, doubling on 2027-01-01.
  - The free-tier rate limits weren't in the fetched text.
- DeepSeek prices conflict across aggregators: V3 at $0.27/$1.10, and V4.1-Flash at $0.30/$1.20 or $0.07/$0.18. The official page wasn't fetched. — [anotherwrapper DeepSeek-V3](https://anotherwrapper.com/llm-pricing/deepseek-v3); [pricepertoken V4.1 Flash](https://pricepertoken.com/pricing-page/model/deepseek-deepseek-v4.1-flash)
- Alibaba Model Studio: I found no Jakarta-region Qwen token price. Jakarta appears only in older product docs for qwen-plus and qwen3.6-plus. — [Alibaba EMR AI function pricing](https://help.aliyun.com/en/emr/emr-serverless-starrocks/product-overview/ai-function); [Model Studio billing](https://www.alibabacloud.com/help/en/model-studio/billing-for-model-studio)

### Inferences
- Demo or competition stage with synthetic or public-record data only: run the Gemini 2.5 Flash-Lite or 3.1 Flash-Lite free tier for analysis (about $0/hour within the rate limits) and Deepgram's $200 credit (about 300 hours of streaming with diarization). Analysis would then cost close to nothing.
- Neither suits real court data. The Gemini free tier uses data for product improvement, and Deepgram runs in the US or EU.
- Paid Gemini 2.5 Flash-Lite with the assumed mix costs about $0.0012 per call, or $0.37/hour. That's similar to gpt-oss on Bedrock, so leaving AWS buys little on price.

### Gaps
- Soniox: Indonesian support, real-time diarization, and data residency weren't confirmed.
- No reliable SEA-HELM or IndoMMLU leaderboard numbers were retrieved; searches returned unrelated results.
- No API pricing or availability was found for SEA-LION or Sahabat-AI. They appear to be open-weight releases (unverified), so using them on AWS would mean self-hosting on SageMaker or EC2, or a Bedrock Custom Model Import.
- AssemblyAI Indonesian streaming and Bahasakita/Datasakti pricing weren't researched because of the scope change and tool budget.

## 4. Cost per hearing hour: recommended combinations

### Takeaway
On AWS, the cost per hearing hour can drop from about $1.95 (excluding the reviewer) to about $0.70–1.45. Most of the saving comes from prompt caching and from limiting the reviewer to flagged statements. Transcribe streaming at $0.60/hour becomes the largest fixed cost.

### Cited Findings
- The inputs are the prices cited in sections 1–3: Transcribe streaming $0.60/hour and batch $0.36/hour ([AWS](https://aws.amazon.com/transcribe/pricing/)), Bedrock models ([AWS](https://aws.amazon.com/bedrock/pricing/)), Nova Micro ([Developers Digest](https://www.developersdigest.tech/models/nova-micro)), Gemini ([Google](https://ai.google.dev/gemini-api/docs/pricing)) and Deepgram ([Deepgram](https://deepgram.com/pricing)).

### Inferences
Estimates per hearing hour, assuming 300 analysis calls with about 10k input and 600 output tokens each, and a reviewer on 15 flagged calls.

| Combination | Speech | Analysis | Reviewer | Total/hour | Data location |
|---|---|---|---|---|---|
| A. Current (reviewer on every call) | Transcribe streaming $0.60 | Nova 2 Lite $1.35 | Kimi K3 × 300 = $18.90 | about $20.85 | Singapore + reviewer region |
| B. AWS optimized, cheapest acceptable | Transcribe streaming $0.60 | Nova 2 Lite with cache, about $0.81 | DeepSeek V3.2 × 15, about $0.11 | about $1.52 | Singapore/APAC (check the inference profile) |
| C. AWS ultra-cheap (needs a quality evaluation) | Transcribe streaming $0.60 | Nova Micro with cache, about $0.10 | Nova 2 Lite × 15, about $0.07 | about $0.77 | Singapore/APAC |
| D. Keep-in-Indonesia leaning | Transcribe in ap-southeast-1 (Singapore; Jakarta availability unconfirmed) | DeepSeek V3.2 or MiniMax M2.5 in-region in Jakarta, about $0.0087 per call (DeepSeek, $2.62/hour) or $0.0045 per call (MiniMax, $1.34/hour) | none | about $1.94–3.22 | LLM in Indonesia, speech in Singapore |
| E. Demo / competition near-free (synthetic or public data only) | Deepgram Nova-3 id with the $200 credit, or Transcribe free 60 min | Gemini Flash-Lite free tier | Gemini Flash free tier | about $0 until credits run out | US/EU, Google trains on free-tier data |

- Uploaded recordings: use Transcribe batch ($0.36/hour) and Bedrock batch (50% off) for full re-analysis. This cuts post-hearing cost by about 40–50%.
- Production suitability:
  - B and C fit production best, since they keep AWS in one Region family and one data-processing agreement.
  - D gives the strongest Indonesian data-residency story for the LLM, but speech still leaves Indonesia unless Transcribe id-ID streaming is confirmed in Jakarta.
  - E is for demo use only.

### Gaps
- All per-call figures depend on the assumed 10k/600 token mix. Measure Jude's actual input and output tokens per call to firm them up.
- The quality of Nova Micro and MiniMax on Indonesian witness-statement analysis is untested. Run Jude's own evaluation set before switching.
