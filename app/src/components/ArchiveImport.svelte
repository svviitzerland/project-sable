<script lang="ts">
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
    {busy ? "Importing case…" : "Import .jude"}
    <input
      type="file"
      accept=".jude"
      disabled={busy}
      onchange={async (event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;
        busy = true;
        error = "";
        try {
          if (file.size > 64 * 1024 * 1024)
            throw new Error("Use a .jude case archive up to 64 MB.");
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
  {#if error}<p role="alert">{error}</p>{/if}
</div>
