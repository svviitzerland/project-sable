<script lang="ts">
  import { labels, type Status } from "../lib/workspace-api";
  import styles from "./workspace.module.css";

  let { status }: { status: Status } = $props();
</script>

<span class={`${styles.status} ${styles[status]}`}>
  {labels[status]}
</span>
