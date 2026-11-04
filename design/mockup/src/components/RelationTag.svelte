<script lang="ts">
  import { t } from "../lib/i18n";
  import type { Relation } from "../lib/types";

  let { relation, reviewed }: { relation: Relation; reviewed?: boolean } = $props();
</script>

<span class="rel" data-rel={relation}>
  <svg width="18" height="6" viewBox="0 0 18 6" aria-hidden="true">
    <line x1="1" y1="3" x2="17" y2="3" stroke-width="2" stroke-dasharray={reviewed === false ? "3 3" : undefined} />
  </svg>
  {t(`rel.${relation}`)}
</span>

<style>
  .rel {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
  line { stroke: currentColor; }
  [data-rel="supports"] { color: var(--rel-supports-ink); }
  [data-rel="supports"] line { stroke: var(--rel-supports); }
  [data-rel="conflicts"] { color: var(--rel-conflicts-ink); }
  [data-rel="conflicts"] line { stroke: var(--rel-conflicts); }
  [data-rel="context"] { color: var(--rel-context-ink); }
  [data-rel="context"] line { stroke: var(--rel-context); }
  [data-rel="related"] { color: var(--rel-related-ink); }
  [data-rel="related"] line { stroke: var(--rel-related); }
</style>
