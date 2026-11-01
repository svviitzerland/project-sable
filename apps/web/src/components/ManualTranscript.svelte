<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import { Plus } from "@lucide/svelte";
  import ui from "./workspace.module.css";
  import styles from "./case-tabs.module.css";

  let {
    busy,
    submit,
  }: {
    busy: boolean;
    submit: (body: {
      text: string;
      speaker: string;
      start: number;
      end: number;
    }) => Promise<boolean>;
  } = $props();

  let open = $state(false);

  let text = $state("");

  let speaker = $state(t("manual.defaultSpeaker"));
</script>

<div class={styles.manual}>
  <button
    class={styles.ghost}
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <Plus size={15}></Plus>
    {t("manual.add")}
  </button>
  {#if open}<form
      onsubmit={async (e) => {
        e.preventDefault();
        if (await submit({ text, speaker, start: 0, end: 0 })) text = "";
      }}
    >
      <label>
        {t("manual.speaker")}
        <input
          value={speaker}
          oninput={(e) => (speaker = e.currentTarget.value)}
          required
          maxlength={80}
        />
      </label>
      <label>
        {t("manual.statement")}
        <textarea
          value={text}
          oninput={(e) => (text = e.currentTarget.value)}
          required
          minLength={3}
          maxlength={6000}
          rows={3}
          placeholder={t("manual.placeholder")}></textarea>
      </label>
      <button class={ui.primary} disabled={busy}>
        {busy ? t("common.saving") : t("manual.save")}
      </button>
    </form>{/if}
</div>

{#if busy}<Skeleton variant="compact" label={t("manual.skeleton")} />{/if}
