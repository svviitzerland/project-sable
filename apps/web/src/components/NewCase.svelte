<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Modal from "./Modal.svelte";
  import { ArrowLeft, FilePlus2, Upload, BookOpen } from "@lucide/svelte";
  import { api, type Case } from "../lib/workspace-api";
  import styles from "./workspace.module.css";

  let {
    open,
    busy,
    close,
    submit,
    onImported,
    onDemo,
  }: {
    open: boolean;
    busy: boolean;
    close: () => void;
    submit: (body: Record<string, FormDataEntryValue>) => void;
    onImported: (id: string) => Promise<void>;
    /** Present only when the example case is available. */
    onDemo?: () => void;
  } = $props();

  // One choice first, then the matching small step.
  let step = $state<"choose" | "blank" | "import">("choose");
  let importing = $state(false);
  let error = $state("");

  $effect(() => {
    if (open) {
      step = "choose";
      error = "";
    }
  });

  async function importFile(file: File) {
    importing = true;
    error = "";
    try {
      if (file.size > 64 * 1024 * 1024) throw new Error(t("archive.tooLarge"));
      const body = new FormData();
      body.append("file", file);
      const imported = await api<Case>("/cases/import", {
        method: "POST",
        body,
      });
      await onImported(imported.id);
    } catch (e) {
      error = (e as Error).message;
    } finally {
      importing = false;
    }
  }
</script>

<Modal
  {open}
  title={step === "import"
    ? t("newCase.importTitle")
    : step === "blank"
      ? t("newCase.title")
      : t("newCase.chooseTitle")}
  onClose={close}
>
  {#if step === "choose"}
    <div class={styles.choiceList}>
      <button class={styles.choice} onclick={() => (step = "blank")}>
        <span class={styles.choiceIcon}><FilePlus2 size={20}></FilePlus2></span>
        <span>
          <strong>{t("newCase.blank")}</strong>
          <small>{t("newCase.blankText")}</small>
        </span>
      </button>
      <button class={styles.choice} onclick={() => (step = "import")}>
        <span class={styles.choiceIcon}><Upload size={20}></Upload></span>
        <span>
          <strong>{t("newCase.import")}</strong>
          <small>{t("newCase.importText")}</small>
        </span>
      </button>
      {#if onDemo}
        <button
          class={styles.choice}
          disabled={busy}
          onclick={() => {
            close();
            onDemo?.();
          }}
        >
          <span class={styles.choiceIcon}><BookOpen size={20}></BookOpen></span>
          <span>
            <strong>{t("newCase.demo")}</strong>
            <small>{t("newCase.demoText")}</small>
          </span>
        </button>
      {/if}
    </div>
  {:else if step === "blank"}
    <form
      id="new-case-form"
      class={styles.modalForm}
      onsubmit={(e) => {
        e.preventDefault();
        submit(Object.fromEntries(new FormData(e.currentTarget)));
      }}
    >
      <label>
        {t("newCase.caseTitle")}
        <!-- svelte-ignore a11y_autofocus -->
        <input
          name="title"
          required
          maxlength={160}
          placeholder={t("newCase.titlePlaceholder")}
          autofocus
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
      <label>
        {t("newCase.description")}
        <textarea
          name="description"
          maxlength={2000}
          rows={3}
          placeholder={t("newCase.descriptionPlaceholder")}></textarea>
      </label>
    </form>
  {:else}
    <label class={styles.dropZone}>
      <Upload size={22}></Upload>
      <strong
        >{importing
          ? t("archive.importing")
          : t("newCase.importChoose")}</strong
      >
      <small>{t("newCase.importHint")}</small>
      <input
        type="file"
        accept=".jude,.zip,application/zip,application/vnd.jude+zip"
        disabled={importing}
        onchange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void importFile(file);
        }}
      />
    </label>
    {#if error}<p class={styles.modalError} role="alert">{error}</p>{/if}
  {/if}

  {#snippet footer()}
    {#if step === "choose"}
      <button class={styles.secondary} onclick={close}>
        {t("common.cancel")}
      </button>
    {:else}
      <button class={styles.secondary} onclick={() => (step = "choose")}>
        <ArrowLeft size={15}></ArrowLeft>
        {t("newCase.back")}
      </button>
      {#if step === "blank"}
        <button
          class={styles.primary}
          type="submit"
          form="new-case-form"
          disabled={busy}
        >
          {busy ? t("newCase.creating") : t("newCase.create")}
        </button>
      {/if}
    {/if}
  {/snippet}
</Modal>
