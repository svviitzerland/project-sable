/**
 * Jude pricing: plan prices, included usage and the plan calculator. Pure and
 * shared by the pricing page, the simulated account plan API and tests. All
 * amounts are Indonesian rupiah per account per month, excluding PPN. See
 * docs/product/PRICING.md for the unit economics behind these numbers.
 */

export type Billing = "monthly" | "yearly";
export type PlanId = "trial" | "lite" | "advokat" | "kantor" | "lembaga";
export type PaidPlanId = "lite" | "advokat" | "kantor";

export const PLAN_IDS: readonly PlanId[] = [
  "trial",
  "lite",
  "advokat",
  "kantor",
  "lembaga",
];
export const PAID_PLAN_IDS: readonly PaidPlanId[] = [
  "lite",
  "advokat",
  "kantor",
];

export const TRIAL = {
  days: 14,
  hours: 2,
  questions: 30,
  cases: 1,
} as const;

type PaidPlan = {
  monthly: number;
  yearly: number;
  hours: number;
  questions: number;
  minAccounts: number;
  /** Voice recognition across hearings (the same voice keeps its name). */
  voice: boolean;
  /** Shared team cases, team roles and pooled allowances. */
  team: boolean;
};

export const PLANS = {
  lite: {
    monthly: 299_000,
    yearly: 249_000,
    hours: 1,
    questions: 150,
    minAccounts: 1,
    voice: false,
    team: false,
  },
  advokat: {
    monthly: 899_000,
    yearly: 749_000,
    hours: 5,
    questions: 300,
    minAccounts: 1,
    voice: true,
    team: false,
  },
  kantor: {
    monthly: 1_549_000,
    yearly: 1_290_000,
    hours: 10,
    questions: 600,
    minAccounts: 3,
    voice: true,
    team: true,
  },
} as const satisfies Record<PaidPlanId, PaidPlan>;

/**
 * Legal aid programme for BPHN-accredited organizations (Pro-level features at
 * about half price) and an office-wide yearly licence quoted per institution.
 */
export const LEMBAGA = {
  from: 449_000,
  hours: 3,
  questions: 150,
  minAccounts: 1,
  licenceFromYearly: 30_000_000,
} as const;

/** Optional overage, off by default. */
export const EXTRA_HOUR = 120_000;

/** Prepaid hearing-hour packs, valid for 12 months. */
export const PACKS = [
  { id: "pack5", hours: 5, price: 550_000 },
  { id: "pack20", hours: 20, price: 2_000_000 },
] as const;
export const PACK_VALIDITY_MONTHS = 12;

/** A typical criminal hearing session lasts about 1 to 1.5 hours. */
export const HEARING_HOURS = { min: 1, max: 1.5 } as const;

export const MAX_ACCOUNTS = 200;
export const CALCULATOR_LIMITS = {
  hours: { min: 1, max: 40 },
  accounts: { min: 1, max: 50 },
} as const;

/** Price per account per month for a billing period. */
export function seatPrice(plan: PaidPlanId, billing: Billing) {
  return PLANS[plan][billing];
}

/** The upfront yearly amount per account. */
export function yearlyTotal(plan: PaidPlanId) {
  return PLANS[plan].yearly * 12;
}

/** Months saved per year by paying yearly, to one decimal (2 on every paid plan). */
export function monthsSaved(plan: PaidPlanId) {
  const { monthly, yearly } = PLANS[plan];
  return Math.round((((monthly - yearly) * 12) / monthly) * 10) / 10;
}

/** Effective price of one included hearing hour, rounded to the rupiah. */
export function perHour(plan: PaidPlanId, billing: Billing) {
  return Math.round(PLANS[plan][billing] / PLANS[plan].hours);
}

/**
 * How many hearing sessions an amount of hours covers, assuming 1 to 1.5 hours
 * per session: 1 hour is about 1 session, 5 hours 3 to 5, 10 hours 6 to 10.
 */
export function hearingsFor(hours: number) {
  const max = Math.max(0, Math.floor(hours / HEARING_HOURS.min));
  const min = Math.max(1, Math.floor(hours / HEARING_HOURS.max));
  return { min: Math.min(min, max || 1), max: max || 1 };
}

/** Accounts that are actually billed: Kantor Hukum bills at least three. */
export function billedAccounts(plan: PlanId, accounts: number) {
  const n = clampInt(accounts, 1, MAX_ACCOUNTS);
  if (plan === "trial") return 1;
  if (plan === "kantor") return Math.max(PLANS.kantor.minAccounts, n);
  return n;
}

/** Included monthly usage for a plan and account count (trial: the whole trial). */
export function planLimits(plan: PlanId, accounts: number) {
  const n = billedAccounts(plan, accounts);
  const per =
    plan === "trial" ? TRIAL : plan === "lembaga" ? LEMBAGA : PLANS[plan];
  return {
    hearing_seconds: per.hours * n * 3600,
    ai_questions: per.questions * n,
  };
}

/**
 * Monthly price of a plan for an account count. Lembaga uses the legal aid
 * programme price; office-wide licences are quoted separately.
 */
export function planPrice(plan: PlanId, billing: Billing, accounts: number) {
  const n = billedAccounts(plan, accounts);
  if (plan === "trial") return 0;
  if (plan === "lembaga") return LEMBAGA.from * n;
  return seatPrice(plan, billing) * n;
}

export type HourMix = {
  pack20: number;
  pack5: number;
  extra: number;
  cost: number;
};

/**
 * Cheapest way to buy `hours` additional hearing hours from 20-hour packs,
 * 5-hour packs and single extra hours. Ties prefer fewer purchases.
 */
export function cheapestHours(hours: number): HourMix {
  const need = Math.max(0, Math.ceil(hours));
  const [small, large] = PACKS;
  let best: HourMix = {
    pack20: 0,
    pack5: 0,
    extra: need,
    cost: need * EXTRA_HOUR,
  };
  for (let pack20 = 0; pack20 <= Math.ceil(need / large.hours); pack20++) {
    const rest = Math.max(0, need - pack20 * large.hours);
    for (let pack5 = 0; pack5 <= Math.ceil(rest / small.hours); pack5++) {
      const extra = Math.max(0, rest - pack5 * small.hours);
      const cost =
        pack20 * large.price + pack5 * small.price + extra * EXTRA_HOUR;
      const count = pack20 + pack5 + extra;
      if (
        cost < best.cost ||
        (cost === best.cost && count < best.pack20 + best.pack5 + best.extra)
      )
        best = { pack20, pack5, extra, cost };
    }
  }
  return best;
}

export type Quote = {
  plan: PaidPlanId;
  billing: Billing;
  accounts: number;
  billedAccounts: number;
  subscription: number;
  includedHours: number;
  extraHoursPerMonth: number;
  /** Hour purchases for a year of this usage (packs last 12 months). */
  yearlyHours: HourMix;
  /** Hour purchases averaged per month. */
  hoursPerMonth: number;
  total: number;
  perHour: number;
};

/**
 * Monthly cost of one paid plan for a team. Lite and Pro hours are per account
 * and not pooled, so each account covers its own overage. Kantor Hukum pools
 * hours across the team. Recurring overage is bought as a year of packs and
 * extra hours, averaged per month, because packs stay valid for 12 months.
 */
export function quote(
  plan: PaidPlanId,
  billing: Billing,
  hoursPerAccount: number,
  accounts: number,
): Quote {
  const hours = clampInt(hoursPerAccount, 0, 24 * 31);
  const n = clampInt(accounts, 1, MAX_ACCOUNTS);
  const billed = billedAccounts(plan, n);
  const subscription = seatPrice(plan, billing) * billed;
  const includedHours = PLANS[plan].hours * billed;
  let extraHoursPerMonth: number;
  let yearlyHours: HourMix;
  if (PLANS[plan].team) {
    extraHoursPerMonth = Math.max(0, hours * n - includedHours);
    yearlyHours = cheapestHours(extraHoursPerMonth * 12);
  } else {
    const perAccount = Math.max(0, hours - PLANS[plan].hours);
    const one = cheapestHours(perAccount * 12);
    extraHoursPerMonth = perAccount * n;
    yearlyHours = {
      pack20: one.pack20 * n,
      pack5: one.pack5 * n,
      extra: one.extra * n,
      cost: one.cost * n,
    };
  }
  const hoursPerMonth = Math.round(yearlyHours.cost / 12);
  const total = subscription + hoursPerMonth;
  const usedHours = hours * n;
  return {
    plan,
    billing,
    accounts: n,
    billedAccounts: billed,
    subscription,
    includedHours,
    extraHoursPerMonth,
    yearlyHours,
    hoursPerMonth,
    total,
    perHour: usedHours > 0 ? Math.round(total / usedHours) : 0,
  };
}

export type Needs = {
  /** The team works on the same cases (Kantor Hukum only, from two accounts). */
  shared?: boolean;
  /** Voice recognition across hearings (Pro and Kantor Hukum). */
  voice?: boolean;
};

export type Recommendation = {
  best: Quote;
  /** The other eligible plans, cheapest first. */
  others: Quote[];
  /** The cheapest plan ignoring the needs, when the needs changed the answer. */
  cheapestWithoutNeeds: Quote | null;
  /** One account using no more than the trial allowance. */
  trialFits: boolean;
  /** Large teams should ask about volume pricing. */
  volume: boolean;
};

const tierOrder: Record<PaidPlanId, number> = {
  lite: 0,
  advokat: 1,
  kantor: 2,
};

/** Cheapest first. On a tie, the plan with more features wins. */
function rank(quotes: Quote[]) {
  return [...quotes].sort(
    (a, b) => a.total - b.total || tierOrder[b.plan] - tierOrder[a.plan],
  );
}

/** Recommends the cheapest paid plan, with packs and extra hours, for a usage profile. */
export function recommend(input: {
  hoursPerAccount: number;
  accounts: number;
  billing: Billing;
  needs?: Needs;
}): Recommendation {
  const hours = clampInt(
    input.hoursPerAccount,
    CALCULATOR_LIMITS.hours.min,
    CALCULATOR_LIMITS.hours.max,
  );
  const accounts = clampInt(
    input.accounts,
    CALCULATOR_LIMITS.accounts.min,
    CALCULATOR_LIMITS.accounts.max,
  );
  const all = PAID_PLAN_IDS.map((plan) =>
    quote(plan, input.billing, hours, accounts),
  );
  const shared = !!input.needs?.shared && accounts >= 2;
  const eligible = all.filter(
    (q) =>
      (!shared || PLANS[q.plan].team) &&
      (!input.needs?.voice || PLANS[q.plan].voice),
  );
  const [best, ...others] = rank(eligible);
  const [cheapest] = rank(all);
  return {
    best,
    others,
    cheapestWithoutNeeds: cheapest.plan === best.plan ? null : cheapest,
    trialFits: accounts === 1 && hours <= TRIAL.hours,
    volume: accounts >= 10,
  };
}

function clampInt(value: number, min: number, max: number) {
  const n = Number.isFinite(value) ? Math.round(value) : min;
  return Math.min(max, Math.max(min, n));
}
