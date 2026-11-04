<script lang="ts">
  /**
   * Text with one phrase emphasized, so the part a finding is about stands out. With `around`,
   * only that many words on each side of the phrase are kept, for a quick read.
   */
  let { text, mark = "", around = 0 }: { text: string; mark?: string; around?: number } = $props();

  function trim(side: string, keep: number, fromEnd: boolean) {
    if (!keep) return side;
    const words = side.split(/(\s+)/);
    const count = words.filter((w) => w.trim()).length;
    if (count <= keep) return side;
    let seen = 0;
    if (fromEnd) {
      let i = words.length;
      while (i > 0 && seen < keep) if (words[--i].trim()) seen++;
      return "…" + words.slice(i).join("");
    }
    let i = 0;
    while (i < words.length && seen < keep) if (words[i++].trim()) seen++;
    return words.slice(0, i).join("") + "…";
  }

  let parts = $derived.by(() => {
    if (!mark) return { before: text, hit: "", after: "" };
    const i = text.toLowerCase().indexOf(mark.toLowerCase());
    if (i < 0) return { before: text, hit: "", after: "" };
    return {
      before: trim(text.slice(0, i), around, true),
      hit: text.slice(i, i + mark.length),
      after: trim(text.slice(i + mark.length), around, false),
    };
  });
</script>

{parts.before}{#if parts.hit}<mark class="hit">{parts.hit}</mark>{/if}{parts.after}

<style>
  .hit {
    background: color-mix(in srgb, var(--alert) 22%, transparent);
    color: inherit;
    box-shadow: inset 0 -2px 0 var(--alert);
    border-radius: 2px;
    padding: 0 1px;
  }
</style>
