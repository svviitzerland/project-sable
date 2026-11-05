<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Modal from "./Modal.svelte";
  import ui from "./workspace.module.css";
  import styles from "./hearing.module.css";

  let {
    open,
    onClose,
    busy,
    submit,
  }: {
    open: boolean;
    onClose: () => void;
    busy: boolean;
    submit: (body: {
      text: string;
      speaker: string;
      start: number;
      end: number;
    }) => Promise<boolean>;
  } = $props();

  let text = $state("");
  let speaker = $state(t("manual.defaultSpeaker"));
</script>

<Modal {open} title={t("manual.add")} {onClose}>
  <form
    id="manual-statement"
    class={styles.form}
    onsubmit={async (e) => {
      e.preventDefault();
      if (await submit({ text, speaker, start: 0, end: 0 })) {
        text = "";
        onClose();
      }
    }}
  >
    <label>
      {t("manual.speaker")}
      <input bind:value={speaker} required maxlength={80} />
    </label>
    <label>
      {t("manual.statement")}
      <textarea
        bind:value={text}
        required
        minLength={3}
        maxlength={6000}
        rows={4}
        placeholder={t("manual.placeholder")}></textarea>
    </label>
  </form>
  {#snippet footer()}
    <button class={ui.secondary} onclick={onClose}>{t("common.cancel")}</button>
    <button
      class={ui.primary}
      type="submit"
      form="manual-statement"
      disabled={busy}
    >
      {busy ? t("common.saving") : t("manual.save")}
    </button>
  {/snippet}
</Modal>
