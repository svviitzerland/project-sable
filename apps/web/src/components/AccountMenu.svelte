<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import { CircleHelp, LogOut } from "@lucide/svelte";
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

  function toggle() {
    if (!open && trigger) {
      const box = trigger.getBoundingClientRect();
      // Beside the rail on desktop, above the trigger on narrow screens.
      const beside = window.innerWidth > 640;
      position = beside
        ? { left: box.right + 14, bottom: window.innerHeight - box.bottom }
        : { left: box.left, bottom: window.innerHeight - box.top + 8 };
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
