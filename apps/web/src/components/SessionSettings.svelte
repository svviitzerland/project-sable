<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import { api, speakerName, type CaseDetail } from "../lib/workspace-api";
  import styles from "./workspace.module.css";

  let {
    detail,
    busy,
    run,
  }: {
    detail: CaseDetail;
    busy: boolean;
    run: (action: () => Promise<unknown>) => Promise<boolean>;
  } = $props();

  let speakers = $derived([...new Set(detail.segments.map((s) => s.speaker))]);
  let voices = $derived(speakers.some((s) => s.startsWith("voice:")));
</script>

<div class={styles.settingsPage}>
  <section>
    <h2>{t("speakers.title")}</h2>
    <p>{t("speakers.text")}</p>
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
      <p class={styles.muted}>
        {t("speakers.voices")}
      </p>
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
</div>

{#if busy}<Skeleton variant="compact" label={t("speakers.skeleton")} />{/if}
