<script lang="ts">
  import { resolve } from "$app/paths";
  import type { ResolvedPathname } from "$app/types";
  import {
    ArrowRight,
    ArrowUpRight,
    Check,
    ChevronDown,
    FileText,
    Menu,
    Minus,
    Plus,
    Scale,
    ShieldCheck,
    X,
  } from "@lucide/svelte";
  import { onMount, untrack } from "svelte";
  import { Tween, prefersReducedMotion } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { formatNumber, t, tp } from "../lib/i18n/index.svelte";
  import type { MessageKey } from "../lib/i18n/index.svelte";
  import {
    CALCULATOR_LIMITS,
    EXTRA_HOUR,
    LEMBAGA,
    PACKS,
    PLANS,
    TRIAL,
    hearingsFor,
    perHour,
    planPrice,
    recommend,
    yearlyTotal,
    type Billing,
    type PaidPlanId,
    type PlanId,
  } from "../lib/pricing";
  import { api, type PlanInfo } from "../lib/workspace-api";
  import LanguageToggle from "./LanguageToggle.svelte";
  import Modal from "./Modal.svelte";

  let billing = $state<Billing>("yearly");
  let menuOpen = $state(false);
  let account = $state<PlanInfo | null>(null);

  /** A section of the landing page. */
  const onHome = (hash: string) =>
    `${resolve("/")}#${hash}` as ResolvedPathname;
  const rp = (value: number) => `Rp${formatNumber(value)}`;
  const planName = (plan: PlanId) => t(`plan.name.${plan}` as MessageKey);
  const hours = (count: number) => tp("pricing.hours", count);
  function sessions(count: number) {
    const { min, max } = hearingsFor(count);
    return min === max
      ? t("pricing.sessions.single", { count: max })
      : t("pricing.sessions.range", { min, max });
  }

  // Prices count smoothly to the new billing period; reduced motion jumps.
  const paid: PaidPlanId[] = ["lite", "advokat", "kantor"];
  const prices = {
    lite: new Tween<number>(PLANS.lite.yearly),
    advokat: new Tween<number>(PLANS.advokat.yearly),
    kantor: new Tween<number>(PLANS.kantor.yearly),
  };
  $effect(() => {
    const period = billing;
    const duration = prefersReducedMotion.current ? 0 : 520;
    untrack(() => {
      for (const plan of paid)
        void prices[plan].set(PLANS[plan][period], {
          duration,
          easing: cubicOut,
        });
    });
  });
  const shown = (plan: PaidPlanId) =>
    formatNumber(Math.round(prices[plan].current / 1000) * 1000);

  onMount(() => {
    // Signed-in visitors can switch plans here (simulated billing).
    api<PlanInfo>("/account/plan")
      .then((info) => (account = info))
      .catch(() => (account = null));
  });

  $effect(() => {
    void [menuOpen];
    return untrack(() => {
      if (menuOpen)
        document
          .querySelector<HTMLAnchorElement>("#mobile-navigation a")
          ?.focus();
    });
  });

  // Calculator
  let calcHours = $state(8);
  let calcAccounts = $state(3);
  let needShared = $state(true);
  let needVoice = $state(false);
  const result = $derived(
    recommend({
      hoursPerAccount: calcHours,
      accounts: calcAccounts,
      billing,
      needs: { shared: needShared, voice: needVoice },
    }),
  );
  const purchases = $derived.by(() => {
    const mix = result.best.yearlyHours;
    return [
      mix.pack20 ? t("pricing.calc.pack20", { count: mix.pack20 }) : "",
      mix.pack5 ? t("pricing.calc.pack5", { count: mix.pack5 }) : "",
      mix.extra ? t("pricing.calc.extra", { count: mix.extra }) : "",
    ].filter(Boolean);
  });
  const setAccounts = (value: number) =>
    (calcAccounts = Math.min(
      CALCULATOR_LIMITS.accounts.max,
      Math.max(CALCULATOR_LIMITS.accounts.min, Math.round(value) || 1),
    ));

  let compareOpen = $state(false);
  let openFaq = $state<number[]>([]);
  const faqs = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  // Simulated plan change
  let choosing = $state<PlanId | null>(null);
  let modalBilling = $state<Billing>("yearly");
  let modalAccounts = $state(1);
  let busy = $state(false);
  let done = $state(false);
  let failed = $state("");
  const minAccounts = (plan: PlanId) =>
    plan === "kantor" ? PLANS.kantor.minAccounts : 1;
  function choose(plan: PlanId) {
    choosing = plan;
    modalBilling = billing;
    modalAccounts = Math.max(
      minAccounts(plan),
      account && account.plan !== "trial" ? account.accounts : 1,
    );
    if (plan === "kantor" && calcAccounts >= 3) modalAccounts = calcAccounts;
    done = false;
    failed = "";
  }
  const modalTotal = $derived(
    choosing ? planPrice(choosing, modalBilling, modalAccounts) : 0,
  );
  async function activate() {
    if (!choosing) return;
    busy = true;
    failed = "";
    try {
      account = await api<PlanInfo>("/account/plan", {
        method: "POST",
        body: JSON.stringify({
          plan: choosing,
          billing: modalBilling,
          accounts:
            choosing === "trial"
              ? 1
              : Math.max(minAccounts(choosing), modalAccounts),
        }),
      });
      done = true;
    } catch (error) {
      failed = (error as Error).message || t("pricing.modal.failed");
    } finally {
      busy = false;
    }
  }

  const nav = [
    ["landing.nav.howItWorks", "how-it-works"],
    ["landing.nav.evidence", "evidence"],
  ] as const;
</script>

{#snippet cta(plan: PlanId, label: string, strong = false)}
  {#if account}
    {#if account.plan === plan}
      <button class="plan-cta is-current" disabled
        ><Check size={17} /> {t("pricing.cta.current")}</button
      >
    {:else}
      <button
        class={`plan-cta ${strong ? "is-strong" : ""}`}
        onclick={() => choose(plan)}
      >
        {t("pricing.cta.choose")}
        <ArrowRight size={18} strokeWidth={1.6} />
      </button>
    {/if}
  {:else}
    <a
      class={`plan-cta ${strong ? "is-strong" : ""}`}
      href={resolve("/workspace")}
    >
      {label}
      <ArrowRight size={18} strokeWidth={1.6} />
    </a>
  {/if}
{/snippet}

{#snippet feature(text: string)}
  <li>
    <Check size={16} strokeWidth={2} aria-hidden="true" /><span>{text}</span>
  </li>
{/snippet}

{#snippet mark(value: boolean | string)}
  {#if value === true}<Check size={17} aria-hidden="true" /><span
      class="sr-only">{t("pricing.compare.yes")}</span
    >{:else if value === false}<Minus
      size={15}
      class="muted-mark"
      aria-hidden="true"
    /><span class="sr-only">{t("pricing.compare.no")}</span>{:else}{value}{/if}
{/snippet}

<!-- Links into landing sections carry a #fragment after resolve("/"), which the rule cannot see. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a class="skip-link" href="#main">{t("landing.skip")}</a>
<div class="pricing">
  <div class="pricing-hero">
    <svg
      class="hero-contours"
      viewBox="0 0 600 600"
      aria-hidden="true"
      focusable="false"
    >
      {#each [90, 150, 210, 270, 330, 390, 450, 510] as r (r)}<circle
          cx="600"
          cy="0"
          {r}
        />{/each}
    </svg>
    <header class="site-header wrap">
      <a class="wordmark" href={resolve("/")} aria-label={t("landing.home")}
        >jude.</a
      >
      <div class="header-end">
        <nav class="desktop-nav" aria-label={t("landing.mainNav")}>
          {#each nav as [label, hash] (label)}<a href={onHome(hash)}
              >{t(label)}</a
            >{/each}
          <a href={resolve("/pricing")} aria-current="page"
            >{t("landing.nav.pricing")}</a
          >
          <a href={resolve("/workspace")}>{t("common.signIn")}</a>
          <a class="button button-outline" href={onHome("demo")}
            >{t("landing.exploreDemo")}</a
          >
        </nav>
        <LanguageToggle />
        <button
          class="menu-toggle"
          aria-label={menuOpen ? t("landing.closeNav") : t("landing.openNav")}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onclick={() => (menuOpen = !menuOpen)}
        >
          {#if menuOpen}<X />{:else}<Menu />{/if}
        </button>
      </div>
      {#if menuOpen}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Escape bubbles from the navigation links and restores the menu trigger.) -->
        <nav
          id="mobile-navigation"
          class="mobile-nav"
          aria-label={t("landing.mobileNav")}
          onkeydown={(event) => {
            if (event.key === "Escape") {
              menuOpen = false;
              document
                .querySelector<HTMLButtonElement>(".menu-toggle")
                ?.focus();
            }
          }}
        >
          {#each nav as [label, hash] (label)}<a href={onHome(hash)}
              >{t(label)} <ArrowUpRight size={17} /></a
            >{/each}
          <a href={resolve("/pricing")} aria-current="page"
            >{t("landing.nav.pricing")} <ArrowUpRight size={17} /></a
          >
          <a href={resolve("/workspace")}
            >{t("common.signIn")} <ArrowUpRight size={17} /></a
          >
          <a href={onHome("demo")}
            >{t("landing.exploreDemo")} <ArrowRight size={17} /></a
          >
        </nav>
      {/if}
    </header>

    <div class="hero-grid wrap" id="main">
      <div class="hero-text">
        <h1>{t("pricing.hero.title")}</h1>
        <p class="hero-lead">{t("pricing.hero.lead")}</p>
        <p class="hero-anchor">
          {t("pricing.hero.anchor", { price: rp(perHour("kantor", billing)) })}
        </p>
      </div>
      <div class="hero-controls">
        <fieldset class="billing">
          <legend class="sr-only">{t("pricing.billing.label")}</legend>
          <label class:selected={billing === "monthly"}>
            <input
              type="radio"
              name="billing"
              value="monthly"
              bind:group={billing}
            />
            {t("pricing.billing.monthly")}
          </label>
          <label class:selected={billing === "yearly"}>
            <input
              type="radio"
              name="billing"
              value="yearly"
              bind:group={billing}
            />
            {t("pricing.billing.yearly")}
            <span class="badge">{t("pricing.billing.badge")}</span>
          </label>
        </fieldset>
        <ul class="risk">
          <li>
            <Check size={15} aria-hidden="true" />{t("pricing.risk.trial")}
          </li>
          <li>
            <Check size={15} aria-hidden="true" />{t("pricing.risk.cancel")}
          </li>
          <li>
            <Check size={15} aria-hidden="true" />{t("pricing.risk.export")}
          </li>
        </ul>
        {#if account}<p class="signed-in" role="status">
            {t("pricing.signedIn")}
            <strong>{planName(account.plan)}</strong>
          </p>{/if}
      </div>
    </div>
    <svg
      class="hero-curve"
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 0 H1440 V18 C 1080 96, 360 96, 0 18 Z" />
    </svg>
  </div>

  <main>
    <section class="plans-section wrap" aria-labelledby="plans-title">
      <h2 id="plans-title" class="sr-only">{t("pricing.plans.title")}</h2>
      <div class="plans">
        <article class="plan plan-trial" aria-labelledby="plan-trial">
          <h3 id="plan-trial">{t("pricing.trial.name")}</h3>
          <p class="plan-for">{t("pricing.trial.for")}</p>
          <p class="price">
            <span class="amount">{t("pricing.trial.price")}</span>
            <span class="unit">{t("pricing.trial.period")}</span>
          </p>
          <p class="price-note">{t("pricing.trial.noCard")}</p>
          <p class="per-hour">{sessions(TRIAL.hours)}</p>
          {@render cta("trial", t("pricing.cta.trial"))}
          <a class="plan-secondary" href={onHome("demo")}
            >{t("pricing.cta.demo")} <ArrowUpRight size={14} /></a
          >
          <ul class="features">
            {@render feature(t("pricing.trial.f1"))}
            {@render feature(t("pricing.trial.f2"))}
            {@render feature(t("pricing.trial.f3"))}
            {@render feature(t("pricing.trial.f4"))}
            {@render feature(t("pricing.trial.f5"))}
          </ul>
        </article>

        {#each ["lite", "advokat"] as const as plan (plan)}
          <article class="plan" aria-labelledby={`plan-${plan}`}>
            <h3 id={`plan-${plan}`}>{planName(plan)}</h3>
            <p class="plan-for">
              {plan === "lite" ? t("pricing.lite.for") : t("pricing.pro.for")}
            </p>
            <p class="price" data-plan={plan}>
              <span class="currency">Rp</span><span class="amount"
                >{shown(plan)}</span
              >
              <span class="unit">{t("pricing.perAccountMonth")}</span>
            </p>
            <p class="price-note">
              {#if billing === "yearly"}
                <s
                  aria-label={t("pricing.monthlyWas", {
                    price: rp(PLANS[plan].monthly),
                  })}>{rp(PLANS[plan].monthly)}</s
                >
                {t("pricing.billedYearly", { total: rp(yearlyTotal(plan)) })}
              {:else}
                {t("pricing.billedMonthly")}
              {/if}
            </p>
            <p class="per-hour">
              {t("pricing.perHour", { price: rp(perHour(plan, billing)) })}
            </p>
            {@render cta(plan, t("pricing.cta.trial"))}
            <ul class="features">
              {#if plan === "lite"}
                {@render feature(
                  `${hours(PLANS.lite.hours)} · ${sessions(PLANS.lite.hours)}`,
                )}
                {@render feature(t("pricing.lite.f2"))}
                {@render feature(t("pricing.lite.f3"))}
                {@render feature(t("pricing.lite.f4"))}
                {@render feature(t("pricing.lite.f5"))}
                {@render feature(t("pricing.lite.f6"))}
                {@render feature(t("pricing.lite.f7"))}
              {:else}
                <li class="includes">{t("pricing.pro.includes")}</li>
                {@render feature(
                  `${hours(PLANS.advokat.hours)} · ${sessions(PLANS.advokat.hours)}`,
                )}
                {@render feature(t("pricing.pro.f2"))}
                {@render feature(t("pricing.pro.f3"))}
                {@render feature(
                  t("pricing.pro.f4", { price: rp(EXTRA_HOUR) }),
                )}
              {/if}
            </ul>
          </article>
        {/each}

        <article class="plan plan-kantor" aria-labelledby="plan-kantor">
          <svg
            class="card-contours"
            viewBox="0 0 400 400"
            aria-hidden="true"
            focusable="false"
          >
            {#each [70, 120, 170, 220, 270, 320] as r (r)}<circle
                cx="400"
                cy="400"
                {r}
              />{/each}
          </svg>
          <span class="recommended">{t("pricing.kantor.badge")}</span>
          <h3 id="plan-kantor">{planName("kantor")}</h3>
          <p class="plan-for">{t("pricing.kantor.for")}</p>
          <p class="price" data-plan="kantor">
            <span class="currency">Rp</span><span class="amount"
              >{shown("kantor")}</span
            >
            <span class="unit">{t("pricing.perAccountMonth")}</span>
          </p>
          <p class="price-note">
            {#if billing === "yearly"}
              <s
                aria-label={t("pricing.monthlyWas", {
                  price: rp(PLANS.kantor.monthly),
                })}>{rp(PLANS.kantor.monthly)}</s
              >
              {t("pricing.billedYearly", { total: rp(yearlyTotal("kantor")) })}
            {:else}
              {t("pricing.billedMonthly")}
            {/if}
          </p>
          <p class="per-hour">
            {t("pricing.perHour", { price: rp(perHour("kantor", billing)) })}
          </p>
          {@render cta("kantor", t("pricing.kantor.cta"), true)}
          <ul class="features">
            <li class="includes">{t("pricing.kantor.includes")}</li>
            {@render feature(
              `${t("pricing.kantor.f1", { hours: PLANS.kantor.hours })} · ${sessions(PLANS.kantor.hours)}`,
            )}
            {@render feature(t("pricing.kantor.f2"))}
            {@render feature(t("pricing.kantor.f3"))}
            {@render feature(t("pricing.kantor.f4"))}
            {@render feature(t("pricing.kantor.f5"))}
          </ul>
        </article>
      </div>
      <p class="tax-note">{t("pricing.tax")}</p>
    </section>

    <section class="band wrap" aria-labelledby="lembaga-title">
      <div class="lembaga">
        <h2 id="lembaga-title">{t("pricing.lembaga.title")}</h2>
        <p class="band-name">{t("pricing.lembaga.name")}</p>
        <div class="lembaga-offers">
          <div>
            <h3>{t("pricing.lembaga.programme")}</h3>
            <p class="offer-price">
              {t("pricing.lembaga.from", { price: rp(LEMBAGA.from) })}
            </p>
            <p>
              {t("pricing.lembaga.programmeText", { hours: LEMBAGA.hours })}
            </p>
            <p class="per-hour">
              {hours(LEMBAGA.hours)} · {sessions(LEMBAGA.hours)}
            </p>
          </div>
          <div>
            <h3>{t("pricing.lembaga.licence")}</h3>
            <p class="offer-price">
              {t("pricing.lembaga.licencePrice", {
                price: rp(LEMBAGA.licenceFromYearly),
              })}
            </p>
            <p>{t("pricing.lembaga.licenceText")}</p>
          </div>
        </div>
        <div class="band-actions">
          <a class="plan-cta is-strong" href={resolve("/workspace")}
            >{t("pricing.cta.book")}
            <ArrowRight size={18} strokeWidth={1.6} /></a
          >
          {#if account}
            {#if account.plan === "lembaga"}
              <span class="current-note"
                ><Check size={15} /> {t("pricing.cta.current")}</span
              >
            {:else}
              <button class="text-link" onclick={() => choose("lembaga")}
                >{t("pricing.lembaga.choose")}</button
              >
            {/if}
          {/if}
        </div>
      </div>
      <div class="packs">
        <h2>{t("pricing.packs.title")}</h2>
        <p>{t("pricing.packs.lead")}</p>
        <ul>
          {#each PACKS as pack (pack.id)}
            <li>
              <span>
                <strong>{t("pricing.packs.pack", { hours: pack.hours })}</strong
                >
                <small
                  >{sessions(pack.hours)} · {t("pricing.packs.rate", {
                    price: rp(pack.price / pack.hours),
                  })}</small
                >
              </span>
              <span class="pack-price">{rp(pack.price)}</span>
            </li>
          {/each}
          <li>
            <span>
              <strong>{t("pricing.packs.extra")}</strong>
              <small>{t("pricing.packs.extraNote")}</small>
            </span>
            <span class="pack-price">{rp(EXTRA_HOUR)}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="trust wrap" aria-labelledby="trust-title">
      <h2 id="trust-title" class="sr-only">{t("pricing.trust.title")}</h2>
      <div>
        <FileText size={22} strokeWidth={1.4} aria-hidden="true" />
        <h3>{t("pricing.trust.t1")}</h3>
        <p>{t("pricing.trust.t1Text")}</p>
      </div>
      <div>
        <Scale size={22} strokeWidth={1.4} aria-hidden="true" />
        <h3>{t("pricing.trust.t2")}</h3>
        <p>{t("pricing.trust.t2Text")}</p>
      </div>
      <div>
        <ShieldCheck size={22} strokeWidth={1.4} aria-hidden="true" />
        <h3>{t("pricing.trust.t3")}</h3>
        <p>{t("pricing.trust.t3Text")}</p>
      </div>
    </section>

    <section class="calculator" id="calculator" aria-labelledby="calc-title">
      <div class="wrap calc-grid">
        <div class="calc-inputs">
          <h2 id="calc-title">{t("pricing.calc.title")}</h2>
          <p class="section-lead">{t("pricing.calc.lead")}</p>
          <div class="control">
            <div class="control-head">
              <label for="calc-hours">{t("pricing.calc.hours")}</label>
              <output for="calc-hours"
                >{hours(calcHours)} · {sessions(calcHours)}</output
              >
            </div>
            <input
              id="calc-hours"
              type="range"
              min={CALCULATOR_LIMITS.hours.min}
              max={CALCULATOR_LIMITS.hours.max}
              step="1"
              bind:value={calcHours}
              style={`--fill:${((calcHours - 1) / 39) * 100}%`}
            />
          </div>
          <div class="control">
            <div class="control-head">
              <label for="calc-accounts">{t("pricing.calc.accounts")}</label>
            </div>
            <div class="stepper">
              <button
                aria-label={t("pricing.calc.fewer")}
                disabled={calcAccounts <= CALCULATOR_LIMITS.accounts.min}
                onclick={() => setAccounts(calcAccounts - 1)}
                ><Minus size={16} /></button
              >
              <input
                id="calc-accounts"
                type="number"
                inputmode="numeric"
                min={CALCULATOR_LIMITS.accounts.min}
                max={CALCULATOR_LIMITS.accounts.max}
                value={calcAccounts}
                onchange={(e) => setAccounts(Number(e.currentTarget.value))}
              />
              <button
                aria-label={t("pricing.calc.more")}
                disabled={calcAccounts >= CALCULATOR_LIMITS.accounts.max}
                onclick={() => setAccounts(calcAccounts + 1)}
                ><Plus size={16} /></button
              >
            </div>
          </div>
          <fieldset class="needs">
            <legend>{t("pricing.calc.needs")}</legend>
            <label class:disabled={calcAccounts < 2}>
              <input
                type="checkbox"
                bind:checked={needShared}
                disabled={calcAccounts < 2}
              />
              {t("pricing.calc.shared")}
            </label>
            <label>
              <input type="checkbox" bind:checked={needVoice} />
              {t("pricing.calc.voice")}
            </label>
          </fieldset>
        </div>
        <div class="calc-result paper" aria-live="polite">
          <p class="result-label">{t("pricing.calc.suggested")}</p>
          <p class="result-plan" data-testid="calc-plan">
            {planName(result.best.plan)}
          </p>
          <p class="result-total">
            <span class="result-total-label">{t("pricing.calc.total")}</span>
            <span class="result-amount">{rp(result.best.total)}</span>
          </p>
          <p class="per-hour">
            {t("pricing.perHour", { price: rp(result.best.perHour) })}
          </p>
          <dl class="breakdown">
            <div>
              <dt>
                {t("pricing.calc.subscription")} · {planName(result.best.plan)} ×
                {result.best.billedAccounts}
                <small
                  >{t("pricing.calc.included", {
                    hours: hours(result.best.includedHours),
                  })}</small
                >
              </dt>
              <dd>{rp(result.best.subscription)}</dd>
            </div>
            <div>
              <dt>
                {t("pricing.calc.hoursLine")}
                <small
                  >{purchases.length
                    ? `${purchases.join(", ")} ${t("pricing.calc.perYear")}`
                    : t("pricing.calc.noExtra")}</small
                >
              </dt>
              <dd>{rp(result.best.hoursPerMonth)}</dd>
            </div>
          </dl>
          <ul class="result-notes">
            {#if result.best.plan === "kantor" && result.best.billedAccounts > result.best.accounts}<li
              >
                {t("pricing.calc.minSeats")}
              </li>{/if}
            {#if result.cheapestWithoutNeeds}<li>
                {t("pricing.calc.cheaper", {
                  plan: planName(result.cheapestWithoutNeeds.plan),
                  price: rp(result.cheapestWithoutNeeds.total),
                })}
              </li>{/if}
            {#each result.others as other (other.plan)}<li>
                {t("pricing.calc.compare", {
                  plan: planName(other.plan),
                  price: rp(other.total),
                })}
              </li>{/each}
            {#if result.trialFits}<li>{t("pricing.calc.trialFits")}</li>{/if}
            {#if result.volume}<li>{t("pricing.calc.volume")}</li>{/if}
          </ul>
          {@render cta(result.best.plan, t("pricing.cta.trial"), true)}
          <p class="calc-note">{t("pricing.calc.note")}</p>
        </div>
      </div>
    </section>

    <section class="assurances wrap" aria-label={t("pricing.protect.title")}>
      <div>
        <h2>{t("pricing.protect.title")}</h2>
        <ul class="ruled">
          <li>
            <Check size={17} aria-hidden="true" />{t("pricing.protect.p1")}
          </li>
          <li>
            <Check size={17} aria-hidden="true" />{t("pricing.protect.p2")}
          </li>
          <li>
            <Check size={17} aria-hidden="true" />{t("pricing.protect.p3")}
          </li>
          <li>
            <Check size={17} aria-hidden="true" />{t("pricing.protect.p4")}
          </li>
        </ul>
      </div>
      <div>
        <h2>{t("pricing.pay.title")}</h2>
        <ul class="ruled">
          <li>{t("pricing.pay.qris")}</li>
          <li>{t("pricing.pay.va")}</li>
          <li>{t("pricing.pay.ewallet")}</li>
          <li>{t("pricing.pay.card")}</li>
          <li>{t("pricing.pay.invoice")}</li>
        </ul>
        <p class="pay-note">{t("pricing.pay.yearly")}</p>
      </div>
    </section>

    <section class="compare wrap" aria-labelledby="compare-title">
      <div class="compare-head">
        <h2 id="compare-title">{t("pricing.compare.title")}</h2>
        <button
          class="compare-toggle"
          aria-expanded={compareOpen}
          aria-controls="compare-table"
          onclick={() => (compareOpen = !compareOpen)}
        >
          {compareOpen ? t("pricing.compare.hide") : t("pricing.compare.show")}
          <ChevronDown size={18} />
        </button>
      </div>
      <div
        class="table-scroll"
        id="compare-table"
        class:collapsed={!compareOpen}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">{t("pricing.compare.feature")}</th>
              <th scope="col">{planName("trial")}</th>
              <th scope="col">{planName("lite")}</th>
              <th scope="col">{planName("advokat")}</th>
              <th scope="col" class="col-kantor">{planName("kantor")}</th>
            </tr>
          </thead>
          <tbody>
            {#each [["pricing.compare.price", t("pricing.compare.trialPrice"), rp(PLANS.lite.yearly), rp(PLANS.advokat.yearly), rp(PLANS.kantor.yearly)], ["pricing.compare.hours", t("pricing.compare.trialHours"), t( "pricing.compare.perMonth", { count: PLANS.lite.hours } ), t( "pricing.compare.perMonth", { count: PLANS.advokat.hours } ), t( "pricing.compare.pooled", { count: PLANS.kantor.hours } )], ["pricing.compare.questions", t("pricing.compare.trialQuestions"), t( "pricing.compare.perMonth", { count: PLANS.lite.questions } ), t( "pricing.compare.perMonth", { count: PLANS.advokat.questions } ), t( "pricing.compare.pooled", { count: PLANS.kantor.questions } )], ["pricing.compare.cases", t("pricing.compare.oneCase"), t("pricing.compare.unlimited"), t("pricing.compare.unlimited"), t("pricing.compare.unlimited")], ["pricing.compare.transcription", true, true, true, true], ["pricing.compare.findings", true, true, true, true], ["pricing.compare.map", true, true, true, true], ["pricing.compare.practice", true, true, true, true], ["pricing.compare.legal", true, true, true, true], ["pricing.compare.export", true, true, true, true], ["pricing.compare.voice", false, false, true, true], ["pricing.compare.team", false, false, false, true], ["pricing.compare.support", false, false, false, true], ["pricing.compare.invoice", false, false, false, true], ["pricing.compare.extraHours", false, t( "pricing.compare.optional", { price: rp(EXTRA_HOUR) } ), t( "pricing.compare.optional", { price: rp(EXTRA_HOUR) } ), t( "pricing.compare.optional", { price: rp(EXTRA_HOUR) } )]] as const as row (row[0])}
              <tr>
                <th scope="row">{t(row[0] as MessageKey)}</th>
                <td>{@render mark(row[1])}</td>
                <td>{@render mark(row[2])}</td>
                <td>{@render mark(row[3])}</td>
                <td class="col-kantor">{@render mark(row[4])}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <section class="faq wrap" aria-labelledby="faq-title">
      <h2 id="faq-title">{t("pricing.faq.title")}</h2>
      <div class="faq-items">
        {#each faqs as n (n)}
          {@const open = openFaq.includes(n)}
          <div class="faq-item">
            <h3>
              <button
                id={`faq-q${n}`}
                aria-expanded={open}
                aria-controls={`faq-a${n}`}
                onclick={() =>
                  (openFaq = open
                    ? openFaq.filter((x) => x !== n)
                    : [...openFaq, n])}
              >
                {t(`pricing.faq.q${n}` as MessageKey)}
                <ChevronDown size={20} />
              </button>
            </h3>
            <div
              id={`faq-a${n}`}
              role="region"
              aria-labelledby={`faq-q${n}`}
              hidden={!open}
            >
              <p>
                {t(`pricing.faq.a${n}` as MessageKey, {
                  price: rp(LEMBAGA.from),
                })}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <section class="pricing-closing">
      <svg
        class="closing-curve"
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M0 90 V72 C 360 -6, 1080 -6, 1440 72 V90 Z" />
      </svg>
      <svg
        class="closing-contours"
        viewBox="0 0 600 600"
        aria-hidden="true"
        focusable="false"
      >
        {#each [90, 150, 210, 270, 330, 390, 450] as r (r)}<circle
            cx="0"
            cy="600"
            {r}
          />{/each}
      </svg>
      <div class="wrap closing-grid">
        <h2>
          {t("pricing.closing.title1")}
          <br />
          {t("pricing.closing.title2")}
        </h2>
        <div>
          <p>{t("pricing.closing.lead")}</p>
          <div class="closing-actions">
            <a class="button button-cream" href={resolve("/workspace")}>
              {t("pricing.cta.trial")}
              <ArrowRight size={21} />
            </a>
            <a class="button button-outline" href={resolve("/workspace")}
              >{t("pricing.cta.book")}</a
            >
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer wrap">
    <a class="wordmark" href={resolve("/")} aria-label={t("landing.home")}
      >jude.</a
    >
    <p>{t("landing.footer.tagline")}</p>
    <a class="footer-pricing" href={resolve("/")}>{t("pricing.footer.home")}</a>
    <span>{t("landing.footer.concept")}</span>
    <a href="#main">
      {t("landing.footer.top")}
      <ArrowUpRight size={14} />
    </a>
  </footer>
</div>

<Modal
  open={choosing !== null}
  title={choosing ? t("pricing.modal.title", { plan: planName(choosing) }) : ""}
  onClose={() => (choosing = null)}
>
  {#if choosing}
    <div class="modal-content">
      <p class="demo-notice" role="note">{t("pricing.modal.demo")}</p>
      {#if done}
        <p class="modal-done" role="status">
          <Check size={18} />
          {t("pricing.modal.done", { plan: planName(choosing) })}
        </p>
        <a class="plan-cta is-strong" href={resolve("/workspace")}
          >{t("pricing.modal.back")} <ArrowRight size={18} /></a
        >
      {:else}
        <dl class="modal-summary">
          <div>
            <dt>{t("pricing.modal.plan")}</dt>
            <dd>{planName(choosing)}</dd>
          </div>
          {#if choosing === "lite" || choosing === "advokat" || choosing === "kantor"}
            <div>
              <dt id="modal-billing">{t("pricing.modal.billing")}</dt>
              <dd>
                <span
                  class="modal-billing"
                  role="radiogroup"
                  aria-labelledby="modal-billing"
                >
                  <label
                    ><input
                      type="radio"
                      value="monthly"
                      bind:group={modalBilling}
                    />
                    {t("pricing.billing.monthly")}</label
                  >
                  <label
                    ><input
                      type="radio"
                      value="yearly"
                      bind:group={modalBilling}
                    />
                    {t("pricing.billing.yearly")}</label
                  >
                </span>
              </dd>
            </div>
          {/if}
          {#if choosing !== "trial"}
            <div>
              <dt>
                <label for="modal-accounts">{t("pricing.modal.accounts")}</label
                >
              </dt>
              <dd>
                <input
                  id="modal-accounts"
                  class="modal-number"
                  type="number"
                  min={minAccounts(choosing)}
                  max="200"
                  bind:value={modalAccounts}
                />
              </dd>
            </div>
          {/if}
          <div>
            <dt>{t("pricing.modal.perMonth")}</dt>
            <dd class="modal-total">{rp(modalTotal)}</dd>
          </div>
          {#if modalBilling === "yearly" && (choosing === "lite" || choosing === "advokat" || choosing === "kantor")}
            <div>
              <dt>{t("pricing.modal.upfront")}</dt>
              <dd>{rp(modalTotal * 12)}</dd>
            </div>
          {/if}
        </dl>
        {#if choosing === "trial"}<p class="modal-hint">
            {t("pricing.modal.trialEnds")}
          </p>{/if}
        {#if choosing === "kantor"}<p class="modal-hint">
            {t("pricing.calc.minSeats")}
          </p>{/if}
        {#if failed}<p class="modal-error" role="alert">{failed}</p>{/if}
        <div class="modal-actions">
          <button class="modal-cancel" onclick={() => (choosing = null)}
            >{t("common.cancel")}</button
          >
          <button
            class="plan-cta is-strong"
            disabled={busy ||
              (choosing === "kantor" &&
                modalAccounts < PLANS.kantor.minAccounts)}
            onclick={activate}
          >
            {busy ? t("pricing.modal.activating") : t("pricing.modal.activate")}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</Modal>

<style>
  /* The confirm dialog renders outside .pricing, so it shares the tokens. */
  .pricing,
  .modal-content {
    --ink: #173a2c;
    --green: #183b2d;
    --paper-bg: #f3f2eb;
    --surface: #fcfbf7;
    --rule: #dcdcd0;
    --soft: #5f6a5c;
    --amber: #b17831;
  }
  .pricing {
    background: var(--paper-bg);
    color: #1b2e23;
    overflow-x: clip;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  /* Hero: the sign-in panel's forest green, contour lines and a curved seam. */
  .pricing-hero {
    position: relative;
    isolation: isolate;
    color: #f3f1e6;
    background:
      radial-gradient(110% 90% at 0% 0%, #22503d 0%, transparent 62%),
      var(--green);
    padding-bottom: 54px;
  }
  .hero-contours {
    position: absolute;
    right: 0;
    top: 0;
    width: min(60vw, 640px);
    height: auto;
    z-index: -1;
    pointer-events: none;
  }
  .hero-contours circle,
  .card-contours circle,
  .closing-contours circle {
    fill: none;
    stroke: rgba(243, 241, 230, 0.075);
    stroke-width: 1;
  }
  .hero-curve {
    position: absolute;
    left: 0;
    top: 100%;
    width: 100%;
    height: 72px;
    z-index: 0;
  }
  .hero-curve path {
    fill: var(--green);
  }
  .pricing-hero :global(.desktop-nav a[aria-current="page"]) {
    text-decoration: underline;
    text-underline-offset: 6px;
  }
  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
    gap: 6%;
    align-items: end;
    padding-top: 34px;
  }
  .hero-text h1 {
    font-family: "Rufina", Georgia, serif;
    font-size: clamp(46px, 5vw, 78px);
    line-height: 1.02;
    letter-spacing: -0.025em;
    max-width: 15ch;
    text-wrap: balance;
  }
  .hero-lead {
    margin-top: 24px;
    max-width: 56ch;
    font-size: clamp(16px, 1.3vw, 19px);
    line-height: 1.6;
    color: #d3ddcf;
  }
  .hero-anchor {
    margin-top: 18px;
    font-family: var(--serif);
    font-size: 22px;
    color: #f4ebda;
  }
  .hero-controls {
    display: grid;
    gap: 20px;
    justify-items: start;
    padding-bottom: 6px;
  }
  .billing {
    display: inline-flex;
    gap: 4px;
    margin: 0;
    padding: 5px;
    border: 1px solid rgba(232, 231, 218, 0.4);
    border-radius: 999px;
    background: rgba(9, 30, 22, 0.35);
  }
  .billing label {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 8px 20px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    color: #e8e7da;
    transition:
      background-color 0.25s,
      color 0.25s;
  }
  .billing label.selected {
    background: #f4ebda;
    color: #15271d;
  }
  .billing input {
    position: absolute;
    opacity: 0;
    inset: 0;
    margin: 0;
    cursor: pointer;
  }
  .billing label:has(input:focus-visible) {
    outline: 2px solid #e9bf7c;
    outline-offset: 3px;
  }
  .badge {
    padding: 3px 10px;
    border-radius: 999px;
    background: #e9bf7c;
    color: #422d10;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
  .risk {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
    font-size: 14px;
    color: #d8e1cc;
  }
  .risk li {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .risk :global(svg) {
    color: #e9bf7c;
  }
  .signed-in {
    font-size: 13px;
    color: #c5d2c2;
    max-width: 40ch;
  }
  .signed-in strong {
    color: #f4ebda;
    font-weight: 600;
  }

  /* Plans */
  .plans-section {
    position: relative;
    padding-top: 112px;
  }
  .plans {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.12fr);
    gap: 16px;
    align-items: stretch;
  }
  .plan {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 28px 24px 26px;
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 9px;
    box-shadow: 0 6px 18px rgba(28, 46, 34, 0.05);
  }
  .plan h3 {
    font-family: "Rufina", Georgia, serif;
    font-size: 30px;
    line-height: 1.15;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .plan-for {
    margin-top: 8px;
    min-height: 3.3em;
    font-size: 14px;
    line-height: 1.55;
    color: var(--soft);
  }
  .price {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 4px;
    margin-top: 18px;
    color: var(--ink);
  }
  .currency {
    font-family: var(--serif);
    font-size: 22px;
  }
  .amount {
    font-family: var(--serif);
    font-size: clamp(38px, 3.1vw, 48px);
    line-height: 1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .unit {
    flex-basis: 100%;
    margin-top: 6px;
    font-size: 13px;
    color: var(--soft);
  }
  .price-note {
    margin-top: 8px;
    min-height: 2.9em;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--soft);
  }
  .price-note s {
    margin-right: 4px;
    color: #8a8a7c;
  }
  .per-hour {
    margin-top: 4px;
    font-size: 13px;
    font-weight: 600;
    color: #315841;
    font-variant-numeric: tabular-nums;
  }
  .plan-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    min-height: 50px;
    margin-top: 20px;
    padding: 10px 18px;
    border: 1px solid #b9bfae;
    border-radius: 7px;
    background: transparent;
    color: var(--ink);
    font-family: var(--serif);
    font-size: 19px;
    line-height: 1.2;
    text-align: center;
    transition:
      background-color 0.2s,
      color 0.2s,
      border-color 0.2s;
  }
  .plan-cta:hover {
    background: #e7eadf;
  }
  .plan-cta :global(svg) {
    transition: transform 0.2s;
  }
  .plan-cta:hover :global(svg) {
    transform: translateX(4px);
  }
  .plan-cta.is-strong {
    background: var(--green);
    border-color: var(--green);
    color: #f6f0e4;
  }
  .plan-cta.is-strong:hover {
    background: #234f3c;
  }
  .plan-cta.is-current,
  .plan-cta.is-current:hover {
    background: transparent;
    border-style: dashed;
    color: #315841;
    opacity: 1;
    cursor: default;
  }
  .plan-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: center;
    margin-top: 10px;
    padding: 4px 0;
    font-size: 13px;
    color: #34533c;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .plan-secondary:hover {
    color: #8b652a;
  }
  .features {
    list-style: none;
    margin: 22px 0 0;
    padding: 20px 0 0;
    border-top: 1px solid var(--rule);
    display: grid;
    gap: 11px;
    font-size: 14px;
    line-height: 1.5;
  }
  .features li {
    display: grid;
    grid-template-columns: 16px 1fr;
    gap: 10px;
    align-items: start;
  }
  .features :global(svg) {
    margin-top: 3px;
    color: #4b7958;
  }
  .features .includes {
    display: block;
    font-weight: 600;
    color: var(--ink);
  }

  .plan-kantor {
    overflow: hidden;
    isolation: isolate;
    margin-block: -18px;
    padding-top: 60px;
    padding-bottom: 44px;
    background:
      radial-gradient(120% 70% at 100% 100%, #22503d 0%, transparent 65%),
      var(--green);
    border-color: var(--green);
    color: #eef0e6;
    box-shadow: 0 22px 44px rgba(17, 43, 32, 0.26);
  }
  .card-contours {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 90%;
    height: auto;
    z-index: -1;
    pointer-events: none;
  }
  .plan-kantor h3,
  .plan-kantor .price,
  .plan-kantor .features .includes {
    color: #f6f0e4;
  }
  .plan-kantor .plan-for,
  .plan-kantor .unit,
  .plan-kantor .price-note {
    color: #c5d2c2;
  }
  .plan-kantor .price-note s {
    color: #9fb09d;
  }
  .plan-kantor .per-hour {
    color: #e9bf7c;
  }
  .plan-kantor .features {
    border-top-color: rgba(232, 231, 218, 0.22);
  }
  .plan-kantor .features :global(svg) {
    color: #e9bf7c;
  }
  .plan-kantor .plan-cta.is-strong {
    background: #f4ebda;
    border-color: #f4ebda;
    color: #15271d;
  }
  .plan-kantor .plan-cta.is-strong:hover {
    background: #e8d6b5;
  }
  .plan-kantor .plan-cta.is-current {
    color: #f4ebda;
    border-color: #a7b4a3;
  }
  .recommended {
    position: absolute;
    top: 16px;
    left: 24px;
    padding: 4px 12px;
    border-radius: 999px;
    background: #e9bf7c;
    color: #422d10;
    font-size: 12px;
    font-weight: 600;
  }
  .tax-note {
    margin-top: 40px;
    text-align: center;
    font-size: 13px;
    color: var(--soft);
  }

  /* Lembaga band with hour packs */
  .band {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    margin-top: 56px;
    border: 1px solid var(--rule);
    border-radius: 9px;
    overflow: hidden;
    background: var(--surface);
  }
  .lembaga {
    padding: 36px 40px;
    background: #ecebe1;
  }
  .lembaga h2,
  .packs h2,
  .calc-inputs h2,
  .assurances h2,
  .compare h2,
  .faq h2 {
    font-family: var(--serif);
    font-size: clamp(32px, 3vw, 44px);
    line-height: 1.08;
    letter-spacing: -0.015em;
    color: var(--ink);
    text-wrap: balance;
  }
  .band-name {
    margin-top: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #315841;
  }
  .lembaga-offers {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin-top: 26px;
  }
  .lembaga-offers > div {
    padding-top: 18px;
    border-top: 1px solid #cfd0c3;
  }
  .lembaga-offers h3 {
    font-family: "Rufina", Georgia, serif;
    font-size: 24px;
    color: var(--ink);
  }
  .offer-price {
    margin: 8px 0 10px;
    font-family: var(--serif);
    font-size: 21px;
    color: #1f3c2d;
  }
  .lembaga-offers p:not(.offer-price):not(.per-hour) {
    font-size: 14px;
    line-height: 1.6;
    color: var(--soft);
  }
  .band-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px 24px;
    margin-top: 28px;
  }
  .band-actions .plan-cta {
    width: auto;
    margin: 0;
    padding-inline: 26px;
  }
  .text-link {
    border: 0;
    background: none;
    padding: 8px 0;
    font-size: 14px;
    color: #34533c;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .text-link:hover {
    color: #8b652a;
  }
  .current-note {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    font-size: 14px;
    color: #315841;
  }
  .packs {
    padding: 36px 40px;
  }
  .packs > p {
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--soft);
  }
  .packs ul {
    list-style: none;
    margin: 22px 0 0;
    padding: 0;
  }
  .packs li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-top: 1px solid var(--rule);
  }
  .packs li strong {
    display: block;
    font-weight: 600;
    font-size: 15px;
  }
  .packs li small {
    font-size: 12.5px;
    color: var(--soft);
  }
  .pack-price {
    font-family: var(--serif);
    font-size: 22px;
    color: var(--ink);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  /* Trust strip */
  .trust {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    margin-top: 72px;
    border-block: 1px solid var(--rule);
  }
  .trust > div {
    display: grid;
    grid-template-columns: 26px 1fr;
    column-gap: 16px;
    padding: 30px 28px;
  }
  .trust > div + div {
    border-left: 1px solid var(--rule);
  }
  .trust :global(svg) {
    color: #4b7958;
    grid-row: span 2;
    margin-top: 4px;
  }
  .trust h3 {
    font-family: var(--serif);
    font-size: 23px;
    line-height: 1.2;
    color: var(--ink);
  }
  .trust p {
    margin-top: 6px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--soft);
  }

  /* Calculator */
  .calculator {
    margin-top: 84px;
    padding-block: 84px;
    background: #eaebe0;
  }
  .calc-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 7%;
    align-items: start;
  }
  .section-lead {
    margin-top: 16px;
    max-width: 52ch;
    font-size: 16px;
    line-height: 1.65;
    color: var(--soft);
  }
  .control {
    margin-top: 34px;
  }
  .control-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
  }
  .control-head output {
    font-family: var(--serif);
    font-size: 22px;
    font-weight: 400;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  input[type="range"] {
    width: 100%;
    height: 28px;
    margin: 0;
    background: transparent;
    appearance: none;
    cursor: pointer;
  }
  input[type="range"]::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--green) var(--fill),
      #c9cdbf var(--fill)
    );
  }
  input[type="range"]::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background: #c9cdbf;
  }
  input[type="range"]::-moz-range-progress {
    height: 6px;
    border-radius: 999px;
    background: var(--green);
  }
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    margin-top: -9px;
    border-radius: 50%;
    border: 2px solid var(--green);
    background: #f4ebda;
    box-shadow: 0 2px 6px rgba(20, 40, 30, 0.25);
  }
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--green);
    background: #f4ebda;
  }
  input[type="range"]:focus-visible {
    outline: 2px solid var(--amber);
    outline-offset: 4px;
  }
  .stepper {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid #bfc4b4;
    border-radius: 7px;
    background: var(--surface);
    overflow: hidden;
  }
  .stepper button {
    display: grid;
    place-items: center;
    width: 48px;
    min-height: 48px;
    border: 0;
    background: none;
    color: var(--ink);
  }
  .stepper button:hover:not(:disabled) {
    background: #e7eadf;
  }
  .stepper input {
    width: 72px;
    border: 0;
    border-inline: 1px solid #d6d9cc;
    background: transparent;
    text-align: center;
    font: 400 22px var(--serif);
    color: var(--ink);
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .stepper input::-webkit-inner-spin-button,
  .stepper input::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }
  .stepper input:focus-visible,
  .modal-number:focus-visible {
    outline: 2px solid var(--amber);
    outline-offset: -2px;
  }
  .needs {
    margin: 30px 0 0;
    padding: 0;
    border: 0;
    display: grid;
    gap: 6px;
  }
  .needs legend {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
  }
  .needs label {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 40px;
    font-size: 15px;
    cursor: pointer;
  }
  .needs label.disabled {
    color: #8b9086;
    cursor: not-allowed;
  }
  .needs input {
    width: 18px;
    height: 18px;
    accent-color: var(--green);
  }
  .calc-result {
    padding: 34px 34px 28px;
    border-radius: 9px;
    box-shadow: 0 10px 30px rgba(28, 46, 34, 0.1);
  }
  .result-label {
    font-size: 13px;
    font-weight: 600;
    color: #5e6b5c;
  }
  .result-plan {
    margin-top: 6px;
    font-family: "Rufina", Georgia, serif;
    font-size: 40px;
    line-height: 1.1;
    color: var(--ink);
  }
  .result-total {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid #d8cfbe;
  }
  .result-total-label {
    font-size: 14px;
    color: #5e6659;
  }
  .result-amount {
    font-family: var(--serif);
    font-size: clamp(34px, 3vw, 44px);
    line-height: 1;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .calc-result > .per-hour {
    text-align: right;
    margin-top: 8px;
  }
  .breakdown {
    margin: 20px 0 0;
    display: grid;
  }
  .breakdown > div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 0;
    border-top: 1px solid #e2dccd;
    font-size: 14px;
  }
  .breakdown dt small {
    display: block;
    margin-top: 2px;
    font-size: 12.5px;
    color: #6b6a5f;
  }
  .breakdown dd {
    margin: 0;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .result-notes {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: grid;
    gap: 4px;
    font-size: 13px;
    color: #5e6659;
  }
  .result-notes:empty {
    display: none;
  }
  .calc-note {
    margin-top: 14px;
    font-size: 12px;
    color: #6b6a5f;
  }

  /* Assurances and payment */
  .assurances {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7%;
    padding-block: 84px 20px;
  }
  .ruled {
    list-style: none;
    margin: 24px 0 0;
    padding: 0;
  }
  .ruled li {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 15px 0;
    border-top: 1px solid var(--rule);
    font-size: 15px;
    line-height: 1.55;
  }
  .ruled li:last-child {
    border-bottom: 1px solid var(--rule);
  }
  .ruled :global(svg) {
    margin-top: 3px;
    color: #4b7958;
  }
  .pay-note {
    margin-top: 14px;
    font-size: 13px;
    color: var(--soft);
  }

  /* Comparison table */
  .compare {
    padding-top: 84px;
  }
  .compare-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }
  .compare-toggle {
    display: none;
  }
  .table-scroll {
    position: relative;
    margin-top: 28px;
    overflow-x: auto;
    border: 1px solid var(--rule);
    border-radius: 9px;
    background: var(--surface);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    padding: 14px 18px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid #e6e6dc;
  }
  tbody tr:last-child th,
  tbody tr:last-child td {
    border-bottom: 0;
  }
  thead th {
    font-family: var(--serif);
    font-size: 19px;
    font-weight: 400;
    color: var(--ink);
    background: #f3f2ea;
  }
  tbody th {
    font-weight: 500;
    color: #2b3d31;
  }
  td :global(svg) {
    color: #4b7958;
  }
  td :global(.muted-mark) {
    color: #a3a89b;
  }
  .col-kantor {
    background: #e8eee5;
  }
  thead .col-kantor {
    background: var(--green);
    color: #f6f0e4;
  }

  /* FAQ */
  .faq {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 8%;
    padding-block: 96px;
  }
  .faq-item {
    border-bottom: 1px solid var(--rule);
  }
  .faq-item:first-child {
    border-top: 1px solid var(--rule);
  }
  .faq-item h3 {
    font-family: var(--sans);
    font-size: 16px;
    font-weight: 500;
  }
  .faq-item button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    width: 100%;
    min-height: 44px;
    padding: 20px 0;
    border: 0;
    background: none;
    text-align: left;
    color: inherit;
  }
  .faq-item button:hover {
    color: #7a653a;
  }
  .faq-item button :global(svg) {
    color: #697763;
    transition: transform 0.25s;
  }
  .faq-item button[aria-expanded="true"] :global(svg) {
    transform: rotate(180deg);
  }
  .faq-item p {
    padding: 0 28px 22px 0;
    max-width: 68ch;
    font-size: 15px;
    line-height: 1.75;
    color: var(--soft);
  }

  /* Closing */
  .pricing-closing {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    margin-top: 40px;
    padding: 132px 0 84px;
    color: #f4eedf;
  }
  .closing-curve {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 72px;
    z-index: -1;
  }
  .closing-curve path {
    fill: var(--green);
  }
  .pricing-closing::before {
    content: "";
    position: absolute;
    inset: 71px 0 0;
    z-index: -2;
    background:
      radial-gradient(90% 120% at 100% 100%, #22503d 0%, transparent 60%),
      var(--green);
  }
  .closing-contours {
    position: absolute;
    left: 0;
    bottom: 0;
    width: min(50vw, 520px);
    height: auto;
    z-index: -1;
    pointer-events: none;
  }
  .closing-grid {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 48px;
  }
  .closing-grid h2 {
    font-family: "Rufina", Georgia, serif;
    font-size: clamp(44px, 5vw, 76px);
    line-height: 1.04;
    letter-spacing: -0.025em;
  }
  .closing-grid p {
    font-size: 17px;
    color: #d9e0d3;
  }
  .closing-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 20px;
  }
  .closing-actions .button-outline:hover {
    color: var(--green);
  }

  /* Simulated plan change dialog */
  .modal-content {
    display: grid;
    gap: 16px;
  }
  .demo-notice {
    padding: 11px 14px;
    border-radius: 6px;
    background: #f6ead2;
    color: #4f3a17;
    font-size: 13.5px;
    line-height: 1.5;
  }
  .modal-summary {
    margin: 0;
    display: grid;
  }
  .modal-summary > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    min-height: 46px;
    padding: 8px 0;
    border-top: 1px solid #e3e0d4;
    font-size: 14px;
  }
  .modal-summary dt {
    color: #5e6659;
  }
  .modal-summary dd {
    margin: 0;
    font-weight: 600;
    text-align: right;
  }
  .modal-billing {
    display: inline-flex;
    gap: 14px;
    font-weight: 500;
  }
  .modal-billing label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    cursor: pointer;
  }
  .modal-billing input {
    accent-color: var(--green);
  }
  .modal-number {
    width: 84px;
    min-height: 38px;
    padding: 6px 10px;
    border: 1px solid #c8ccbe;
    border-radius: 5px;
    background: #fff;
    font: inherit;
    text-align: right;
  }
  .modal-total {
    font-family: var(--serif);
    font-size: 24px;
    font-weight: 400 !important;
    color: var(--ink);
  }
  .modal-hint {
    font-size: 13px;
    color: #5e6659;
  }
  .modal-error {
    font-size: 13.5px;
    color: #8a2f1d;
  }
  .modal-done {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 16px;
    color: #245037;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  .modal-actions .plan-cta {
    width: auto;
    margin: 0;
    min-height: 46px;
    font-size: 18px;
  }
  .modal-cancel {
    min-height: 46px;
    padding: 8px 16px;
    border: 1px solid #c8ccbe;
    border-radius: 7px;
    background: transparent;
    font-size: 14px;
  }
  .modal-cancel:hover {
    background: #ecefe5;
  }

  @media (max-width: 1180px) {
    .plans {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }
    .plan-kantor {
      margin-block: 0;
    }
    .band {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 900px) {
    .hero-grid,
    .calc-grid,
    .assurances,
    .faq {
      grid-template-columns: 1fr;
      gap: 36px;
    }
    .trust {
      grid-template-columns: 1fr;
    }
    .trust > div + div {
      border-left: 0;
      border-top: 1px solid var(--rule);
    }
  }
  @media (max-width: 760px) {
    .hero-grid {
      padding-top: 20px;
    }
    .hero-text h1 {
      font-size: clamp(40px, 11vw, 54px);
    }
    .hero-anchor {
      font-size: 19px;
    }
    .billing label {
      padding-inline: 16px;
    }
    .plans-section {
      padding-top: 92px;
    }
    .plans {
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .plan-for,
    .price-note {
      min-height: 0;
    }
    .plan-kantor {
      order: -1;
    }
    .lembaga,
    .packs {
      padding: 28px 20px;
    }
    .lembaga-offers {
      grid-template-columns: 1fr;
      gap: 18px;
    }
    .trust > div {
      padding: 22px 4px;
    }
    .calculator {
      margin-top: 56px;
      padding-block: 56px;
    }
    .calc-result {
      padding: 26px 20px 22px;
    }
    .result-plan {
      font-size: 34px;
    }
    .assurances {
      padding-top: 56px;
    }
    .compare {
      padding-top: 56px;
    }
    .compare-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 8px 14px;
      border: 1px solid #c3c8b8;
      border-radius: 7px;
      background: var(--surface);
      font-size: 13px;
      color: var(--ink);
    }
    .compare-toggle[aria-expanded="true"] :global(svg) {
      transform: rotate(180deg);
    }
    .compare-head {
      flex-direction: column;
      align-items: flex-start;
    }
    .table-scroll.collapsed {
      display: none;
    }
    th,
    td {
      padding: 12px 12px;
      font-size: 13px;
    }
    thead th {
      font-size: 16px;
    }
    tbody th {
      position: sticky;
      left: 0;
      background: var(--surface);
      min-width: 140px;
    }
    .faq {
      padding-block: 56px;
    }
    .pricing-closing {
      padding: 104px 0 56px;
    }
    .closing-grid {
      flex-direction: column;
      align-items: flex-start;
      gap: 24px;
    }
  }
</style>
