<script lang="ts">
  import {
    parseMarkdown,
    type Inline,
    type ListItem,
  } from "../lib/markdown";

  let { text }: { text: string } = $props();
  const blocks = $derived(parseMarkdown(text));
</script>

{#snippet inline(nodes: Inline[])}{#each nodes as node, i (i)}{#if node.type === "text"}{node.text}{:else if node.type === "strong"}<strong
        >{@render inline(node.children)}</strong
      >{:else if node.type === "em"}<em>{@render inline(node.children)}</em
      >{:else}<code>{node.text}</code>{/if}{/each}{/snippet}

{#snippet items(list: ListItem[])}{#each list as item, i (i)}<li>
      {@render inline(item.content)}
      {#if item.children.length}<ul>
          {@render items(item.children)}
        </ul>{/if}
    </li>{/each}{/snippet}

<div class="md">
  {#each blocks as block, i (i)}{#if block.type === "heading"}{#if block.level === 3}<h3
        >
          {@render inline(block.content)}
        </h3>{:else}<h4>{@render inline(block.content)}</h4>{/if}{:else if block.type === "paragraph"}<p
      >
        {@render inline(block.content)}
      </p>{:else if block.ordered}<ol start={block.start}>
        {@render items(block.items)}
      </ol>{:else}<ul>
        {@render items(block.items)}
      </ul>{/if}{/each}
</div>

<style>
  .md {
    display: flex;
    flex-direction: column;
    gap: 0.6em;
  }
  .md :global(p),
  .md :global(li) {
    margin: 0;
  }
  .md h3,
  .md h4 {
    margin: 0.4em 0 0;
    font-weight: 600;
    font-size: 1em;
    color: inherit;
    font-family: inherit;
  }
  .md ul,
  .md ol {
    margin: 0;
    padding-left: 1.3em;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .md ul {
    list-style: disc;
  }
  .md ol {
    list-style: decimal;
  }
  .md ul ul {
    list-style: circle;
    margin-top: 0.3em;
  }
  .md li::marker {
    color: var(--muted, #657164);
  }
  .md strong {
    font-weight: 650;
  }
  .md code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
    background: rgba(23, 58, 44, 0.06);
    padding: 0.05em 0.35em;
    border-radius: 4px;
  }
</style>
