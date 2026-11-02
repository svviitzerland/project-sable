# Jude pricing

Status: proposal implemented as a public page (`/pricing`) and a simulated plan switch in the workspace. There is no payment gateway, no checkout and no invoicing yet. All prices are Indonesian rupiah per account per month, excluding PPN. The numbers live in one place, `apps/web/src/lib/pricing.ts`, which the page, the calculator and the `/api/v1/account/plan` API share; `apps/web/tests/pricing.test.ts` pins them.

## Unit cost basis

Internal estimates, not shown on the page. Exchange rate about Rp16.500 per USD.

| Item | Basis | Cost used |
| --- | --- | --- |
| One hearing hour | Amazon Transcribe streaming about $0.60/h, Nova 2 Lite screening about $1.32/h, Kimi K3 review about $0.90/h, plus a buffer for payment fees and FX | Rp55.000 |
| One AI question (assistant, ask evidence, practice turn) | Nova 2 Lite with retrieved context | Rp200 |
| Fixed infrastructure | EC2, RDS, S3, data transfer, domain | about Rp1,07 juta per month |

A hearing hour is metered as audio minutes transcribed and analysed, rounded up per minute. We assume a typical criminal hearing session lasts 1 to 1.5 hours, so the page translates hours into sessions: 1 hour ≈ 1 sidang, 5 hours ≈ 3–5, 10 hours ≈ 6–10 (`hearingsFor()`).

## Plans

| Plan (id) | Monthly billing | Yearly billing | Included per account per month | Notes |
| --- | --- | --- | --- | --- |
| Coba Gratis (`trial`) | Rp0 for 14 days, no card | | 2 hearing hours and 30 AI questions in total, public demo case, 1 own case | `.jude` export included |
| Advokat Lite (`lite`) | Rp299.000 | Rp249.000 (Rp2.988.000/year) | 1 hour, 150 AI questions | All core features, no voice recognition across hearings |
| Advokat Pro (`advokat`) | Rp899.000 | Rp749.000 (Rp8.988.000/year) | 5 hours, 300 AI questions (fair use) | Adds voice recognition across hearings, optional extra hours |
| Kantor Hukum (`kantor`) | Rp1.549.000 | Rp1.290.000 (Rp15.480.000/year) | 10 hours and 600 AI questions per account, pooled | Minimum 3 accounts. Adds shared team cases, team roles, priority support, invoice and faktur pajak. Recommended plan |
| Lembaga & LBH (`lembaga`) | Rp449.000 | quoted | 3 hours, 150 AI questions | Program Bantuan Hukum for BPHN-accredited organizations (Pro-level features at about half price). Office-wide licence from Rp30 juta/year, quoted |

Yearly billing is paid upfront and saves 2 months on every paid plan (about 17%). Kantor Hukum's monthly price was set to Rp1.549.000 so that its yearly price of Rp1.290.000 keeps the same 2-month saving; at Rp1.490.000 monthly the saving would only be 1.6 months.

Per-hour anchors shown under each paid plan (price / included hours, following the billing toggle): Lite Rp249.000, Pro Rp149.800, Kantor Hukum Rp129.000 yearly (Rp299.000, Rp179.800 and Rp154.900 monthly). Kantor Hukum is the decoy-anchored, visually emphasized plan.

### Add-ons (prepaid, valid 12 months)

| Add-on | Price | Per hour |
| --- | --- | --- |
| 5-hour pack | Rp550.000 | Rp110.000 |
| 20-hour pack | Rp2.000.000 | Rp100.000 |
| Extra hour (optional overage, off by default) | Rp120.000 | Rp120.000 |

### Billing protections promised on the page

- A usage meter in the app shows remaining hours and AI questions.
- Overage is off by default. At the limit, live transcription stops until the user buys a pack or turns extra hours on, so there is no bill shock.
- Cancel anytime. The plan runs to the end of the paid period.
- `.jude` export is never locked, on any plan, including the trial and after cancelling. Voiceprints are never exported.

## Unit economics (worst case, fully used)

| Plan | Worst-case cost per account | Price | Gross margin |
| --- | --- | --- | --- |
| Trial (14 days) | 2 × 55.000 + 30 × 200 = Rp116.000 | Rp0 | acquisition cost, capped |
| Lite yearly | 1 × 55.000 + 150 × 200 = Rp85.000 | Rp249.000 | 66% |
| Lite monthly | Rp85.000 | Rp299.000 | 72% |
| Pro yearly | 5 × 55.000 + 300 × 200 = Rp335.000 | Rp749.000 | 55% |
| Pro monthly | Rp335.000 | Rp899.000 | 63% |
| Kantor Hukum yearly | 10 × 55.000 + 600 × 200 = Rp670.000 | Rp1.290.000 | 48% |
| Kantor Hukum monthly | Rp670.000 | Rp1.549.000 | 57% |
| Program Bantuan Hukum | 3 × 55.000 + 150 × 200 = Rp195.000 | Rp449.000 | 57% |
| 5-hour pack | Rp275.000 | Rp550.000 | 50% |
| 20-hour pack | Rp1.100.000 | Rp2.000.000 | 45% |
| Extra hour | Rp55.000 | Rp120.000 | 54% |

Kantor Hukum is the lowest worst-case margin because every account would have to use all 10 hours and 600 questions. Pooled allowances are rarely exhausted by every seat, so typical margin is higher (at 60% usage, cost Rp402.000 and margin 69%). Office-wide licences should be quoted so that the worst-case cost stays under half of the licence (Rp30 juta/year allows about Rp1,25 juta of variable cost per month, for example 20 hours and 750 questions).

### Break-even

Fixed infrastructure is about Rp1,07 juta per month. Two Advokat Pro subscribers bring Rp1.498.000 of revenue. At a typical 60% usage their contribution is 2 × (749.000 − 201.000) = Rp1.096.000, which covers the fixed cost. If both used everything, three Pro subscribers (or seven Lite subscribers) are needed. One Kantor Hukum team of three covers it on its own (contribution at least 3 × 620.000).

## Calculator logic

`recommend()` in `src/lib/pricing.ts` takes hearing hours per account per month (1–40), accounts (1–50), the billing period and two needs:

- Lite and Pro hours are per account and not pooled. Each account covers its own overage. Kantor Hukum pools hours and bills at least 3 accounts.
- Recurring overage is costed as a year of purchases (packs last 12 months) using the cheapest mix of 20-hour packs, 5-hour packs and extra hours (`cheapestHours()`), then averaged per month.
- "The team works on the same cases" (from 2 accounts) limits the choice to Kantor Hukum. "Recognize the same voice across hearings" excludes Lite.
- The cheapest eligible plan wins. Ties go to the plan with more features. When a need changed the answer, the page also states what the cheapest plan without that need would cost.

Known consequences of the current numbers, worth revisiting:

- Packs at Rp100.000–110.000 per hour are cheaper than any plan's included hour, so a solo user with no voice need is better off on Lite plus packs than on Pro (5 hours: Rp658.167 versus Rp749.000 per month, yearly). The calculator says so honestly. Raising pack prices to about Rp130.000 per hour, or limiting packs to Pro and above, would restore the ladder.
- On hours alone, separate Lite accounts with packs undercut Kantor Hukum for teams. Kantor Hukum is recommended only because shared cases need it. Three accounts at 25 hours each cost Rp8.370.000 per month on Kantor Hukum yearly.
- Shared team cases, team roles, priority support and invoicing are plan features on the page that the product does not have yet. They must ship before Kantor Hukum is sold.

## Mock billing (simulated, no payment)

Until a gateway is integrated, signed-in users can switch plans freely and instantly:

- Migration `db/migrations/009_user_plans.sql` adds `plan` (default `trial`), `plan_billing` (default `yearly`), `plan_accounts` (default 1), `plan_started_at` and `trial_ends_at` (now + 14 days) to `jude_users`. Local SQLite adds the same columns on startup (`database.ts`). New users, including demo sign-in accounts, start on the trial.
- `GET /api/v1/account/plan` returns the plan, billing, accounts, dates, the monthly price, `simulated: true`, this month's usage, the plan limits and which limits are exceeded. `POST /api/v1/account/plan` with `{ plan, billing, accounts }` switches immediately (Zod-validated, Kantor Hukum needs at least 3 accounts, returning to the trial keeps the original end date and one account). `/auth/me` includes the plan id.
- Usage is read-only metering from existing records in the current UTC month: the summed duration of live-transcribed segments (`origin = 'transcribe'`) in the user's cases, and the count of the user's own dialogue messages (assistant and practice turns). Nothing is enforced. The account menu shows the plan, a compact meter for each limit (amber when exceeded) and a "Change plan" link to `/pricing`. Per-minute rounding and ask-evidence questions are not yet metered.
- On `/pricing`, signed-in visitors see "Pilih paket ini" and "Paket Anda saat ini". Choosing opens a confirm dialog with plan, billing, accounts and price, labeled "Mode demo: tidak ada pembayaran, paket langsung aktif". No invoices or receipts are produced.

## Payment gateway recommendation

Use Xendit or Midtrans. Both cover what the page lists: QRIS, bank virtual accounts (BCA, Mandiri, BNI, BRI), e-wallets (GoPay, OVO, DANA, ShopeePay), cards with recurring tokenization, and invoices for firms.

- Prefer annual upfront payment for cash flow (yearly is the default on the page).
- Card-on-file accounts can enable extra hours (overage billed at month end). Everyone else uses prepaid packs, so overage can never become unpaid debt.
- Firms and institutions pay by invoice with faktur pajak. Register for PPN collection before charging.
- Gateway fees (QRIS and e-wallet percentages, a flat virtual account fee, higher card fees) are inside the Rp55.000 per hour buffer. Confirm the contracted rates before launch.

## Levers if costs rise

1. Route more screening to the cheapest adequate model and review only potential inconsistencies (already the design).
2. Lower included AI questions under fair use before touching hearing hours.
3. Raise pack and extra-hour prices first, since they are the thinnest margins (45–54%).
4. Keep yearly prices and anchors stable for existing customers. Adjust monthly prices for new customers.
5. Move to the Jakarta region only if Transcribe and Bedrock prices there keep the hourly cost under Rp55.000.
