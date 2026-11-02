import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PAID_PLAN_IDS,
  billedAccounts,
  cheapestHours,
  hearingsFor,
  monthsSaved,
  perHour,
  planLimits,
  planPrice,
  quote,
  recommend,
  yearlyTotal,
} from "../src/lib/pricing";

test("plan prices, yearly totals and per-hour anchors match the published scheme", () => {
  assert.equal(yearlyTotal("lite"), 2_988_000);
  assert.equal(yearlyTotal("advokat"), 8_988_000);
  assert.equal(yearlyTotal("kantor"), 15_480_000);
  // Yearly billing is about two months free on every paid plan.
  for (const plan of PAID_PLAN_IDS) assert.equal(monthsSaved(plan), 2);
  assert.equal(perHour("lite", "yearly"), 249_000);
  assert.equal(perHour("advokat", "yearly"), 149_800);
  assert.equal(perHour("kantor", "yearly"), 129_000);
  assert.equal(perHour("advokat", "monthly"), 179_800);
  assert.equal(perHour("kantor", "monthly"), 154_900);
});

test("hours translate into typical hearing sessions of 1 to 1.5 hours", () => {
  assert.deepEqual(hearingsFor(1), { min: 1, max: 1 });
  assert.deepEqual(hearingsFor(2), { min: 1, max: 2 });
  assert.deepEqual(hearingsFor(3), { min: 2, max: 3 });
  assert.deepEqual(hearingsFor(5), { min: 3, max: 5 });
  assert.deepEqual(hearingsFor(10), { min: 6, max: 10 });
  assert.deepEqual(hearingsFor(20), { min: 13, max: 20 });
});

test("Kantor Hukum bills at least three accounts and pools its allowance", () => {
  assert.equal(billedAccounts("kantor", 1), 3);
  assert.equal(billedAccounts("kantor", 5), 5);
  assert.equal(billedAccounts("trial", 4), 1);
  assert.equal(planPrice("kantor", "yearly", 2), 3_870_000);
  assert.equal(planPrice("advokat", "monthly", 2), 1_798_000);
  assert.equal(planPrice("lite", "yearly", 1), 249_000);
  assert.equal(planPrice("trial", "yearly", 1), 0);
  assert.equal(planPrice("lembaga", "monthly", 4), 1_796_000);
  assert.deepEqual(planLimits("kantor", 3), {
    hearing_seconds: 30 * 3600,
    ai_questions: 1800,
  });
  assert.deepEqual(planLimits("lite", 1), {
    hearing_seconds: 3600,
    ai_questions: 150,
  });
  assert.deepEqual(planLimits("trial", 9), {
    hearing_seconds: 2 * 3600,
    ai_questions: 30,
  });
});

test("extra hours use the cheapest mix of packs and single hours", () => {
  assert.deepEqual(cheapestHours(0), {
    pack20: 0,
    pack5: 0,
    extra: 0,
    cost: 0,
  });
  assert.equal(cheapestHours(1).cost, 120_000);
  assert.deepEqual(cheapestHours(4), {
    pack20: 0,
    pack5: 0,
    extra: 4,
    cost: 480_000,
  });
  assert.equal(cheapestHours(5).cost, 550_000);
  assert.deepEqual(cheapestHours(12), {
    pack20: 0,
    pack5: 2,
    extra: 2,
    cost: 1_340_000,
  });
  assert.equal(cheapestHours(16).cost, 1_770_000);
  assert.deepEqual(cheapestHours(18), {
    pack20: 1,
    pack5: 0,
    extra: 0,
    cost: 2_000_000,
  });
  assert.equal(cheapestHours(48).cost, 4_910_000);
  assert.equal(cheapestHours(540).cost, 27 * 2_000_000);
});

test("the calculator recommends the cheapest eligible plan for the usage", () => {
  const one = recommend({ hoursPerAccount: 1, accounts: 1, billing: "yearly" });
  assert.equal(one.best.plan, "lite");
  assert.equal(one.best.total, 249_000);

  // Five hours alone: Lite plus a year of packs costs less than Pro...
  const five = recommend({
    hoursPerAccount: 5,
    accounts: 1,
    billing: "yearly",
  });
  assert.equal(five.best.plan, "lite");
  assert.equal(five.best.total, 249_000 + Math.round(4_910_000 / 12));
  // ...unless voice recognition across hearings is needed.
  const voice = recommend({
    hoursPerAccount: 5,
    accounts: 1,
    billing: "yearly",
    needs: { voice: true },
  });
  assert.equal(voice.best.plan, "advokat");
  assert.equal(voice.best.total, 749_000);
  assert.equal(voice.best.perHour, 149_800);
  assert.equal(voice.cheapestWithoutNeeds?.plan, "lite");

  // A team on shared cases gets Kantor Hukum, with a year of packs for the rest.
  const team = recommend({
    hoursPerAccount: 25,
    accounts: 3,
    billing: "yearly",
    needs: { shared: true },
  });
  assert.equal(team.best.plan, "kantor");
  assert.equal(team.best.total, 3_870_000 + 4_500_000);
  assert.equal(team.best.perHour, Math.round(8_370_000 / 75));
  assert.equal(team.others.length, 0);
  assert.equal(team.cheapestWithoutNeeds?.plan, "lite");

  const modest = recommend({
    hoursPerAccount: 10,
    accounts: 3,
    billing: "monthly",
    needs: { shared: true },
  });
  assert.equal(modest.best.plan, "kantor");
  assert.equal(modest.best.total, 4_647_000);

  // Without shared cases, separate accounts compare individually (hours are not pooled).
  const separate = recommend({
    hoursPerAccount: 25,
    accounts: 3,
    billing: "yearly",
  });
  assert.equal(separate.best.plan, "lite");
  assert.equal(
    separate.best.total,
    747_000 + Math.round((3 * 28_910_000) / 12),
  );
  assert.equal(
    separate.others.find((q) => q.plan === "advokat")?.total,
    2_247_000 + 6_000_000,
  );

  // Two accounts on shared cases pay for a third Kantor Hukum seat.
  const pair = recommend({
    hoursPerAccount: 10,
    accounts: 2,
    billing: "yearly",
    needs: { shared: true },
  });
  assert.equal(pair.best.plan, "kantor");
  assert.equal(pair.best.billedAccounts, 3);
  // Shared cases mean nothing for one account.
  assert.equal(
    recommend({
      hoursPerAccount: 1,
      accounts: 1,
      billing: "yearly",
      needs: { shared: true },
    }).best.plan,
    "lite",
  );
});

test("calculator inputs are clamped and flags describe trial and volume cases", () => {
  const low = recommend({ hoursPerAccount: 0, accounts: 0, billing: "yearly" });
  assert.equal(low.best.accounts, 1);
  assert.equal(low.trialFits, true);
  const high = recommend({
    hoursPerAccount: 99,
    accounts: 999,
    billing: "yearly",
  });
  assert.equal(high.best.accounts, 50);
  assert.equal(high.volume, true);
  assert.equal(
    recommend({ hoursPerAccount: Number.NaN, accounts: 1, billing: "yearly" })
      .best.total,
    249_000,
  );
  assert.equal(quote("kantor", "yearly", 0, 3).perHour, 0);
});
