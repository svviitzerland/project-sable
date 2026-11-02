<script lang="ts">
  import PricingPage from "../../components/PricingPage.svelte";
  import { t } from "../../lib/i18n/index.svelte";
</script>

<svelte:head>
  <title>{t("meta.pricingTitle")}</title>
  <meta name="description" content={t("meta.pricingDescription")} />
</svelte:head>
<PricingPage />
