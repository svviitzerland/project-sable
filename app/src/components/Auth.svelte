<script lang="ts">
  import Skeleton from "./Skeleton.svelte";
  import { resolve } from "$app/paths";
  import { ArrowLeft, ArrowRight, Play, ShieldCheck } from "@lucide/svelte";
  import { api, type Capabilities, type User } from "../lib/workspace-api";
  import styles from "./workspace.module.css";

  let {
    caps,
    error,
    setError,
    onUser,
  }: {
    caps: Capabilities | null;
    error: string;
    setError: (v: string) => void;
    onUser: (u: User) => void;
  } = $props();

  let register = $state(false);

  let busy = $state(false);

  async function submit(
    event: SubmitEvent & { currentTarget: HTMLFormElement },
  ) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    busy = true;
    setError("");
    try {
      onUser(
        await api<User>(`/auth/${register ? "register" : "login"}`, {
          method: "POST",
          body: JSON.stringify(values),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy = false;
    }
  }
</script>

<div class={styles.auth}>
  <div class={styles.authStory}>
    <a href={resolve("/")} class={styles.brand}> jude. </a>
    <div>
      <h1>
        Stay with the testimony.
        <br />
        Keep the evidence close.
      </h1>
      <p>
        A working space for your case documents, hearing record, and the
        questions that connect them.
      </p>
      <div class={styles.authPrinciple}>
        <ShieldCheck size={23}></ShieldCheck>
        <span>
          Sources you can inspect.
          <br />
          Judgment that stays with you.
        </span>
      </div>
    </div>
    <a href={resolve("/")}>
      <ArrowLeft size={16}></ArrowLeft>
      Back to the introduction
    </a>
  </div>
  <div class={styles.authForm}>
    <h2>
      {register ? "Create your workspace." : "Welcome to your workspace."}
    </h2>
    <p>
      {register
        ? "Start with a case. Bring the evidence together."
        : "Sign in to continue examining your cases."}
    </p>
    {#if error}<p class={styles.error} role="alert">
        {error}
      </p>{/if}
    <form onsubmit={submit}>
      {#if register}<label>
          Your name
          <input name="name" autocomplete="name" required maxlength={100} />
        </label>{/if}
      <label>
        Email address
        <input name="email" type="email" autocomplete="email" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          minLength={10}
          maxlength={128}
          autocomplete={register ? "new-password" : "current-password"}
          required
        />
        <small>At least 10 characters.</small>
      </label>
      <button class={styles.primary} disabled={busy}>
        {busy ? "Opening workspace…" : register ? "Create account" : "Sign in"}
        <ArrowRight size={17}></ArrowRight>
      </button>
    </form>
    {#if busy}<Skeleton
        variant="compact"
        label="Opening your workspace…"
      />{/if}
    <button class={styles.textButton} onclick={() => (register = !register)}>
      {register
        ? "Already have an account? Sign in"
        : "New to Jude? Create an account"}
    </button>
    {#if caps?.demo_available}<div class={styles.demoEntry}>
        <span>Explore before you start</span>
        <button
          class={styles.secondary}
          disabled={busy}
          onclick={async () => {
            busy = true;
            setError("");
            try {
              onUser(await api<User>("/auth/demo", { method: "POST" }));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              busy = false;
            }
          }}
        >
          <Play size={16}></Play>
          Open a synthetic case
        </button>
        <p>
          A private demo session with prepared evidence. No microphone or
          provider account needed.
        </p>
      </div>{/if}
    <small class={styles.authFootnote}>
      Prototype for authorized material. Provider connections are configured by
      the operator.
    </small>
  </div>
</div>
