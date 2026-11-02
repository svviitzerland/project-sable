# Hyperscaler Jakarta regions for Jude: AWS Jakarta (ap-southeast-3) vs Singapore, with a short comparison of other clouds

Accessed 2026-11-02. Scope narrowed by the coordinator mid-task: the core is AWS Jakarta vs Singapore. GCP, Azure and Alibaba get a short comparison table only. Prices are USD on-demand, Linux, from the AWS public price maps behind the official pricing pages (`b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/...`), pulled 2026-11-02, unless noted.

## Q1. Which Bedrock models Jude uses can run in Jakarta, and can processing stay in Indonesia or APAC?

### Takeaway
No. Neither of Jude's current models can be pinned to Jakarta or to an APAC geography. Amazon Nova 2 Lite and Moonshot Kimi K3 are both "Global only" when called from ap-southeast-3, exactly as they are from Singapore. That means a request sent to Jakarta can be processed in any commercial AWS Region worldwide. The only in-Region or APAC-geo options in Jakarta that AWS documents are older first-generation Nova models (Nova Lite, Nova Pro). Every current Claude model is Global-only from Jakarta.

### Cited Findings
- **Amazon Nova 2 Lite** (`amazon.nova-2-lite-v1:0`): from ap-southeast-3 (Jakarta) the rows read In-Region ✗, Geo ✗, Global ✓. Singapore (ap-southeast-1) reads the same. Geo profiles exist only as `us.`, `eu.` and `jp.amazon.nova-2-lite-v1:0`. The JP profile routes Tokyo to Tokyo or Osaka only. There is no `apac.` profile. The global profile `global.amazon.nova-2-lite-v1:0` lists Jakarta as one of its destination Regions, alongside the Americas, EMEA and the rest of APAC. Launched 2025-12-02, "EOL no sooner than" 2026-12-02, 1M context, 64K max output. — [AWS Nova 2 Lite model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.html)
- **Moonshot Kimi K3** (`moonshotai.kimi-k3`): from Jakarta it reads In-Region ✗, Geo ✗, Global ✓, and Singapore is the same. Geo profiles exist only as `us.moonshotai.kimi-k3` and `in.moonshotai.kimi-k3` (India: Mumbai and Hyderabad only). Launched 2026-09-18. — [AWS Kimi K3 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-moonshot-ai-kimi-k3.html)
- **Kimi K3 price** per 1M tokens (Standard tier):
  - Global CRIS: $3.00 input, $15.00 output, $0.30 cache read, $3.75 cache write (30 min).
  - US CRIS or IN CRIS: $3.30 input, $16.50 output.
  - Flex tier is 0.5x and Priority is 1.75x.
  - Output tokens burn the quota at 10x.

  — [AWS Kimi K3 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-moonshot-ai-kimi-k3.html)
- **Amazon Nova Lite and Nova Pro (v1)**: in Jakarta both read In-Region "Supported", Geo "Supported", Global "Not supported". The fetched excerpt did not show which geo prefix or destination Regions apply. — [Bedrock Regional availability by models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html)
- **Claude models**: Sonnet 4.6, Opus 4.8, Opus 5, Sonnet 5, Fable 5 and Mythos 5.1 are all Global-only from Jakarta (In-Region and Geo not supported). — [Bedrock Regional availability by models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html)
- **Opt-in Region**: Jakarta must be enabled on the AWS account before use. — [AWS blog: GPT on Bedrock global CRIS in TH/MY/SG/ID/TW](https://aws.amazon.com/blogs/machine-learning/accessing-openai-gpt-models-on-amazon-bedrock-with-global-cross-region-inference-in-thailand-malaysia-singapore-indonesia-and-taiwan/)
- **How the profile types differ**:
  - In-Region keeps requests within a single Region.
  - Geo routes across Regions within a geography (US, EU, APAC, JP, AU, IN).
  - Global routes to any supported commercial Region worldwide.
  - A geo profile's destination list never changes, while a Global profile's list grows as AWS adds Regions.

  — [AWS: Supported Regions and models for inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html); [Nova 2 Lite model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.html)
- **Data residency caveat (AWS's own words)**: "your inference request can be routed to any of the destination Regions in the profile, even if you did not opt-in to such Regions in your account. Your input prompts and output results may be stored in the opt-in Regions for abuse detection purposes." AWS also says: "If you have data residency requirements, call GetInferenceProfile from every source Region ... Don't rely on the geographic prefix in an inference profile ID alone." — [AWS: inference profiles support](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)
- **Endpoints**: Jakarta offers both `bedrock-runtime` and `bedrock-mantle`. Application inference profiles can be created in ap-southeast-3. — [Bedrock endpoints by Region](https://docs.aws.amazon.com/bedrock/latest/userguide/endpoints-region-availability.html); [inference profiles support](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)

### Inferences
- **Moving to Jakarta changes nothing for inference residency.** Jude's Bedrock calls would still use `global.*` profiles, with the same worldwide routing as today from Singapore. The only gain is that the API call starts in Indonesia.
- **There is no Indonesia-only or APAC-only path for Nova 2 Lite or Kimi K3** as of 2026-11-02. Keeping inference inside Indonesia would mean switching to Nova Lite or Nova Pro v1 In-Region in Jakarta. These are older and weaker models, and their lifecycle status should be checked. The other route is a self-hosted model on Jakarta EC2 GPU instances (Jakarta offers g5, g7e, p5 and p5en families per the EC2 price map). That is far more expensive at Jude's scale.
- **Per-hearing LLM cost is the same in either Region**, because Global CRIS pricing is the same everywhere. As an example, 300 calls × 6,000 input tokens (1.8M) plus 300 × 650 output tokens (195K), all on Kimi K3 Global: 1.8 × $3.00 + 0.195 × $15.00 ≈ **$8.33 per hearing-hour** before caching or reviewer calls. Nova 2 Lite would be much cheaper, but its price was not retrieved (see Gaps).

### Gaps
- Nova 2 Lite per-token price: not fetched from https://aws.amazon.com/bedrock/pricing/.
- The geo prefix and destination list for Nova Lite and Nova Pro v1 geo profiles from Jakarta: the doc excerpt was truncated. Confirm with `aws bedrock list-inference-profiles --region ap-southeast-3 --type-equals SYSTEM_DEFINED`, then run `get-inference-profile` on each result.
- Whether any `apac.*` profile with Jakarta as a source exists for other models (Qwen, DeepSeek, gpt-oss, Mistral, Llama): the 680 KB availability page could not be read in full.

## Q2. Is Amazon Transcribe streaming (id-ID with speaker labels) available in Jakarta?

### Takeaway
No. Amazon Transcribe is not offered in ap-southeast-3 at all, for either batch or streaming. The nearest streaming Regions are Singapore, Malaysia (ap-southeast-5, streaming only) and Thailand (ap-southeast-7, streaming only). Live transcription for a Jakarta-hosted Jude would therefore leave Indonesia.

### Cited Findings
- **Jakarta is absent from Transcribe's Region table.** APAC rows: ap-east-1 (batch); ap-northeast-1, ap-northeast-2, ap-south-1, ap-southeast-1 and ap-southeast-2 (batch and streaming); ap-southeast-5 Malaysia (streaming); ap-southeast-7 Thailand (streaming). — [What is Amazon Transcribe? (Region availability)](https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html)
- **Billing**: per second, with no minimum. Rates are per Region and listed on the pricing page. — [What is Amazon Transcribe?](https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html); [Transcribe pricing](https://aws.amazon.com/transcribe/pricing/)

### Inferences
- **A "Jakarta" deployment is really a split design for speech.** Jude's server, or the browser using temporary credentials, would stream audio to Singapore, or to Malaysia if id-ID and speaker partitioning work there. That last point is unverified.

### Gaps
- Whether id-ID streaming with speaker partitioning is supported in ap-southeast-5 or ap-southeast-7: the supported-languages page was not fetched.
- The Singapore Transcribe streaming price per minute was not retrieved, so the per-hearing-hour ASR cost is open.

## Q3. Is core infrastructure (EC2, RDS PostgreSQL, S3) available in Jakarta, and what does it cost vs Singapore?

### Takeaway
EC2, RDS PostgreSQL and S3 are all available in Jakarta, with one exception: **t3a instances are not offered there.** Jakarta's general-purpose burstable options are t3 and t4g (Graviton). The equivalent Jakarta prices came out identical to Singapore for every item checked. The swap from t3a.medium to t3.medium costs about $4/month more; t4g.medium costs about $3.50/month less.

### Cited Findings (on-demand Linux, USD per hour, AWS price maps pulled 2026-11-02)

| Item | Jakarta (ap-southeast-3) | Singapore (ap-southeast-1) |
|---|---|---|
| EC2 t3a.medium | **not offered** (no t3a family in the Jakarta on-demand list) | $0.0472 |
| EC2 t3.medium | $0.0528 | $0.0528 |
| EC2 t4g.medium | $0.0424 | $0.0424 |
| EC2 t4g.small | $0.0212 | $0.0212 |
| RDS PostgreSQL db.t4g.micro Single-AZ | $0.025 | $0.025 |
| RDS PostgreSQL db.t4g.micro Multi-AZ | $0.051 | $0.051 |
| RDS PostgreSQL db.t4g.small Single-AZ | $0.051 | $0.051 |
| S3 Standard, first 50 TB | $0.025 per GB-month | $0.025 per GB-month |

Sources: [EC2 on-demand pricing](https://aws.amazon.com/ec2/pricing/on-demand/) (data from the price map at `b0.p.awsstatic.com/.../ec2-ondemand-without-sec-sel/Asia Pacific (Jakarta)/Linux/index.json`); [RDS for PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/) (map `rds-postgresql-ondemand.json`); [S3 pricing](https://aws.amazon.com/s3/pricing/) (map `s3.json`).

Jakarta EC2 families present: c5, c5d, c5n, c6g, c6gd, c6gn, c6in, c7g, c7gd, c7i, c7i-flex, c8g, c8gn, d3en, g5, g5g, g7e, i3, i3en, i4i, i7i, i7ie, i8g, m5, m5d, m6g, m6gd, m6i, m7g, m7i, m7i-flex, m8g, p5, p5en, p6-b300, r5, r5d, r6g, r6gd, r7g, r7gd, r7i, r8g, r8gd, t3, t4g, u-*, x2idn, x2iedn. This list comes from the same price map.

Monthly estimate (730 h), excluding RDS storage, EBS and data transfer:
- **Singapore today**: t3a.medium $34.46 + db.t4g.micro $18.25 + S3 50 GB $1.25 = **≈ $53.96**
- **Jakarta with t3.medium**: $38.54 + $18.25 + $1.25 = **≈ $58.04**
- **Jakarta with t4g.medium (arm64)**: $30.95 + $18.25 + $1.25 = **≈ $50.45**

### Inferences
- **Hosting in Jakarta costs the same as Singapore at this footprint.** The Docker image would need an amd64 build for t3 or an arm64 build for t4g. Moving from t3a would need a Terraform change in `infra/terraform`.
- **A cross-Region split adds AWS inter-Region data transfer** for audio sent from Jakarta to Singapore or Malaysia for Transcribe, and for Bedrock request and response payloads. Bedrock CRIS itself is billed at the source-Region price.

### Gaps
- RDS gp2/gp3 storage per GB-month and EBS gp3 for both Regions: the storage price map URL returned an error. Check the official RDS and EBS pricing pages.
- Inter-Region and internet data-transfer-out rates for Jakarta vs Singapore were not retrieved.
- Why the old idea that Jakarta costs more than Singapore didn't hold: the 2026 price maps show identical rates for every item checked. This is reported as found and not explained further.

## Q4. Is a split design possible (data at rest in Jakarta, inference via an APAC profile)?

### Takeaway
Partly. Data at rest can live entirely in Jakarta: RDS, S3, EC2 and EBS are all available. AWS gives no in-Region or APAC-geo profile from Jakarta for Nova 2 Lite or Kimi K3, so that inference goes through a Global profile with possible abuse-detection storage in any destination Region. Transcribe has to run in Singapore, Malaysia or Thailand. An honest description would be "data stored in Indonesia; AI processing transient, routed by AWS globally (LLM) and in Singapore/Malaysia (speech)".

### Cited Findings
- **Jakarta as a source Region**: Jakarta is a Global CRIS source Region for current Claude models, OpenAI GPT-5.6 and Nova 2 Lite. — [AWS blog: Claude global CRIS in TH/MY/SG/ID/TW](https://aws.amazon.com/blogs/machine-learning/global-cross-region-inference-for-latest-anthropic-claude-opus-sonnet-and-haiku-models-on-amazon-bedrock-in-thailand-malaysia-singapore-indonesia-and-taiwan/); [GPT-5.6 CRIS blog](https://aws.amazon.com/blogs/machine-learning/introducing-cross-region-inference-for-openai-gpt-5-6-models-on-amazon-bedrock/)
- **Prompt and output storage**: they "may be stored in the opt-in Regions for abuse detection purposes" under cross-Region inference. — [AWS: inference profiles support](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)
- **Restricting destinations**: SCPs can block destination Regions, but a CRIS request fails if any destination Region in the profile is blocked. A Global profile therefore cannot be narrowed to APAC with SCPs. — [AWS: inference profiles support](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)

### Inferences
- **For strict Indonesian processing residency on AWS today**, there are two routes:
  - Swap the LLM to Nova Lite or Nova Pro v1 In-Region in Jakarta.
  - Self-host on Jakarta GPU instances, and replace Transcribe with Jude's browser-native speech or a self-hosted ASR in Jakarta.

  Both cost quality and/or money.
- **The pragmatic middle ground** is Jakarta for data at rest, plus Global CRIS for the LLM and Singapore for Transcribe, with the routing disclosed in the privacy policy.

### Gaps
- Whether Bedrock invocation logging or abuse-detection storage can be disabled or confined: not researched.

## Q5. Short comparison: other hyperscalers' Jakarta regions

### Takeaway
None of them offers a fully in-Indonesia stack of a frontier or mid-tier LLM plus streaming Indonesian ASR with diarization in its Jakarta region, based on official tables accessed 2026-11-02.

| Cloud / Jakarta region | LLM in-region in Jakarta? | Streaming Indonesian ASR in Jakarta? | Managed Postgres / VM / object storage in Jakarta |
|---|---|---|---|
| **AWS** ap-southeast-3 | Global-only for Nova 2 Lite, Kimi K3 and Claude; Nova Lite and Pro v1 In-Region ([AWS](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html)) | No, Transcribe is not in Jakarta ([AWS](https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html)) | Yes (RDS, EC2 t3/t4g, S3) |
| **Google Cloud** asia-southeast2 | No. Jakarta is not listed for Gemini; APAC regional rows are Mumbai, Singapore, Hong Kong, Taiwan, Tokyo, Sydney and Seoul. Gemini 2.5 / 3.x are offered via the global endpoint, which Google says not to use if you have ML-processing requirements ([Vertex AI locations](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations)) | Not confirmed. Chirp 3 regions found were asia-southeast1, asia-northeast1 and the us/eu multi-regions. id-ID is Preview, and diarization is BatchRecognize-only ([Chirp 3](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3)) | Cloud SQL and Cloud Run in Jakarta not verified in this pass |
| **Azure** Indonesia Central | No. Indonesia Central is absent from every Foundry "models sold by Azure" table (Global Standard, Data Zone, Regional, Provisioned; page updated 2026-10-19) ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability)) | No. Indonesia Central is not in the Speech regions list (page updated 2026-11-01); nearest is southeastasia with real-time, fast and batch transcription ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions)) | Region exists with 3 AZs and no pair ([Azure regions list](https://learn.microsoft.com/en-us/azure/reliability/regions-list)); PostgreSQL Flexible Server availability not verified |
| **Alibaba Cloud** Jakarta, **Tencent Cloud** Jakarta, **BytePlus** | Not researched (scope cut by coordinator) | Not researched | Not researched |

### Inferences
- **Moving to another hyperscaler doesn't buy Indonesian AI residency.** Any of them would also need to route LLM and ASR traffic to Singapore or globally, so it gives no residency advantage over staying on AWS.

### Gaps
- GCP, Azure and Alibaba prices for the small footprint and per-hearing-hour AI: not collected, by the coordinator's scope change.
- Alibaba Model Studio / Qwen in Jakarta, Tencent Cloud and BytePlus ModelArk: not researched.
