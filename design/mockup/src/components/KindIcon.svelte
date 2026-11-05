<script lang="ts">
  import { kindIcon, type Kind } from "../lib/kinds";
  import Avatar from "./Avatar.svelte";

  /**
   * The shared icon for a kind of thing. A statement with a known speaker shows that person's
   * talking head, so a line from a hearing is recognisable as theirs wherever it is quoted.
   */
  let { kind, size = 16, speakerId }: { kind: Kind; size?: number; speakerId?: string } = $props();
  let Icon = $derived(kindIcon[kind]);
</script>

{#if kind === "statement" && speakerId}
  <Avatar id={speakerId} size={size >= 26 ? "sm" : size >= 19 ? "xs" : "xxs"} />
{:else}
  <Icon {size} strokeWidth={size >= 18 ? 1.75 : 2} aria-hidden="true" />
{/if}
