# 2026-11-02 · Bedrock model choice

## Decision

- **Default tier** (`BEDROCK_MODEL`: statement screening, case assistant, practice): **Amazon Nova 2 Lite**, `global.amazon.nova-2-lite-v1:0`. Replaces `apac.amazon.nova-lite-v1:0`.
- **Review tier** (`BEDROCK_REVIEW_MODEL`: independent check of each potential inconsistency): **Claude Sonnet 4.6**, `global.anthropic.claude-sonnet-4-6`. Replaces `global.anthropic.claude-haiku-4-5-20251001-v1:0`. It comes from a different family than the screener (Anthropic vs Amazon).
- Reasoning stays off for Nova 2 Lite (low effort was measured as worse, see below).

Why: Nova 2 Lite was the only cheap model that, in every run, wrote all explanations in Indonesian, produced a valid tool call (40/40 on the first try in the final run), invented no chunk ids and never marked a bench or counsel turn "supported". It costs about $1.60 per two-hour hearing, against $0.26 for Nova Lite (which repeated the known failures) and $3.90 for Claude Haiku 4.5 (more schema failures, 2 to 3 "supported" bench turns, 10 requests/minute quota). Sonnet 4.6 returned 11/11 valid Indonesian reviews and confirmed none of the screened "inconsistencies". The other strong reviewers either confirmed a weak conflict (Haiku), failed schema or cost more (Kimi K3, Opus 4.6).

## What the account can use (ap-southeast-1, checked 2026-11-02)

`aws bedrock list-foundation-models` lists many newer models, but a forced tool call (`probe`) returned `AccessDeniedException: ... is not available for this account` for Claude Haiku 5.5, Sonnet 5 and 5.5, Opus 4.7 to 5.5, Fable 5 and 5.1, every OpenAI GPT-5.x and GPT-6.x model, xAI Grok 4.6 and 4.7, and Z.AI GLM 5.3. Their on-demand token quotas are also 0 in Service Quotas. Access requires AWS Sales (the error says so). The models that work are Nova Micro, Lite and Pro (`apac.*`), Nova 2 Lite (`global.*` only), Claude Haiku 4.5, Sonnet 4.5 and 4.6, Opus 4.5 and 4.6 (`global.*`), and Moonshot Kimi K3 (`global.*`).

Claude Haiku 5.5 ($0.10 / $0.50 per million tokens) would be the obvious next candidate to benchmark if access is granted. `apps/web/scripts/benchmark-models.ts` reruns this comparison.

## Prices (on-demand, USD per million tokens, input / output)

Source: AWS Price List API (`aws pricing get-products --region us-east-1`, filter `regionCode=ap-southeast-1`), service codes `AmazonBedrock` (Amazon, Moonshot, xAI models) and `AmazonBedrockFoundationModels` (Anthropic, OpenAI Marketplace models), queried 2026-11-02. Global-profile rates are used where that is the only profile.

| Model | Profile | Input | Output | Price list usage type |
|---|---|---|---|---|
| Nova Micro | apac | 0.047 | 0.188 | APS1-NovaMicro-input/output-tokens |
| Nova Lite | apac | 0.081 | 0.324 | APS1-NovaLite-input/output-tokens |
| **Nova 2 Lite** | global | **0.41** | **3.39** | APS1-Nova2.0Lite-*-tokens-cross-region-global |
| Nova Pro | apac | 1.08 | 4.32 | APS1-NovaPro-input/output-tokens |
| Claude Haiku 4.5 | global | 1.00 | 5.00 | APS1-MP:APS1_Input/OutputTokenCount_Global |
| Claude Haiku 5.5 (no access) | global | 0.10 | 0.50 | APS1-MP:APS1_input/output_tokens_global_standard |
| **Claude Sonnet 4.6** | global | **3.00** | **15.00** | APS1-MP:APS1_Input/OutputTokenCount_Global |
| Claude Sonnet 5 / 5.5 (no access) | global | 2.00 | 10.00 | APS1-MP:..._global_standard |
| Claude Opus 4.6 | global | 5.00 | 25.00 | APS1-MP:APS1_Input/OutputTokenCount_Global |
| Kimi K3 | global | 3.00 | 15.00 | APS1-moonshotai.kimi-k3-mantle-*-global-standard |
| Grok 4.6 / 4.7 (no access) | global | 2.00 | 6.00 | APS1-xai.grok-4.x-mantle-*-global-standard |

GPT-5.x, GPT-6 Luna/Sol, GPT-6.1 and GLM 5.3 have no ap-southeast-1 entry in the Price List API. GPT-6 Astra lists $10 / $50.

## Quotas (Service Quotas, `bedrock`, ap-southeast-1)

| Model | Requests/min | Tokens/min |
|---|---|---|
| Nova Lite, Nova Micro (apac cross-Region) | 20 | 400,000 |
| Nova Pro (apac) | 25 | 2,000,000 |
| **Nova 2 Lite (global)** | **20** | 8,000,000 (432M/day) |
| Claude Haiku 4.5 (global) | 10 | 5,000,000 |
| **Claude Sonnet 4.6 (global)** | **10** | 6,000,000 |
| Claude Opus 4.5 / 4.6 (global) | 5 | 2,000,000 / 3,000,000 |
| Kimi K3 (global) | not listed | 10,000,000 |

A screen uses about 6,400 tokens, so 20 requests/minute is the limit (128,000 tokens/minute). A 360-turn hearing analysed after upload takes at least 18 minutes, and live analysis (a few turns per minute) stays under the limit. Analysis already runs at most three statements at a time per process. The Bedrock client now uses adaptive retries (6 attempts) with a 90-second call budget, so bursts wait instead of failing. Sonnet reviews (about 1 to 4 per 40 turns) fit in 10 requests/minute. Raise the Nova 2 Lite quota before batch-importing many hearings at once.

## Benchmark

Data: the public demo archive `apps/web/static/demo/sambo-796-public.jude` (real Direktori Putusan MA excerpt and the Amazon Transcribe transcript of the 8 November 2022 session). Each model ran the app's own pipeline (`investigate`: keyword retrieval of 8 passages, the screening prompt and tool schema, `verifiedConclusion`) through the `rt.bedrock` seam in a throwaway SQLite runtime. The fixed sample had 40 turns: 12 with a saved "supported" finding, 10 "context needed", 6 "insufficient evidence", 4 that failed in the original analysis, and 8 bench or counsel turns without a question mark (procedure, summaries put to the witness), labeled not checkable. The saved findings came from Claude Haiku 4.5 with Sonnet 4.6 review. They are a reference, not ground truth: agreement is reported but not decisive. Accepting "insufficient evidence" counts as agreement for not-checkable turns.

Final run (all provider and prompt changes below applied):

| Screening model | Valid tool call, first try | Verbatim quotes | Unknown chunk ids | Findings withheld | Agreement with reference | "Supported" on 8 bench turns | Indonesian explanations | Median latency | Avg tokens in / out | $ per call | $ per 360-turn hearing |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Nova 2 Lite** | **40/40** | 73% | 0 | 5 | 14/36 | **0** | **40/40** | 3.4 s | 5,863 / 574 | 0.0044 | **1.57** |
| Nova 2 Lite, reasoning low | 40/41 | 61% | 0 | 5 | 16/36 | 2 | 40/40 | 8.3 s | 5,925 / 1,306 | 0.0069 | 2.47 |
| Nova Lite (old default) | 39/40 | 62% | 8 | 10 | 8/36 | 3 | 35/39 | 2.4 s | 6,739 / 539 | 0.0007 | 0.26 |
| Claude Haiku 4.5 | 36/52 (12 retries, 4 still invalid) | 80% | 0 | 5 + 4 schema | 15/36 | 2 | 40/40 | 4.7 s | 7,317 / 718 | 0.0109 | 3.93 |

First run (32 turns, no bench turns, before the retry and prompt changes, so schema failures were final):

| Screening model | Valid first try | Verbatim | Agreement | Indonesian | Median latency | $ per hearing |
|---|---|---|---|---|---|---|
| Nova 2 Lite | 31/32 | 77% | 13/28 | 32/32 | 3.3 s | 1.58 |
| Nova Lite | 32/32 | 69% | 8/28 | 9/32 | 2.3 s | 0.25 |
| Nova Pro | 20/32 (`status` omitted 11 times) | 84% | 8/28 | 23/32 | 3.0 s | 3.16 |
| Claude Haiku 4.5 | 27/32 (`verification` omitted) | 56% | 12/28 | 27/32 | 4.8 s | 3.85 |
| Claude Sonnet 4.6 | 31/32 | 77% | 15/28 | 32/32 | 11.4 s | 13.03 |

A dry run of Nova Micro (7 turns) returned English explanations without citations, so it was dropped.

Independent review: every candidate answered the same packets (the screens' potential inconsistencies: 8 in the first run, 3 in the final run). The decision summary comes from this trial and agrees with it, and the reference analysis confirmed no inconsistency, so the correct answer is mostly "not confirmed".

| Review model | Valid | Confirmed | Indonesian | Median latency | $ per call |
|---|---|---|---|---|---|
| **Claude Sonnet 4.6** | **11/11** | 0 | 11/11 | 13 to 14 s | 0.040 |
| Claude Opus 4.6 | 7/8 | 0 | 7/7 | 23 s | 0.071 |
| Claude Haiku 4.5 | 10/11 | 2 (one rests on "Om Jaswa" vs "Yosua", an ASR name variant) | 7/10 | 7 s | 0.012 |
| Kimi K3 | 1/3 (0/8 before `temperature` was removed) | 0 | 1/1 | 20 s | 0.071 (reasoning tokens) |

Chat check (one assistant question and one practice turn, `scripts/benchmark-chat.ts`):

- Practice: Nova 2 Lite and Nova Lite both answered as the user's own role (defense) and the turn was rejected. With the role removed from the tool schema, Nova 2 Lite replied as opposing counsel in Indonesian. Claude Haiku 4.5 played witness, judge and opposing with a verified quote.
- Case assistant ("who asked Susi to move upstairs and where did she sleep"): Nova 2 Lite's answer was correct (Kuat Ma'ruf, in front of the bathroom outside Putri Candrawathi's room). The reply was still withheld, because one long quote did not match and the first attempt used an invented chunk id. Haiku 4.5 also failed this check before the quote-mark fix. The assistant rejects a reply if any citation fails, so long quotes are fragile with every model (see risks).

Spot reading (Nova 2 Lite): clear matches are found and quoted correctly ("sejak tahun 2020", "grup Whatsapp tersebut sudah tidak aktif", "pemasangan CCTV merupakan inisiatif dari Terdakwa"). Explanations are often generic ("Ini adalah pernyataan faktual yang dapat diverifikasi ..."). It almost never returns `checkable=false`, so bench and counsel turns become "insufficient evidence" or "context needed" findings rather than being skipped, but never "supported". Short answers ("Iya, Bapak.") are read through `preceding_context` as intended.

Spend: about $5 of Bedrock calls in total, all runs included.

## Code changes

- `providers.ts`: structured Bedrock calls parse nested arrays sent as JSON strings, then retry once with the failing field paths named (never their contents). This fixed Haiku's omitted `verification` and Nova Pro's omitted `status`. A missing tool call counts as a failure. `temperature` is omitted for Moonshot and OpenAI GPT models, which reject it. The client uses adaptive retries (6 attempts) and a 90-second budget. The system prompt asks for prose in the testimony's language (Bahasa Indonesia) and no em dashes.
- `quotes.ts`: quote matching treats straight and curly quotation marks as equal and maps back to the exact source text. Models type `Ma'ruf` for the decision's `Ma’ruf`, which withheld otherwise correct citations.
- `analysis.ts`: the screening prompt says bench, prosecutor and counsel turns are usually not checkable even without a question mark, and forbids describing a different turn from the context.
- `dialogues.ts`: the practice speaker enum excludes the user's role, so the schema (and its retry) rejects it. The assistant prompt asks for one-sentence quotes under 200 characters with exact capitalization.
- Tests: `tests/server.test.ts` (repair and retry, temperature, client retry mode), `tests/court-text.test.ts` (quote marks).
- Reusable live scripts: `apps/web/scripts/benchmark-models.ts` (screening and review; `model#reasoning=low` tests Nova 2 reasoning) and `apps/web/scripts/benchmark-chat.ts`. They spend real money and need AWS credentials.

## Deployment

- IAM: no change. The instance role allows `bedrock:InvokeModel` and `bedrock:Converse` on `arn:aws:bedrock:*::foundation-model/*` and the account's `inference-profile/*`. The IAM policy simulator confirms the `*` Region also matches the Region-less model ARN (`arn:aws:bedrock:::foundation-model/amazon.nova-2-lite-v1:0`) that global profiles route to. The deployed policy matches the Terraform.
- Marketplace: Nova 2 Lite is first-party. Claude Sonnet 4.6 was already invoked from this account, so its Marketplace subscription exists. The instance role has no `aws-marketplace:*` permission.
- Model IDs: `infra/terraform/variables.tf` defaults changed. The running instance reads `/opt/project-sable/instance.env`, which user data writes only on first boot, so `terraform apply` is **not required** and would not update the running container. Applying it would only change user data (an in-place stop/start of the instance). Switch production by editing `instance.env` over SSM and rerunning `deploy.sh` (steps in `infra/README.md`). Without that, the app's new code defaults apply only where `BEDROCK_MODEL` is unset.

## Risks and follow-ups

- Global profiles may process data outside Asia Pacific. Nova 2 Lite has no `apac` profile in ap-southeast-1. If residency matters more than quality, `apac.amazon.nova-pro-v1:0` is the in-region option (more schema failures, $3.16 per hearing).
- Retrieval can return passages from another hearing's transcript in the same case (only the current hearing's source document is excluded). In the demo, several "supported" findings quote the other half of the same session rather than the decision. Decide whether earlier hearings should count as comparison sources.
- The case assistant rejects the whole reply when any one citation fails. Consider dropping only the failing citation (as screening does) when at least one verified citation remains.
- 27% of Nova 2 Lite's quotes are not verbatim and are dropped by `verifiedConclusion`. Findings with no remaining verified quote are withheld (5 of 40 turns).
- Practice replies may mention "ketidakjujuran" (dishonesty) as a line of questioning. Prompts forbid credibility findings, but this was observed once.
