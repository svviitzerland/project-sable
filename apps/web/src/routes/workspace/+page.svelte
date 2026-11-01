<script lang="ts">
  import Workspace from "../../components/Workspace.svelte";
  import { t } from "../../lib/i18n/index.svelte";
</script>

<svelte:head
  ><title>{t("meta.workspaceTitle")}</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<Workspace />
