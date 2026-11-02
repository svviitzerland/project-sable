# Cutting Jude's fixed hosting cost: AWS-native levers first, cheap external complements second (as of 2 November 2026)

Scope note: the coordinator changed the scope partway through. The goal is to **stay on AWS** and lower the ~$65/month fixed bill (EC2 t3a.medium $34, RDS db.t4g.micro $18, EBS/IPv4/snapshots ~$10, all in ap-southeast-1 Singapore). Free external services appear only as complements. Non-AWS VPS providers and Indonesian clouds get a short note at the end. All pages were accessed 2 November 2026. Prices are USD and exclude tax unless stated. Region is US East unless stated, because several AWS pricing pages show only that region.

## 1. AWS Free Tier (2026 credit-based plan) and AWS credits

### Takeaway
New AWS accounts now get up to $200 in credits on a 6-month "Free plan". After 6 months the account closes unless it is upgraded, so this is a demo bridge, not a lasting saving. AWS Activate Founders ($1,000, and up to $5,000 for selected startups) is the most realistic credit source for a self-funded Indonesian team. It requires a Paid-plan account. Free-plan accounts cannot receive promotional credits at all.

### Cited Findings
- New accounts get $100 at sign-up and can earn up to $100 more by exploring services, up to $200 in total. The account closes after 6 months or when credits run out, whichever comes first. There is no charge unless you convert to the Paid plan. — [AWS Free Tier](https://aws.amazon.com/free/)
- The Free plan limits access to selected services and "can't scale workloads beyond their credits". Free-plan accounts **are not eligible for promotional credits**. The Paid plan gives access to every service, and new Paid-plan customers can also receive up to $200 in credits. — [AWS Free Tier](https://aws.amazon.com/free/)
- Services covered on both plans include EC2, S3, Aurora, RDS, DynamoDB, Amazon Bedrock and SageMaker AI. More than 30 services are "always free" within monthly limits. — [AWS Free Tier](https://aws.amazon.com/free/)
- Aurora PostgreSQL Serverless on the Free plan allows up to 4 ACUs and 1 GiB of storage per cluster. The Aurora pricing page describes the credits as usable "for up to 12 months". That conflicts with the 6-month account closure on the main Free Tier page. — [Aurora pricing](https://aws.amazon.com/rds/aurora/pricing/); conflicts with [AWS Free Tier](https://aws.amazon.com/free/)
- **AWS Activate Founders** (self-funded): $1,000 to start, up to $5,000 for selected participants. **Activate Portfolio**: up to **$200,000**. Portfolio needs an Org ID from an Activate Provider (accelerator, angel or VC). Eligibility: pre-Series B, founded within the last 10 years, AWS account on a **Paid Tier Plan**, and new to Activate credits. The page lists no website requirement and no validity period. It does not say whether credits cover Bedrock or third-party Marketplace models. — [AWS Activate credits](https://aws.amazon.com/startups/credits)
- For comparison, Microsoft's self-serve Azure startup offer gives $1,000 for 90 days, plus $4,000 for 180 days after business verification. The investor-referral track starts at $100,000. "Founders Hub" was renamed "Microsoft for Startups" in July 2025. — [Microsoft Learn: Changes to Microsoft for Startups](https://learn.microsoft.com/microsoft-for-startups/changes-microsoft-for-startups)
- Google's AI program advertises up to $350,000 in Cloud credits for early-stage AI-first startups that are VC-funded, founded within 10 years, and have received no more than $5,000 in prior Google Cloud credits. — [Google for Startups AI program](https://cloud.google.com/startup/ai)

### Inferences
- The coordinator's brief said "Portfolio up to $100k". AWS's official page currently says **up to $200,000**. Use the official figure.
- The Free plan cannot be stacked with Activate. To use Activate, upgrade to the Paid plan first; new Paid-plan accounts still get up to $200. In practice the $200 covers about 3 months of the current $65 bill. Activate Founders $1,000 covers about 15 months of the current bill, or about 2.5 years of a trimmed ~$35 stack.
- A student team needs a registered company identity and a Paid account to apply. Activate Portfolio is reachable only through an affiliated provider. In Indonesia that could be a university incubator or accelerator, if it is an Activate Provider.

### Gaps
- Whether Activate credits cover Bedrock third-party models (for example Anthropic via Bedrock) or Marketplace charges was not on the page. Check the AWS Promotional Credit Terms.
- I found no official AWS Educate / AWS Academy credit amounts for 2026, and no Indonesia-specific AWS startup programs (for example AWS-run hackathon credits). Not researched due to the tool budget.
- Credit validity period (commonly reported as 1 to 2 years) is unverified.

## 2. EC2 right-sizing: Graviton, Savings Plans, Spot, IPv4

### Takeaway
Switching t3a.medium to t4g.medium saves only about $3/month (~$31 vs $34). The bigger levers are: putting everything on one instance (dropping RDS saves ~$18), removing extra public IPv4 addresses ($3.65/month each), and committing for 1 year.

### Cited Findings
- t4g.medium in Singapore costs about $0.0424/hour on demand, roughly $30.95/month. t4g.small (2 GB) costs about $0.021/hour, roughly $15/month. These are third-party aggregators that agree with each other. — [aws-pricing.com t4g.medium](https://aws-pricing.com/t4g.medium.html); [devzero ap-southeast-1](https://www.devzero.io/instances/aws/regions/ap-southeast-1)
- Public IPv4 costs $0.005/hour per address, whether in use or idle (about $3.65/month each). A NAT Gateway costs $0.045/hour plus $0.045/GB in the US East (Ohio) example. — [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/)

### Inferences
- Running the web app, PostgreSQL+pgvector and the voice service on one t4g.medium (4 GB) is tight, because pyannote needs ~2 GB. t4g.large (8 GB, roughly twice the t4g.medium price ≈ $62, unverified) would remove the RDS line but cost about the same as today. A cheaper split: keep the voice service off until a recording needs processing, or run it on demand.
- Graviton (arm64) requires multi-arch Docker images. Node and the official Postgres/pgvector images support arm64. pyannote/torch wheels exist for aarch64, but test the voice image build.
- Avoid a NAT Gateway (~$33/month): keep the instance in a public subnet or use IPv6/egress-only IGW.

### Gaps
- Official Singapore prices for t4g.large and EBS gp3 per GB, Compute Savings Plan / Reserved Instance discount percentages for 1-year no-upfront, and Spot discounts were not fetched. Typical published ranges (about 30-40% for a 1-year no-upfront Savings Plan; Spot often 60-70% off but can be interrupted) are from background knowledge, not verified this session.
- Whether the new Free plan's EC2 usage covers the public IPv4 charge was not stated.

## 3. Lightsail bundles (instance + managed DB + object storage)

### Takeaway
Lightsail is the simplest AWS-native way to get a predictable bill. A 2 vCPU/4 GB instance costs $24 (or $20 IPv6-only) and includes 80 GB SSD and 4 TB transfer. Add $3 for 100 GB of object storage. With self-hosted Postgres on the instance, the whole stack is about $27/month. Adding a Lightsail managed DB costs $15-30 more.

### Cited Findings
- Linux bundles with public IPv4: $12 (2 GB, 2 vCPU, 60 GB, 3 TB), **$24 (4 GB, 2 vCPU, 80 GB, 4 TB)**, $44 (8 GB, 2 vCPU, 160 GB, 5 TB). IPv6-only bundles: $10 / **$20** / $40 for the same specs. — [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)
- Managed database bundles (standard / high availability): $15/$30 (1 GB RAM, 40 GB, **no encryption**), $30/$60 (2 GB, 80 GB, encrypted), $60/$120 (4 GB, 120 GB). The page does not name the engine. — [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)
- Object storage bundles: $1 (5 GB, 25 GB transfer), **$3 (100 GB, 250 GB transfer)**, $5 (250 GB, 500 GB transfer). Overage in Singapore: $0.025/GB storage, $0.12/GB transfer. In Jakarta: $0.023/GB storage, $0.132/GB transfer. — [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)
- **Jakarta** plans get **half** the listed data transfer allowance (as do Mumbai, Sydney, Malaysia, Hong Kong and São Paulo). Singapore gets the full allowance. — [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)

### Inferences
- The Jakarta overage pricing implies Lightsail runs in Jakarta (ap-southeast-3), which would keep data in Indonesia at the same bundle price. The trade-off is half the transfer allowance (2 TB on the $24 plan), which is still plenty for Jakarta.
- The $15 managed DB lacks encryption at rest. That is a poor fit for legal documents, so the realistic managed option is $30. Lightsail managed PostgreSQL may not allow the `vector` extension. Self-hosting Postgres+pgvector in Docker on the instance avoids that question.
- Lightsail does not integrate as cleanly with IAM instance roles and Bedrock as EC2 does. Jude would need access keys for S3/Bedrock, or peering to the default VPC. Check this before migrating.

### Gaps
- pgvector support on Lightsail managed databases was not confirmed. Neither was the current Lightsail free trial length (historically 3 months on selected bundles).

## 4. Database: self-hosted Postgres vs RDS vs Aurora Serverless v2 vs Aurora DSQL

### Takeaway
For a ~20 GB pgvector database with steady daytime traffic, self-hosting Postgres on the app instance is the cheapest option ($0 extra plus EBS storage). Aurora Serverless v2 with scale-to-zero only wins if the database is idle most hours. Even then, cold resumes are a UX cost.

### Cited Findings
- Aurora Serverless v2 has supported a 0 ACU minimum with automatic pause/resume since 20 November 2024. Supported versions: Aurora PostgreSQL 13.15+, 14.12+, 15.7+ and 16.3+. There is no capacity charge while paused. The instance resumes when a connection arrives, possibly at lower capacity. — [AWS What's New](https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-aurora-serverless-v2-scaling-zero-capacity); [Aurora auto-pause docs](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html)
- Aurora Serverless costs $0.12/ACU-hour (Standard) or $0.156 (I/O-Optimized). Storage is $0.10/GB-month (Standard). I/O is $0.20 per million on Standard. These are US East rates; the page shows no Singapore rates. — [Aurora pricing](https://aws.amazon.com/rds/aurora/pricing/)
- The Free plan includes Aurora PostgreSQL serverless with up to 4 ACUs and 1 GiB of storage. — [Aurora pricing](https://aws.amazon.com/rds/aurora/pricing/)

### Inferences
- Aurora running at 0.5 ACU around the clock costs about $44/month in US East (0.5 × $0.12 × 730), which is more than RDS db.t4g.micro (~$18). With 20 GB of storage (~$2) and about 8 active hours a day, cost falls to about $15/month plus I/O. That is break-even with RDS at best, with cold starts on top. Not worth it for Jude.
- The 1 GiB Free-plan Aurora storage is far below Jude's ~20 GB. Fine for a demo with a small dataset only.
- Self-hosting on EC2/Lightsail means owning backups. Use pg_dump to S3 on a schedule plus EBS snapshot lifecycle. Keep the migration job (`db/migrate.mjs`) unchanged; it only needs `DATABASE_URL`.

### Gaps
- The Aurora DSQL pricing page returned 404, so its DPU/storage rates and free tier are unverified. From background knowledge (unverified), DSQL is PostgreSQL-compatible but has historically **lacked extension support, including pgvector**. That would disqualify it for Jude. Verify before considering.
- I did not fetch RDS gp3 minimum storage or db.t4g.micro eligibility under the 2026 Free plan.

## 5. Storage, CDN and serverless compute on AWS

### Takeaway
I could not verify object storage, CDN and serverless compute pricing this session. At tens of GB, S3 costs only a few dollars either way, so the big money is in compute and the database, not here.

### Cited Findings
- Lightsail object storage costs $3/month for 100 GB including 250 GB transfer. That is likely the cheapest AWS-native option for this volume. — [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)

### Inferences
- Snapshot retention and ECR lifecycle rules (keep the last N images) control the "~$10 misc" line. Most of that line is likely the $3.65/month IPv4 address plus EBS volumes.
- Fargate, App Runner and Lambda are unlikely to beat a single always-on t4g instance for a server that holds SSE connections and in-process background jobs. AGENTS.md requires in-process jobs, so the server cannot scale to zero without breaking job processing.

### Gaps
- Not fetched: S3 Standard / Intelligent-Tiering Singapore prices, CloudFront always-free allowance (widely cited as 1 TB/month egress plus 10M requests, unverified), Fargate / Fargate Spot per vCPU-hour, App Runner pricing.

## 6. Free external complements (Supabase, Neon, Cloudflare R2)

### Takeaway
None of the free tiers can hold Jude's ~20 GB database. Supabase free also pauses after a week of inactivity. Cloudflare R2's free 10 GB with zero egress is the only external free service that clearly beats AWS, and only if audio/document downloads grow. Its data location is not Indonesia.

### Cited Findings
- **Supabase Free**: 500 MB database per project, 1 GB file storage, 5 GB egress, **projects pause after 1 week of inactivity**, 2 active projects. **Pro** costs from $25/month and includes 8 GB disk per project, 100 GB file storage, 250 GB egress, and $10 compute credit (one Micro instance). Paid projects never pause. Overage: database disk $0.125/GB, file storage $0.0213/GB, egress $0.09/GB. — [Supabase pricing](https://supabase.com/pricing)
- Supabase runs on AWS regions, including Southeast Asia (Singapore) ap-southeast-1. The regions list shows no Jakarta region. — [Supabase regions](https://supabase.com/docs/guides/platform/regions)
- **Neon Free**: 1 GB storage per project (20 GB across the organization), 100 CU-hours per project per month, **scale-to-zero after 5 minutes that cannot be disabled**, and 5 GB egress. pgvector is included on all plans. The **Launch** plan costs $0.106/CU-hour and $0.35/GB-month. The region list was not on the page. — [Neon pricing](https://neon.com/pricing)
- **Cloudflare R2**: free tier of 10 GB-month, 1M Class A and 10M Class B operations. Standard storage costs $0.015/GB-month. **Egress is free.** — [R2 pricing](https://developers.cloudflare.com/r2/pricing/)

### Inferences
- With 20 GB on Supabase Pro: $25 plus 12 GB × $0.125 ≈ $26.50/month. That is more than RDS db.t4g.micro (~$18) and far more than self-hosting. It only makes sense if Jude also adopts Supabase Auth/Storage, which it does not.
- With 20 GB on Neon Launch: about $7 for storage plus compute. Always-on 0.25 CU ≈ $19, giving ~$26 total. Scale-to-zero cuts compute but adds cold starts. Not cheaper than RDS for steady use.
- R2 beats S3 when downloads are large (S3/Lightsail egress is $0.09-0.12/GB). For ~tens of GB stored and modest viewing, the S3/Lightsail cost is already only a few dollars. Moving to R2 also takes data out of the AWS IAM-role model and away from the Singapore/Jakarta AWS location. Cloudflare's CDN/DNS free plan can sit in front of AWS for TLS and caching at no cost.

#### Data-location check (verified 2 November 2026)
- **Supabase regions** (AWS only): us-west-1, us-west-2, us-east-1, us-east-2, ca-central-1, eu-west-1/2/3, eu-central-1/2, eu-north-1, ap-south-1 (Mumbai), **ap-southeast-1 (Singapore)**, ap-northeast-1/2, ap-southeast-2 (Sydney) and sa-east-1. There are also "general" regions (East US, Central EU, Southeast Asia → Singapore). **No Jakarta / ap-southeast-3 / Indonesia region is listed on any plan.** The page states no plan-based region restriction. It also notes that choosing a region controls data location but "is not proof of regulatory compliance". — [Supabase regions](https://supabase.com/docs/guides/platform/regions)
- **Neon regions** (AWS): us-east-1, us-east-2, us-west-2, eu-central-1, eu-west-2, **ap-southeast-1 (Singapore)**, ap-southeast-2 (Sydney) and sa-east-1. Azure regions are deprecated for new projects. **No Jakarta.** New regions can be requested through support. The page states no plan-based region restriction. — [Neon regions](https://neon.com/docs/introduction/regions)
- **Cloudflare R2**: location hints wnam, enam, weur, eeur, **apac** and oc are "a best effort and not a guarantee". The only *jurisdictions* (guaranteed storage location) are **eu, us and fedramp**. **There is no Indonesia or Asia-Pacific residency guarantee.** — [R2 data location](https://developers.cloudflare.com/r2/reference/data-location/)

#### Does the user's reasoning hold?
User's reasoning: *"Supabase Jakarta is not free, so if regulation requires data in Indonesia the free options are out and we stay on AWS."*
- **The premise is inaccurate.** Supabase's hosted platform has no Jakarta region at any price, not just "not free". The nearest region is Singapore, which is also available on the Free plan as far as the docs say. The same holds for Neon (nearest region Singapore). R2 offers only a best-effort `apac` hint, with no Indonesian guarantee.
- **The conclusion holds, and is stronger than stated.** If data must stay in Indonesia, *no* free external option (Supabase, Neon, R2) qualifies, and neither does any of their paid managed tiers. The Indonesia-located options are:
  1. **AWS Jakarta (ap-southeast-3)**: EC2/Lightsail with self-hosted Postgres+pgvector, or RDS in Jakarta, plus S3 or Lightsail object storage in Jakarta. Lightsail Jakarta object storage overage is $0.023/GB storage and $0.132/GB transfer; Jakarta bundles get half the transfer allowance. — [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)
  2. **Self-hosted Supabase** (open source) on an AWS Jakarta EC2 instance. Possible, but it adds several containers (Postgres, GoTrue, PostgREST, Storage, Kong) that Jude does not need, since Jude already has its own backend. Plain Postgres+pgvector is lighter. (Self-hosting availability is background knowledge; the regions page does not mention self-hosting.)
  3. Indonesian local clouds (section 7), as a non-AWS fallback.
- Cost of the Indonesia option: about the same as Option A/B in section 8 (≈ $27-40/month), plus whatever Jakarta's price premium over Singapore is (not verified this session).
- Caveat: whether Indonesian regulation actually *requires* in-country storage for Jude's data (PP 71/2019 and the PDP Law for private electronic system operators) is outside this note. Other researchers cover it.

### Gaps
- Supabase's docs say nothing explicit about Free-plan region eligibility. The dashboard's New Project form is the authoritative list, and I did not check it.

## 7. Short note: non-AWS and Indonesian alternatives (deprioritized)

### Takeaway
Indonesian clouds are the cheapest way to keep data in Indonesia. Biznet Gio's 2 vCPU/4 GB VM costs Rp139,000/month (~$9), and object storage is Rp1,000/GB. Reliability and tooling are weaker than AWS, so treat this as a fallback only.

### Cited Findings
- Biznet Gio NEO Lite MS 4.2 (2 vCPU, 4 GB, 60 GB SSD) costs Rp139,000/month; NEO Lite Pro MS 4.2 (NVMe) costs Rp559,000/month. NEO Object Storage costs Rp1,000/GB/month single-region and Rp2,000-3,000 multi-region. Additional disk costs Rp1,650/GB. No managed PostgreSQL is listed, and VAT treatment is not stated. — [Biznet Gio pricelist](https://www.biznetgio.com/en/pricelist); [NEO Lite](https://www.biznetgio.com/product/neo-lite)
- IDCloudHost lists 2 vCPU/4 GB VPS plans at roughly Rp105,000-356,000/month. These come from an aggregator and may exclude 11% VAT. — [WHTop IDCloudHost listings](https://www.whtop.com/id/plans/idcloudhost.com/148735)
- DigitalOcean Basic 2 vCPU/4 GB costs $24/month with 4 TB transfer, and Singapore is a listed region. — [DigitalOcean droplet pricing](https://www.digitalocean.com/pricing/droplets)
- Hetzner raised cloud prices in 2026, with several waves around April and June. Third-party sources disagree on the Singapore figures; one reports CPX32 Singapore going from €32.49 to €48.99. Singapore includes only ~1 TB of traffic. — [Northflank](https://northflank.com/blog/hetzner-cloud-server-price-increases); [Capital & Compute](https://capitalandcompute.net/blog/hetzner-price-increase-2026/)
- Oracle Always Free Ampere A1 works only in the tenancy's home region, which cannot be changed after signup. Capacity errors are common. A June 2026 third-party note claims the allowance was halved to 2 OCPU/12 GB; this is unverified against Oracle's docs. — [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm)

### Inferences
- Moving off AWS saves about $15-25/month at most compared with a trimmed AWS stack (section 8). It also loses Bedrock via instance role and the existing Terraform/OIDC deploy. Not worth it given the user's preference.

### Gaps
- Not researched after the scope change: IDCloudHost object storage price, Telkom/NeutraDC, Lintasarta, Nevacloud, Dewaweb, and official Hetzner Singapore price tables.

## 8. Recommended AWS-centric architectures and estimated monthly cost

### Takeaway
Trimmed EC2: about $35-40/month. Lightsail: about $27/month (Singapore or Jakarta). Either option, paid for with Activate Founders credits, makes the demo/competition stage effectively $0 for about 2-3 years.

### Cited Findings
- Component prices as cited above: t4g.medium ≈ $31 (Singapore, aggregator), public IPv4 $3.65, Lightsail 4 GB $24 / $20 IPv6-only, Lightsail object storage $3 per 100 GB, Activate Founders $1,000-5,000. — [aws-pricing.com](https://aws-pricing.com/t4g.medium.html); [VPC pricing](https://aws.amazon.com/vpc/pricing/); [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/); [AWS Activate](https://aws.amazon.com/startups/credits)

### Inferences (estimates; EBS/S3 figures are approximate)
- **Option A (demo/competition, recommended): one EC2 t4g.medium in Singapore or Jakarta.** Runs SvelteKit, Postgres+pgvector in Docker, and the voice service started on demand. Add about 40 GB gp3 EBS, one public IPv4, S3 for files and pg_dump backups, and Cloudflare free DNS/CDN. Cost ≈ $31 + ~$4 EBS + $3.65 + ~$1-2 S3 ≈ **$38-40/month**. A 1-year Savings Plan could bring this to about $30 (discount unverified). Keeps the instance role for S3/Bedrock and the existing Terraform. With Activate Founders $1,000, about 2 years is covered.
- **Option B (cheapest AWS): Lightsail $24 (4 GB) + $3 object storage** ≈ **$27/month**, or $23 IPv6-only behind Cloudflare. Same self-hosted Postgres. Jakarta keeps data in Indonesia. Costs: IAM/Bedrock wiring and leaving the current Terraform/EC2 pipeline.
- **Option C (early paid stage, managed DB kept):** EC2 t4g.medium + RDS db.t4g.micro + S3 ≈ $31 + $18 + ~$8 ≈ **$55-57/month**, or about $40 with 1-year commitments. Alternatively, Lightsail $24 + managed DB $30 (encrypted) + $3 ≈ **$57/month**.
- Not recommended: Aurora Serverless v2 (breaks even with RDS at best, plus cold starts), Supabase/Neon free tiers (500 MB / 1 GB limits, pausing), Fargate/App Runner (in-process jobs and SSE need an always-on process).
- Data residency: everything above can run in AWS Jakarta (ap-southeast-3) instead of Singapore. Jakarta EC2/RDS on-demand prices are typically somewhat higher than Singapore (unverified this session). Bedrock model availability in Jakarta should be checked separately.

### Gaps
- Official Jakarta EC2/RDS/S3 prices were not fetched. Neither were Bedrock model availability in ap-southeast-3, EBS gp3 Singapore price, or Savings Plan rates.
