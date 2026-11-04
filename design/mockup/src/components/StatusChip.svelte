<script lang="ts">
  import { t } from "../lib/i18n";
  import type { Status } from "../lib/types";

  let { status, size = "md" }: { status: Status; size?: "sm" | "md" } = $props();
</script>

<!-- Status meaning is always written out; color is a second signal, never the only one. -->
<span class="status {size}" data-status={status}>
  <span class="dot" aria-hidden="true"></span>
  {t(`status.${status}`)}
</span>

<style>
  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px 3px 7px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    width: fit-content;
  }
  .sm {
    font-size: 11px;
    padding: 2px 7px 2px 6px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  [data-status="supported"] { background: var(--st-supported-bg); color: var(--st-supported-ink); }
  [data-status="supported"] .dot { background: var(--st-supported-dot); }
  [data-status="potential_inconsistency"] { background: var(--st-inconsistency-bg); color: var(--st-inconsistency-ink); }
  [data-status="potential_inconsistency"] .dot { background: var(--st-inconsistency-dot); border-radius: 1px; transform: rotate(45deg); }
  [data-status="context_needed"] { background: var(--st-context-bg); color: var(--st-context-ink); }
  [data-status="context_needed"] .dot { background: transparent; border: 2px solid var(--st-context-dot); }
  [data-status="insufficient_evidence"] { background: var(--st-insufficient-bg); color: var(--st-insufficient-ink); }
  [data-status="insufficient_evidence"] .dot { background: var(--st-insufficient-dot); height: 2px; border-radius: 1px; }
</style>
