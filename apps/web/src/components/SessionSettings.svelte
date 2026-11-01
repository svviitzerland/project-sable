<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Modal from "./Modal.svelte";
  import { Check, Download, Trash2 } from "@lucide/svelte";
  import { api, type CaseDetail } from "../lib/workspace-api";
  import ui from "./workspace.module.css";
  import styles from "./case-tabs.module.css";

  let {
    detail,
    busy,
    run,
    onDeleted = () => undefined,
  }: {
    detail: CaseDetail;
    busy: boolean;
    run: (action: () => Promise<unknown>) => Promise<boolean>;
    onDeleted?: () => void;
  } = $props();

  let speakers = $derived([...new Set(detail.segments.map((s) => s.speaker))]);
  let voices = $derived(speakers.some((s) => s.startsWith("voice:")));
  let saved = $state(false);
  let saving = $state(false);
  let confirming = $state(false);
</script>

<div class={styles.screen}>
  <header class={styles.heading}>
    <h2>{t("settings.title")}</h2>
    <p>{t("tabs.settings.lead")}</p>
  </header>

  <div class={styles.settings}>
    <section class={styles.setting} aria-labelledby="settings-details">
      <div>
        <h3 id="settings-details">{t("settings.details")}</h3>
        <p>{t("tabs.settings.detailsText")}</p>
      </div>
      <div class={styles.settingBody}>
        <form
          class={styles.settingForm}
          oninput={() => (saved = false)}
          onsubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            saving = true;
            saved = await run(() =>
              api(`/cases/${detail.case.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  title: form.get("title"),
                  reference: form.get("reference"),
                  description: form.get("description"),
                }),
              }),
            );
            saving = false;
          }}
        >
          <label>
            {t("newCase.caseTitle")}
            <input
              name="title"
              value={detail.case.title}
              required
              maxlength={160}
            />
          </label>
          <label>
            {t("newCase.reference")}
            <input
              name="reference"
              value={detail.case.reference}
              maxlength={100}
            />
          </label>
          <label>
            {t("newCase.description")}
            <textarea name="description" rows="3" maxlength={2000}
              >{detail.case.description}</textarea
            >
          </label>
          <div>
            <button class={ui.primary} disabled={busy}>
              {saving ? t("common.saving") : t("settings.save")}
            </button>
            {#if saved}<span class={styles.reviewed} role="status"
                ><Check size={14}></Check>{t("settings.saved")}</span
              >{/if}
          </div>
        </form>
      </div>
    </section>

    {#if voices}
      <section class={styles.setting} aria-labelledby="settings-voices">
        <div>
          <h3 id="settings-voices">{t("settings.voices")}</h3>
          <p>{t("settings.voicesText")}</p>
        </div>
        <div class={styles.settingBody}>
          <button
            class={ui.secondary}
            disabled={busy}
            onclick={() =>
              void run(() =>
                api(`/cases/${detail.case.id}/voiceprints`, {
                  method: "DELETE",
                }),
              )}
          >
            {t("speakers.forget")}
          </button>
        </div>
      </section>
    {/if}

    <section class={styles.setting} aria-labelledby="settings-export">
      <div>
        <h3 id="settings-export">{t("settings.export")}</h3>
        <p>{t("settings.exportText")}</p>
      </div>
      <div class={styles.settingBody}>
        <a
          class={ui.secondary}
          rel="external"
          href={`/api/v1/cases/${detail.case.id}/export.jude`}
        >
          <Download size={15}></Download>
          {t("settings.exportButton")}
        </a>
      </div>
    </section>

    <section
      class={`${styles.setting} ${styles.danger}`}
      aria-labelledby="settings-danger"
    >
      <div>
        <h3 id="settings-danger">{t("settings.danger")}</h3>
        <p>{t("settings.dangerText")}</p>
      </div>
      <div class={styles.settingBody}>
        <button
          class={styles.dangerOutline}
          disabled={busy}
          onclick={() => (confirming = true)}
        >
          <Trash2 size={15}></Trash2>
          {t("settings.deleteButton")}
        </button>
      </div>
    </section>
  </div>
</div>

<Modal
  open={confirming}
  title={t("settings.confirmTitle")}
  onClose={() => (confirming = false)}
>
  <p class={ui.muted}>
    {t("settings.confirmText", { title: detail.case.title })}
  </p>
  {#snippet footer()}
    <button class={ui.secondary} onclick={() => (confirming = false)}>
      {t("common.cancel")}
    </button>
    <button
      class={ui.dangerButton}
      disabled={busy}
      onclick={async () => {
        confirming = false;
        if (
          await run(() => api(`/cases/${detail.case.id}`, { method: "DELETE" }))
        )
          onDeleted();
      }}
    >
      {t("settings.confirmDelete")}
    </button>
  {/snippet}
</Modal>
