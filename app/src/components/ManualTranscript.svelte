<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import styles from "./workspace.module.css";

  let {
    busy,
    submit,
  }: {
    busy: boolean;
    submit: (body: {
      text: string;
      speaker: string;
      start: number;
      end: number;
    }) => Promise<boolean>;
  } = $props();

  let open = $state(false);

  let text = $state("");

  let speaker = $state("Unknown");
</script>

<div class={styles.manual}>
  <button
    class={styles.textButton}
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <Plus size={15}></Plus>
    Add transcript text
  </button>
  {#if open}<form
      onsubmit={async (e) => {
        e.preventDefault();
        if (await submit({ text, speaker, start: 0, end: 0 })) text = "";
      }}
    >
      <label>
        Speaker label
        <input
          value={speaker}
          oninput={(e) => (speaker = e.currentTarget.value)}
          required
          maxlength={80}
        />
      </label>
      <label>
        Finalized statement
        <textarea
          value={text}
          oninput={(e) => (text = e.currentTarget.value)}
          required
          minLength={3}
          maxlength={6000}
          rows={3}
          placeholder="Enter the exact words spoken…"></textarea>
      </label>
      <button class={styles.primary} disabled={busy}>
        {busy ? "Saving…" : "Save & examine"}
      </button>
    </form>{/if}
</div>
