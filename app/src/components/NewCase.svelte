<script lang="ts">
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
    <h2>Create a case</h2>
    <button aria-label="Cancel new case" onclick={close}>
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
      Case title
      <input
        name="title"
        required
        maxlength={160}
        placeholder="e.g. Warehouse inquiry"
        bind:this={titleInput}
      />
    </label>
    <label>
      Reference
      <input
        name="reference"
        maxlength={100}
        placeholder="Your case reference"
      />
    </label>
    <label class={styles.fullWidth}>
      Description
      <textarea
        name="description"
        maxlength={2000}
        rows={2}
        placeholder="Context for this case and its material"></textarea>
    </label>
    <div>
      <button class={styles.primary} disabled={busy}>
        {busy ? "Creating…" : "Create case"}
      </button>
      <button type="button" class={styles.secondary} onclick={close}>
        Cancel
      </button>
    </div>
  </form>
</section>
