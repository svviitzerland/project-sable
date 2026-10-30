<script lang="ts">
  import { FolderOpen } from "@lucide/svelte";
  import {
    api,
    type Capabilities,
    type CaseDetail,
  } from "../lib/workspace-api";
  import styles from "./workspace.module.css";

  let {
    caps,
    detail,
    busy,
    run,
  }: {
    caps: Capabilities | null;
    detail: CaseDetail;
    busy: boolean;
    run: (action: () => Promise<unknown>) => Promise<boolean>;
  } = $props();

  let speakers = $derived([...new Set(detail.segments.map((s) => s.speaker))]);
</script>

<div class={styles.settingsPage}>
  <section>
    <h2>Speaker labels</h2>
    <p>
      Voice IDs are not identities. Assign a courtroom role only after you have
      verified who is speaking.
    </p>
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
            {s}
            <input
              name="label"
              value={detail.case.speakers[s] ?? ""}
              placeholder="Verified name or role"
              required
              maxlength={80}
            />
          </label>
          <button class={styles.secondary} disabled={busy}> Save label </button>
        </form>{/each}{:else}<p class={styles.muted}>
        Speaker IDs appear after testimony is added.
      </p>{/if}
  </section>
  <section>
    <h2>Connections</h2>
    <p>
      Configured means credentials are present; a successful request verifies
      the provider. Secrets stay on the backend.
    </p>
    {#if caps}{#each ["analysis", "speech", "legal", "embeddings"] as const as key (key)}<div
          class={styles.connection}
        >
          <span
            class={caps[key].configured ? styles.onlineDot : styles.offlineDot}
          ></span>
          <div>
            <h3>
              {{
                analysis: "OpenRouter analysis",
                speech: "Speechmatics transcription",
                legal: "Pasal.id legal discovery",
                embeddings: "Evidence embeddings",
              }[key]}
            </h3>
            <p>{caps[key].note}</p>
          </div>
          <span>
            {caps[key].configured ? "Configured" : "Not connected"}
          </span>
        </div>{/each}{/if}
    <div class={styles.connection}>
      <FolderOpen size={17}></FolderOpen>
      <div>
        <h3>{caps?.storage ?? "Storage"}</h3>
        <p>
          Case records persist on the backend. Original files use local private
          storage or the configured Supabase bucket.
        </p>
      </div>
    </div>
  </section>
</div>
