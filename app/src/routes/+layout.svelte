<script lang="ts">
  import "../app.css";
  let { children } = $props();
</script>

<svelte:head>
  <title>Jude — Evidence-grounded courtroom intelligence</title>
  <meta
    name="description"
    content="Stay with the testimony. See the whole story. Meet Jude, an evidence-grounded AI courtroom copilot being built for Indonesian legal professionals."
  />
</svelte:head>
{@render children()}
