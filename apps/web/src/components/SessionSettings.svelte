<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import Modal from "./Modal.svelte";
  import { Download, Trash2 } from "@lucide/svelte";
  import { api, speakerName, type CaseDetail } from "../lib/workspace-api";
  import styles from "./workspace.module.css";

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
  let confirming = $state(false);
</script>

<div class={styles.settingsPage}>
  <section>
    <h2>{t("settings.details")}</h2>
    <form
      class={styles.settingsForm}
      onsubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
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
        <input name="reference" value={detail.case.reference} maxlength={100} />
      </label>
      <label class={styles.wide}>
        {t("newCase.description")}
        <textarea name="description" rows="3" maxlength={2000}
          >{detail.case.description}</textarea
        >
      </label>
      <div class={styles.settingsActions}>
        <button class={styles.primary} disabled={busy}>
          {t("settings.save")}
        </button>
        {#if saved}<span class={styles.muted} role="status"
            >{t("settings.saved")}</span
          >{/if}
      </div>
    </form>
  </section>

  <section>
    <h2>{t("settings.speakers")}</h2>
    <p>{t("settings.speakersText")}</p>
    {#if speakers.length}{#each speakers as s (s)}<form
          class={styles.speakerForm}
          onsubmit={(e) => {
            e.preventDefault();
            const label = new FormData(e.currentTarget).get("label");
            void run(() =>
              api(`/cases/${detail.case.id}/speakers`, {
                method: "PATCH",
                body: JSON.stringify({ speaker: s, label }),
              }),
            );
          }}
        >
          <label>
            {speakerName(s, {})}
            <input
              name="label"
              value={detail.case.speakers[s] ?? ""}
              placeholder={t("speakers.placeholder")}
              required
              maxlength={80}
            />
          </label>
          <button class={styles.secondary} disabled={busy}>
            {t("speakers.save")}
          </button>
        </form>{/each}{:else}<p class={styles.muted}>
        {t("speakers.empty")}
      </p>{/if}
    {#if voices}
      <p class={styles.muted}>{t("speakers.voices")}</p>
      <button
        class={styles.secondary}
        disabled={busy}
        onclick={() =>
          void run(() =>
            api(`/cases/${detail.case.id}/voiceprints`, { method: "DELETE" }),
          )}
      >
        {t("speakers.forget")}
      </button>
    {/if}
  </section>

  <section>
    <h2>{t("settings.export")}</h2>
    <p>{t("settings.exportText")}</p>
    <a
      class={styles.secondary}
      rel="external"
      href={`/api/v1/cases/${detail.case.id}/export.jude`}
    >
      <Download size={15}></Download>
      {t("settings.exportButton")}
    </a>
  </section>

  <section class={styles.dangerZone}>
    <h2>{t("settings.danger")}</h2>
    <p>{t("settings.dangerText")}</p>
    <button
      class={styles.dangerButton}
      disabled={busy}
      onclick={() => (confirming = true)}
    >
      <Trash2 size={15}></Trash2>
      {t("settings.deleteButton")}
    </button>
  </section>
</div>

<Modal
  open={confirming}
  title={t("settings.confirmTitle")}
  onClose={() => (confirming = false)}
>
  <p class={styles.muted}>
    {t("settings.confirmText", { title: detail.case.title })}
  </p>
  {#snippet footer()}
    <button class={styles.secondary} onclick={() => (confirming = false)}>
      {t("common.cancel")}
    </button>
    <button
      class={styles.dangerButton}
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

{#if busy}<Skeleton variant="compact" label={t("speakers.skeleton")} />{/if}
