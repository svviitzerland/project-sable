<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import { Upload } from "@lucide/svelte";
  import { api, type Case } from "../lib/workspace-api";
  import styles from "./casebook.module.css";

  let {
    onImport,
  }: {
    onImport: (id: string) => Promise<void>;
  } = $props();

  let busy = $state(false);

  let error = $state("");
</script>

<div class={styles.archiveImport}>
  <label class={styles.archiveButton}>
    <Upload size={16}></Upload>
    {busy ? t("archive.importing") : t("archive.import")}
    <input
      type="file"
      accept=".jude,.zip,application/zip,application/vnd.jude+zip"
      disabled={busy}
      onchange={async (event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;
        busy = true;
        error = "";
        try {
          if (file.size > 64 * 1024 * 1024)
            throw new Error(t("archive.tooLarge"));
          const body = new FormData();
          body.append("file", file);
          const imported = await api<Case>("/cases/import", {
            method: "POST",
            body,
          });
          await onImport(imported.id);
        } catch (e) {
          error = (e as Error).message;
        } finally {
          busy = false;
        }
      }}
    />
  </label>
  {#if busy}<Skeleton
      variant="compact"
      label={t("archive.importing")}
      inverse
    />{/if}
  {#if error}<p role="alert">{error}</p>{/if}
</div>
