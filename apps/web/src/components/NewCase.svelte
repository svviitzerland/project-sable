<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import { onMount } from "svelte";
  import { X } from "@lucide/svelte";
  import styles from "./workspace.module.css";

  let titleInput: HTMLInputElement;

  onMount(() => titleInput?.focus());

  let {
    busy,
    close,
    submit,
  }: {
    busy: boolean;
    close: () => void;
    submit: (body: Record<string, FormDataEntryValue>) => void;
  } = $props();
</script>

<section class={styles.newCaseForm}>
  <div>
    <h2>{t("newCase.title")}</h2>
    <button aria-label={t("newCase.cancel")} onclick={close}>
      <X size={18}></X>
    </button>
  </div>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      submit(Object.fromEntries(new FormData(e.currentTarget)));
    }}
  >
    <label>
      {t("newCase.caseTitle")}
      <input
        name="title"
        required
        maxlength={160}
        placeholder={t("newCase.titlePlaceholder")}
        bind:this={titleInput}
      />
    </label>
    <label>
      {t("newCase.reference")}
      <input
        name="reference"
        maxlength={100}
        placeholder={t("newCase.referencePlaceholder")}
      />
    </label>
    <label class={styles.fullWidth}>
      {t("newCase.description")}
      <textarea
        name="description"
        maxlength={2000}
        rows={2}
        placeholder={t("newCase.descriptionPlaceholder")}></textarea>
    </label>
    <div>
      <button class={styles.primary} disabled={busy}>
        {busy ? t("newCase.creating") : t("newCase.create")}
      </button>
      <button type="button" class={styles.secondary} onclick={close}>
        {t("common.cancel")}
      </button>
    </div>
  </form>
</section>

{#if busy}<Skeleton variant="compact" label={t("newCase.skeleton")} />{/if}
