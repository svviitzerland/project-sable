<script lang="ts">
  import Skeleton from "./Skeleton.svelte";
  import { resolve } from "$app/paths";
  import { ArrowLeft, ArrowRight, Play, ShieldCheck } from "@lucide/svelte";
  import { api, type Capabilities, type User } from "../lib/workspace-api";
  import styles from "./workspace.module.css";
  import { t } from "../lib/i18n/index.svelte";
  import LanguageToggle from "./LanguageToggle.svelte";

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
  let passwordVisible = $state(false);

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
    <!-- Quiet contour lines and a curved seam give the panel its shape. -->
    <svg
      class={styles.authContours}
      viewBox="0 0 600 600"
      aria-hidden="true"
      focusable="false"
    >
      {#each [90, 150, 210, 270, 330, 390, 450] as r (r)}<circle
          cx="0"
          cy="600"
          {r}
        />{/each}
    </svg>
    <svg
      class={styles.authSeam}
      viewBox="0 0 60 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 0 C 70 28, 70 72, 0 100 Z" />
    </svg>
    <header class={styles.authTop}>
      <a href={resolve("/")} class={styles.brand}> jude. </a>
      <LanguageToggle />
    </header>
    <div>
      <h1>
        {t("auth.title1")}
        <br />
        {t("auth.title2")}
      </h1>
      <p>{t("auth.lead")}</p>
      <div class={styles.authPrinciple}>
        <ShieldCheck size={23}></ShieldCheck>
        <span>
          {t("auth.principle1")}
          <br />
          {t("auth.principle2")}
        </span>
      </div>
    </div>
    <a href={resolve("/")}>
      <ArrowLeft size={16}></ArrowLeft>
      {t("auth.back")}
    </a>
  </div>
  <div class={styles.authForm}>
    <h2>
      {register ? t("auth.createTitle") : t("auth.welcomeTitle")}
    </h2>
    <p>
      {register ? t("auth.createLead") : t("auth.signInLead")}
    </p>
    {#if error}<p class={styles.error} role="alert">
        {error}
      </p>{/if}
    <form onsubmit={submit}>
      {#if register}<label>
          {t("auth.name")}
          <input name="name" autocomplete="name" required maxlength={100} />
        </label>{/if}
      <label>
        {t("auth.email")}
        <input name="email" type="email" autocomplete="email" required />
      </label>
      <label>
        {t("auth.password")}
        <input
          name="password"
          type={passwordVisible ? "text" : "password"}
          minLength={10}
          maxlength={128}
          autocomplete={register ? "new-password" : "current-password"}
          required
        />
        {#if register}<small>{t("auth.passwordHint")}</small>{/if}
      </label>
      <button
        type="button"
        class={styles.textButton}
        aria-pressed={passwordVisible}
        onclick={() => (passwordVisible = !passwordVisible)}
        >{passwordVisible
          ? t("auth.hidePassword")
          : t("auth.showPassword")}</button
      >
      <button class={styles.primary} disabled={busy}>
        {busy
          ? t("auth.opening")
          : register
            ? t("auth.createAccount")
            : t("common.signIn")}
        <ArrowRight size={17}></ArrowRight>
      </button>
    </form>
    {#if busy}<Skeleton
        variant="compact"
        label={t("common.openingWorkspace")}
      />{/if}
    <button
      class={styles.textButton}
      disabled={busy}
      onclick={() => {
        register = !register;
        setError("");
      }}
    >
      {register ? t("auth.haveAccount") : t("auth.newAccount")}
    </button>
    {#if caps?.demo_available}<div class={styles.demoEntry}>
        <span class={styles.authOr}>{t("auth.or")}</span>
        <button
          class={styles.demoCard}
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
          <span class={styles.demoPlay}><Play size={15}></Play></span>
          <span>
            <strong>{t("auth.openSynthetic")}</strong>
            <small>{t("auth.demoCase")}</small>
          </span>
          <ArrowRight size={16}></ArrowRight>
        </button>
      </div>{/if}
  </div>
</div>
