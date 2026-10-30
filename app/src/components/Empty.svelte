<script lang="ts">
  import styles from "./workspace.module.css";
  import { type Snippet } from "svelte";

  let {
    icon,
    title,
    text,
  }: {
    icon: Snippet;
    title: string;
    text: string;
  } = $props();
</script>

<div class={styles.empty}>
  {@render icon()}
  <h3>{title}</h3>
  <p>{text}</p>
</div>
