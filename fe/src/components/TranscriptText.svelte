<script lang="ts">
  let { text, term }: { text: string; term: string } = $props();

  const pieces = $derived.by(() => {
    if (!term) return [{ text, match: false }];
    const result: { text: string; match: boolean }[] = [];
    const lower = text.toLocaleLowerCase();
    let start = 0;
    let match = lower.indexOf(term);
    while (match !== -1) {
      result.push(
        { text: text.slice(start, match), match: false },
        { text: text.slice(match, match + term.length), match: true },
      );
      start = match + term.length;
      match = lower.indexOf(term, start);
    }
    result.push({ text: text.slice(start), match: false });
    return result;
  });
</script>

{#each pieces as piece, index (index)}{#if piece.match}<mark>{piece.text}</mark
    >{:else}{piece.text}{/if}{/each}
