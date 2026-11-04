<script lang="ts">
  /** Minimal safe rendering for assistant replies: **bold**, "- " bullets, "1. " lists and [n] citation chips. */
  let { text, oncite }: { text: string; oncite?: (index: number) => void } = $props();

  type Inline = { kind: "text" | "bold" | "cite"; value: string };
  type Block = { kind: "p" | "ul" | "ol"; lines: Inline[][] };

  function inline(line: string): Inline[] {
    const parts: Inline[] = [];
    const re = /\*\*(.+?)\*\*|\[(\d+)\]/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (m.index > last) parts.push({ kind: "text", value: line.slice(last, m.index) });
      if (m[1]) parts.push({ kind: "bold", value: m[1] });
      else parts.push({ kind: "cite", value: m[2] });
      last = re.lastIndex;
    }
    if (last < line.length) parts.push({ kind: "text", value: line.slice(last) });
    return parts;
  }

  let blocks = $derived.by(() => {
    const out: Block[] = [];
    for (const chunk of text.split(/\n{2,}/)) {
      const lines = chunk.split("\n").filter(Boolean);
      if (lines.every((l) => /^- /.test(l))) out.push({ kind: "ul", lines: lines.map((l) => inline(l.slice(2))) });
      else if (lines.every((l) => /^\d+\. /.test(l))) out.push({ kind: "ol", lines: lines.map((l) => inline(l.replace(/^\d+\. /, ""))) });
      else out.push({ kind: "p", lines: lines.map(inline) });
    }
    return out;
  });
</script>

{#snippet line(parts: Inline[])}
  {#each parts as part, i (i)}
    {#if part.kind === "bold"}<strong>{part.value}</strong>
    {:else if part.kind === "cite"}<button class="cite" onclick={() => oncite?.(Number(part.value) - 1)} aria-label={`[${part.value}]`}>{part.value}</button>
    {:else}{part.value}{/if}
  {/each}
{/snippet}

<div class="rich">
  {#each blocks as block, b (b)}
    {#if block.kind === "ul"}
      <ul>{#each block.lines as parts, i (i)}<li>{@render line(parts)}</li>{/each}</ul>
    {:else if block.kind === "ol"}
      <ol>{#each block.lines as parts, i (i)}<li>{@render line(parts)}</li>{/each}</ol>
    {:else}
      <p>{#each block.lines as parts, i (i)}{#if i > 0}<br />{/if}{@render line(parts)}{/each}</p>
    {/if}
  {/each}
</div>

<style>
  .rich { display: grid; gap: 10px; line-height: 1.6; }
  ul, ol { display: grid; gap: 6px; padding-left: 18px; }
  ul { list-style: disc; }
  ol { list-style: decimal; }
  li::marker { color: var(--muted); }
  strong { font-weight: 600; color: var(--ink-strong); }
  .cite {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    margin: 0 1px;
    border-radius: 4px;
    background: var(--selected);
    color: var(--ink-strong);
    font-size: 10.5px;
    font-weight: 700;
    vertical-align: 1px;
    line-height: 1;
  }
  .cite:hover { background: var(--mark); }
</style>
