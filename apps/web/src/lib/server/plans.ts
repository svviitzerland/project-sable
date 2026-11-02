import { z } from "zod";
import type { Database } from "./database";
import type { User } from "./contracts";
import { HttpError } from "./errors";
import {
  MAX_ACCOUNTS,
  PLAN_IDS,
  PLANS,
  TRIAL,
  billedAccounts,
  planLimits,
  planPrice,
  type Billing,
  type PlanId,
} from "../pricing";

/**
 * Simulated billing. There is no payment gateway: a plan change applies
 * immediately and nothing is charged or invoiced. Usage is metered read-only
 * from records the workspace already stores.
 */
const planId = z.enum(PLAN_IDS as [PlanId, ...PlanId[]]);
const billingId = z.enum(["monthly", "yearly"]);

export const planInput = z.object({
  plan: planId,
  billing: billingId.default("yearly"),
  accounts: z.number().int().min(1).max(MAX_ACCOUNTS).default(1),
});

export const planOutput = z.object({
  plan: planId,
  billing: billingId,
  accounts: z.number().int(),
  started_at: z.string().nullable(),
  trial_ends_at: z.string().nullable(),
  price_per_month: z.number().int(),
  simulated: z.literal(true),
  usage: z.object({
    hearing_seconds_this_month: z.number(),
    ai_questions_this_month: z.number().int(),
  }),
  limits: z.object({
    hearing_seconds: z.number().int(),
    ai_questions: z.number().int(),
  }),
  exceeded: z.object({
    hearing_seconds: z.boolean(),
    ai_questions: z.boolean(),
  }),
});
export type PlanOutput = z.infer<typeof planOutput>;

const iso = (value: string | Date | null | undefined) =>
  value ? new Date(value).toISOString() : null;

const isPlan = (value: unknown): value is PlanId =>
  (PLAN_IDS as readonly unknown[]).includes(value);

/** Start of the current calendar month in UTC; stored timestamps are ISO strings. */
export function monthStart(at = new Date()) {
  return new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1),
  ).toISOString();
}

/**
 * Transcribed audio seconds and the user's own AI questions this month across
 * the user's cases. Live transcription segments carry their audio offsets.
 * Typed or imported statements never count as hearing time.
 */
export async function usage(db: Database, userId: string, at = new Date()) {
  const since = monthStart(at);
  const [audio] = await db.query<{ seconds: number | string | null }>(
    `SELECT COALESCE(SUM(CASE WHEN s."end" > s.start THEN s."end" - s.start ELSE 0 END), 0) AS seconds
     FROM jude_segments s JOIN jude_cases c ON c.id = s.case_id
     WHERE c.owner_id = ? AND s.origin = 'transcribe' AND s.created_at >= ?`,
    [userId, since],
  );
  const [questions] = await db.query<{ count: number | string | null }>(
    `SELECT COUNT(*) AS count
     FROM jude_dialogue_messages m
     JOIN jude_dialogues d ON d.id = m.dialogue_id
     JOIN jude_cases c ON c.id = d.case_id
     WHERE c.owner_id = ? AND m.role = 'user' AND m.created_at >= ?`,
    [userId, since],
  );
  return {
    hearing_seconds_this_month:
      Math.round(Number(audio?.seconds ?? 0) * 10) / 10,
    ai_questions_this_month: Number(questions?.count ?? 0),
  };
}

export async function planDetail(db: Database, user: User) {
  const plan: PlanId = isPlan(user.plan) ? user.plan : "trial";
  const billing: Billing =
    user.plan_billing === "monthly" ? "monthly" : "yearly";
  const accounts = billedAccounts(plan, Number(user.plan_accounts) || 1);
  const used = await usage(db, user.id);
  const limits = planLimits(plan, accounts);
  return planOutput.parse({
    plan,
    billing,
    accounts,
    started_at: iso(user.plan_started_at),
    trial_ends_at: iso(user.trial_ends_at),
    price_per_month: planPrice(plan, billing, accounts),
    simulated: true,
    usage: used,
    limits,
    exceeded: {
      hearing_seconds: used.hearing_seconds_this_month > limits.hearing_seconds,
      ai_questions: used.ai_questions_this_month > limits.ai_questions,
    },
  });
}

/** Switches the plan immediately. Kantor Hukum needs at least three accounts. */
export async function switchPlan(
  db: Database,
  user: User,
  input: z.output<typeof planInput>,
) {
  if (input.plan === "kantor" && input.accounts < PLANS.kantor.minAccounts)
    throw new HttpError(
      422,
      `Kantor Hukum needs at least ${PLANS.kantor.minAccounts} accounts.`,
    );
  const trial = input.plan === "trial";
  const [updated] = await db.update(
    "users",
    {
      plan: input.plan,
      plan_billing: input.billing,
      plan_accounts: trial ? 1 : input.accounts,
      plan_started_at: new Date().toISOString(),
      // Returning to the trial keeps the original end date, so it cannot be extended.
      ...(trial && !user.trial_ends_at
        ? {
            trial_ends_at: new Date(
              Date.now() + TRIAL.days * 86_400_000,
            ).toISOString(),
          }
        : {}),
    },
    "id=?",
    [user.id],
  );
  return planDetail(db, updated);
}
