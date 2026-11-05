<script lang="ts">
  import Connections from "../components/Connections.svelte";
  import { t } from "../lib/i18n";
  import { route } from "../lib/router.svelte";

  /** Keterkaitan: pick one thing in the case and see what else may relate to it. */
  let { caseId }: { caseId: string } = $props();
</script>

<div class="page connections-page">
  <header class="page-head">
    <div>
      <h1>{t("cx.title")}</h1>
      <p>{t("cx.lead")}</p>
    </div>
  </header>
  <Connections {caseId} of={route.query.of ?? route.query.start} />
</div>

<style>
  .connections-page {
    max-width: 1560px;
  }
</style>
