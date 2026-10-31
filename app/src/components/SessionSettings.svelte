<script lang="ts">
  import Skeleton from "./Skeleton.svelte";
  import { api, type CaseDetail } from "../lib/workspace-api";
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
</script>

<div class={styles.settingsPage}>
  <section>
    <h2>Speaker labels</h2>
    <p>
      Give each speaker a name or courtroom role. Confirm who is speaking before
      changing a label.
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
        Speakers appear after you add a transcript.
      </p>{/if}
  </section>
</div>

{#if busy}<Skeleton variant="compact" label="Saving speaker labels…" />{/if}
