<script lang="ts">
  import { resolve } from "$app/paths";
  import { formatNumber, t } from "../lib/i18n/index.svelte";
  import type { MessageKey } from "../lib/i18n/index.svelte";
  import { CircleHelp, CreditCard, LogOut } from "@lucide/svelte";
  import { api, type PlanInfo } from "../lib/workspace-api";
  import LanguageToggle from "./LanguageToggle.svelte";
  import styles from "./workspace.module.css";

  let {
    name,
    subtitle,
    onTour,
    onSignOut,
  }: {
    name: string;
    subtitle: string;
    onTour: () => void;
    onSignOut: () => void;
  } = $props();

  let open = $state(false);
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();
  let position = $state({ left: 0, bottom: 0 });
  let plan = $state<PlanInfo | null>(null);

  // Simulated plan and this month's usage, refreshed each time the menu opens.
  $effect(() => {
    if (!open) return;
    api<PlanInfo>("/account/plan")
      .then((info) => (plan = info))
      .catch(() => (plan = null));
  });
  const hoursText = (seconds: number) =>
    formatNumber(Math.round((seconds / 3600) * 10) / 10);
  const meters = $derived(
    plan
      ? [
          {
            label: t("account.hoursUsed"),
            used: plan.usage.hearing_seconds_this_month,
            limit: plan.limits.hearing_seconds,
            text: t("account.usageOf", {
              used: hoursText(plan.usage.hearing_seconds_this_month),
              limit: hoursText(plan.limits.hearing_seconds),
            }),
            over: plan.exceeded.hearing_seconds,
          },
          {
            label: t("account.questionsUsed"),
            used: plan.usage.ai_questions_this_month,
            limit: plan.limits.ai_questions,
            text: t("account.usageOf", {
              used: formatNumber(plan.usage.ai_questions_this_month),
              limit: formatNumber(plan.limits.ai_questions),
            }),
            over: plan.exceeded.ai_questions,
          },
        ]
      : [],
  );

  function toggle() {
    if (!open && trigger) {
      // Opens upward inside the (expanded) rail, aligned with the account button.
      const box = trigger.getBoundingClientRect();
      position = { left: 12, bottom: window.innerHeight - box.top + 8 };
    }
    open = !open;
  }

  $effect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel?.contains(target) && !trigger?.contains(target)) open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        open = false;
        trigger?.focus();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  });
</script>

<button
  bind:this={trigger}
  class={styles.accountTrigger}
  aria-haspopup="dialog"
  aria-expanded={open}
  aria-label={t("account.menu")}
  data-tour="account"
  onclick={toggle}
>
  <span class={styles.accountAvatar} aria-hidden="true"
    >{name.slice(0, 1).toUpperCase()}</span
  >
  <span class="side-text">
    <strong>{name}</strong>
    <small>{subtitle}</small>
  </span>
</button>

{#if open}
  <div
    bind:this={panel}
    class={styles.accountPanel}
    role="dialog"
    aria-label={t("account.menu")}
    style={`left:${position.left}px;bottom:${position.bottom}px`}
  >
    <div class={styles.accountHead}>
      <strong>{name}</strong>
      <small>{subtitle}</small>
    </div>
    {#if plan}
      <div class="plan-box">
        <div class="plan-head">
          <span>{t("account.plan")}</span>
          <strong>{t(`plan.name.${plan.plan}` as MessageKey)}</strong>
        </div>
        {#each meters as meter (meter.label)}
          <div class="meter">
            <div class="meter-text">
              <span>{meter.label}</span>
              <span class:over={meter.over}>{meter.text}</span>
            </div>
            <div
              class="meter-bar"
              role="meter"
              aria-label={meter.label}
              aria-valuemin={0}
              aria-valuemax={meter.limit}
              aria-valuenow={Math.min(meter.used, meter.limit)}
              aria-valuetext={meter.text}
            >
              <span
                class:over={meter.over}
                style={`width:${Math.min(100, meter.limit ? (meter.used / meter.limit) * 100 : 0)}%`}
              ></span>
            </div>
            {#if meter.over}<small class="over">{t("account.overLimit")}</small
              >{/if}
          </div>
        {/each}
        <div class="plan-foot">
          <small>{t("account.simulated")}</small>
          <a href={resolve("/pricing")}>
            <CreditCard size={14}></CreditCard>
            {t("account.changePlan")}
          </a>
        </div>
      </div>
    {/if}
    <div class={styles.accountRow}>
      <span>{t("account.language")}</span>
      <LanguageToggle />
    </div>
    <button
      class={styles.accountItem}
      onclick={() => {
        open = false;
        onTour();
      }}
    >
      <CircleHelp size={16}></CircleHelp>
      {t("tour.replay")}
    </button>
    <button
      class={styles.accountItem}
      onclick={() => {
        open = false;
        onSignOut();
      }}
    >
      <LogOut size={16}></LogOut>
      {t("ws.signOut")}
    </button>
  </div>
{/if}

<style>
  .plan-box {
    display: grid;
    gap: 9px;
    margin: 0 2px 4px;
    padding: 10px 10px 8px;
    border-bottom: 1px solid #ecebe2;
  }
  .plan-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: 12px;
    color: #64675e;
  }
  .plan-head strong {
    font-size: 13px;
    font-weight: 600;
    color: #173a2c;
  }
  .meter-text {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 11.5px;
    color: #4d5b50;
    font-variant-numeric: tabular-nums;
  }
  .meter-bar {
    height: 4px;
    margin-top: 4px;
    border-radius: 999px;
    background: #e4e5da;
    overflow: hidden;
  }
  .meter-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #4b7958;
  }
  .meter-bar span.over {
    background: #b57539;
  }
  .over {
    color: #835025;
  }
  small.over {
    font-size: 11px;
  }
  .plan-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #64675e;
  }
  .plan-foot small {
    color: #64675e;
    opacity: 1;
    font-size: 11px;
  }
  .plan-foot a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 28px;
    font-size: 12.5px;
    font-weight: 600;
    color: #173a2c;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .plan-foot a:hover {
    color: #8b652a;
  }
</style>
