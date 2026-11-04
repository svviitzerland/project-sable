<script lang="ts">
  import { ArrowRight, Pause, Play } from "@lucide/svelte";
  import { onMount } from "svelte";
  import Avatar from "../components/Avatar.svelte";
  import { t } from "../lib/i18n";
  import { prefs } from "../lib/prefs.svelte";
  import { go } from "../lib/router.svelte";

  /**
   * A livelier landing page proposal: the hero headline rises word by word over a moving
   * forest light, a small live demo plays the product's core moment on loop, and "how it
   * works" plays out as you scroll. Everything is transform/opacity motion, pauses offscreen,
   * has a pause control, and settles into a complete static page with reduced motion.
   */
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let paused = $state(reduced);
  let scrolled = $state(false);
  let hero: HTMLElement | undefined = $state();
  let device: HTMLElement | undefined = $state();
  let visible = $state(true);
  let activeStep = $state(0);
  let width = $state(1200);

  // Hero demo: a question, an answer, then the finding that matters arrives with both quotes.
  const lines = [
    { who: "pu", text: "Pada 14 Maret, jam berapa Saudara tiba di gudang?" },
    { who: "rina", text: "Saya sampai di gudang jam setengah sepuluh malam, Pak." },
  ];
  let demo = $state({ who: "pu", typed: "", card: false, drawn: false, done: false });
  let token = 0;

  async function runDemo() {
    const mine = ++token;
    const wait = async (ms: number) => {
      let left = ms;
      while (left > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (mine !== token) throw new Error("stopped");
        if (!paused && visible && !document.hidden) left -= 100;
      }
    };
    try {
      for (;;) {
        demo.card = false;
        demo.drawn = false;
        demo.done = false;
        for (const line of lines) {
          demo.who = line.who;
          demo.typed = "";
          const words = line.text.split(" ");
          for (let i = 1; i <= words.length; i++) {
            demo.typed = words.slice(0, i).join(" ");
            await wait(150);
          }
          await wait(800);
        }
        demo.card = true;
        await wait(650);
        demo.drawn = true;
        await wait(2600);
        demo.done = true;
        await wait(2400);
      }
    } catch {
      /* Stopped: the component is gone or the loop restarted. */
    }
  }

  onMount(() => {
    const onScroll = () => (scrolled = window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (reduced) {
      Object.assign(demo, { who: "rina", typed: lines[1].text, card: true, drawn: true, done: false });
    } else {
      void runDemo();
    }
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0.1 });
    if (device) io.observe(device);
    return () => {
      token += 1;
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  });

  const speakingNow = $derived(!demo.card && demo.typed.length > 0 && demo.typed !== lines.find((x) => x.who === demo.who)?.text);

  function spotlight(event: PointerEvent) {
    if (!hero || reduced) return;
    const box = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", `${event.clientX - box.left}px`);
    hero.style.setProperty("--my", `${event.clientY - box.top}px`);
  }

  /** Fades and lifts an element in once it scrolls into view. */
  function reveal(node: HTMLElement, delay = 0) {
    node.style.setProperty("--delay", `${delay}ms`);
    node.classList.add("lp-reveal");
    if (reduced) {
      node.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  /** Buttons lean gently toward the pointer. */
  function magnetic(node: HTMLElement) {
    if (reduced) return;
    const move = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const x = event.clientX - box.left - box.width / 2;
      const y = event.clientY - box.top - box.height / 2;
      node.style.transform = `translate(${x * 0.16}px, ${y * 0.22}px)`;
    };
    const leave = () => (node.style.transform = "");
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);
    return {
      destroy() {
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerleave", leave);
      },
    };
  }

  /** Cards tilt toward the pointer like a physical object. */
  function tilt(node: HTMLElement) {
    if (reduced) return;
    const move = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      node.style.transform = `perspective(900px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-4px)`;
      node.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
      node.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
    };
    const leave = () => (node.style.transform = "");
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);
    return {
      destroy() {
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerleave", leave);
      },
    };
  }

  /** Marks the "how it works" step that sits in the middle of the screen. */
  function step(node: HTMLElement, index: number) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) activeStep = index;
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  const words = (text: string) => text.split(" ");

  const marquee = $derived([t("lp.m1"), t("lp.m2"), t("lp.m3"), t("lp.m4"), t("lp.m5"), t("lp.m6"), t("lp.m7")]);
  const steps = $derived([
    { n: "01", title: t("lp.s1.title"), text: t("lp.s1.text") },
    { n: "02", title: t("lp.s2.title"), text: t("lp.s2.text") },
    { n: "03", title: t("lp.s3.title"), text: t("lp.s3.text") },
  ]);
  const quiet = [
    "Saya satpam di Gudang B, sejak awal tahun 2024.",
    "Pak Yusuf, satpam shift sore. Dia pulang setelah saya datang.",
    "Ada truk boks putih keluar lewat gerbang timur, menjelang tengah malam.",
    "Saya tidak melihat siapa yang mengemudikan, lampunya mati.",
    "Tidak, Pak. Saya tidak melihat Pak Budi malam itu.",
  ];
</script>

<svelte:window bind:innerWidth={width} />

{#snippet scene(kind: number, active: boolean)}
  <div class="scene" class:active aria-hidden="true">
    {#if kind === 0}
      <div class="scene-stage">
        {#each ["hk", "pu", "rina", "ph"] as id, i (id)}
          <span class="cycler" style:--i={i}><Avatar {id} size="md" /></span>
        {/each}
      </div>
      <div class="scene-lines">
        <p style:--i="0"><b>Penuntut Umum</b> Saudara saksi bekerja di mana dan sejak kapan?</p>
        <p style:--i="1"><b>Saksi Rina Hartati</b> Saya satpam di Gudang B, sejak awal tahun 2024.</p>
        <p style:--i="2"><b>Hakim Ketua</b> Lanjutkan, Saudara Penuntut Umum.</p>
      </div>
    {:else if kind === 1}
      <div class="connect">
        <div class="c-card said"><span class="c-label">Sidang 2 · 00:14:32</span>“Saya sampai di gudang <mark>jam setengah sepuluh malam</mark>, Pak.”</div>
        <svg class="c-wires" viewBox="0 0 120 200" preserveAspectRatio="none">
          <path d="M0,100 C60,100 60,40 120,40" />
          <path d="M0,100 C60,100 60,160 120,160" />
        </svg>
        <div class="c-right">
          <div class="c-card src"><span class="c-label">BAP Saksi Rina · hal. 4</span>“…tiba di gudang <mark>sedikit setelah pukul 20.00 WIB</mark>…”</div>
          <div class="c-card src"><span class="c-label">Log akses · hal. 7</span>“…tercatat masuk <mark>pukul 20:07:41</mark>.”</div>
        </div>
      </div>
    {:else}
      <div class="examine">
        {#each quiet.slice(0, 2) as line, i (i)}<p class="q" style:--i={i}>✓ {line}</p>{/each}
        <div class="e-card">
          <span class="e-pill">! {t("status.potential_inconsistency")}</span>
          <strong>Jam kedatangan saksi berbeda dengan BAP dan log akses.</strong>
          <span class="e-ask">“Apakah itu saat Saudara tap kartu di gerbang, atau saat mulai berjaga?”</span>
          <span class="e-btn">✓ {t("attn.done")}</span>
        </div>
        {#each quiet.slice(2, 4) as line, i (i)}<p class="q" style:--i={i + 2}>✓ {line}</p>{/each}
      </div>
    {/if}
  </div>
{/snippet}

<div class="landing" class:paused>
  <header class="nav" class:scrolled>
    <a class="logo" href="#/">jude.</a>
    <nav class="links" aria-label={t("lp.nav.label")}>
      <button onclick={() => scrollTo("how")}>{t("lp.nav.how")}</button>
      <button onclick={() => scrollTo("signal")}>{t("lp.nav.signal")}</button>
      <button onclick={() => scrollTo("approach")}>{t("lp.nav.approach")}</button>
    </nav>
    <div class="nav-end">
      <div class="lang" role="group" aria-label={t("mk.language")}>
        <button aria-pressed={prefs.lang === "id"} onclick={() => (prefs.lang = "id")}>ID</button>
        <button aria-pressed={prefs.lang === "en"} onclick={() => (prefs.lang = "en")}>EN</button>
      </div>
      <button class="nav-cta" use:magnetic onclick={() => go("/cases")}>{t("lp.open")}<ArrowRight size={16} /></button>
    </div>
  </header>

  <section class="hero" bind:this={hero} onpointermove={spotlight} role="presentation">
    <div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="grain" aria-hidden="true"></div>
    <div class="hero-inner">
      <div class="hero-copy">
        <h1>
          {#key prefs.lang}
            <span class="line">{#each words(t("lp.title1")) as w, i (i)}<span class="word" style:--i={i}>{w}&nbsp;</span>{/each}</span>
            <span class="line">{#each words(t("lp.title2")) as w, i (i)}<span class="word" style:--i={i + 4}>{w}&nbsp;</span>{/each}</span>
          {/key}
        </h1>
        <p class="lead" use:reveal={500}>{t("lp.lead")}</p>
        <div class="ctas" use:reveal={700}>
          <button class="cta" use:magnetic onclick={() => go("/case/c1")}><span>{t("lp.demo")}</span><ArrowRight size={18} /></button>
          <button class="ghost" onclick={() => scrollTo("how")}>{t("lp.how")}</button>
        </div>
      </div>

      <div class="device-wrap" use:reveal={300}>
        <div class="device" bind:this={device}>
          <span class="sr-only">{t("lp.sample")}: {lines[1].text}</span>
          <div class="device-bar">
            <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="device-title" aria-hidden="true">Sidang 2 · Pemeriksaan saksi</span>
            <span class="device-rec" aria-hidden="true"><span class="live-dot"></span>REC</span>
            {#if !reduced}
              <button class="pause-demo" onclick={() => (paused = !paused)} aria-label={paused ? t("lp.play") : t("lp.pause")}>
                {#if paused}<Play size={12} />{:else}<Pause size={12} />{/if}
              </button>
            {/if}
          </div>
          <div class="device-stage" aria-hidden="true">
            {#each ["hk", "pu", "rina", "ph"] as id (id)}
              <span class="d-seat" class:on={demo.who === id && !demo.card}>
                <Avatar {id} size="md" speaking={speakingNow && demo.who === id} dim={!!demo.typed && demo.who !== id && !demo.card} />
              </span>
            {/each}
          </div>
          <div class="device-log" aria-hidden="true">
            <p class="device-quiet"><b>Saksi Rina Hartati</b>Saya satpam di Gudang B, sejak awal tahun 2024.<span>✓</span></p>
            <p class="device-quiet"><b>Saksi Rina Hartati</b>Pak Yusuf, satpam shift sore. Dia pulang setelah saya datang.<span>✓</span></p>
            <div class="device-line">
              <Avatar id={demo.who} size="sm" />
              <p><b>{demo.who === "pu" ? "Penuntut Umum" : "Saksi Rina Hartati"}</b>{demo.typed}<span class="caret"></span></p>
            </div>
            <div class="card-wrap" class:show={demo.card}>
              <div class="card-inner">
                <div class="device-card" class:show={demo.card} class:done={demo.done}>
                  <span class="d-pill">! {t("status.potential_inconsistency")}</span>
                  <div class="d-compare">
                    <div class="d-quote"><span>{t("attn.said")}</span>“…di gudang <mark>jam setengah sepuluh malam</mark>”</div>
                    <svg class="d-wire" class:drawn={demo.drawn} viewBox="0 0 40 20" preserveAspectRatio="none"><path d="M0,10 C15,0 25,20 40,10" /></svg>
                    <div class="d-quote"><span>Log akses · hal. 7</span>“…masuk <mark>pukul 20:07:41</mark>”</div>
                  </div>
                  <span class="d-ask">{t("attn.ask")}: “Apakah itu saat Saudara tap kartu di gerbang?”</span>
                  <span class="d-check">{demo.done ? `✓ ${t("attn.done")}` : t("attn.done")}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="device-foot" aria-hidden="true">{t("lp.sample")}</div>
        </div>
      </div>
    </div>
  </section>

  <div class="marquee" aria-label={t("lp.sourceTitle")}>
    <div class="track">
      {#each [0, 1] as copy (copy)}
        <div class="run" aria-hidden={copy === 1}>
          {#each marquee as item (item)}<span>{item}</span><span class="sep">✦</span>{/each}
        </div>
      {/each}
    </div>
  </div>

  <section class="how" id="how">
    <div class="how-head" use:reveal>
      <h2>{t("lp.howTitle1")}<br /><em>{t("lp.howTitle2")}</em></h2>
      <p>{t("lp.howLead")}</p>
    </div>
    <div class="how-body">
      <ol class="steps">
        {#each steps as s, i (s.n)}
          <li class="step" class:active={activeStep === i} use:step={i}>
            <span class="step-n">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            {#if width < 900}<div class="inline-scene">{@render scene(i, activeStep === i)}</div>{/if}
          </li>
        {/each}
      </ol>
      {#if width >= 900}
        <div class="sticky">
          <div class="frame">
            <div class="frame-bar"><span class="dots"><i></i><i></i><i></i></span><span>{steps[activeStep].title}</span></div>
            {#each [0, 1, 2] as k (k)}
              <div class="frame-scene" class:show={activeStep === k}>{@render scene(k, activeStep === k)}</div>
            {/each}
          </div>
          <div class="progress" aria-hidden="true">{#each steps as s, i (s.n)}<span class:on={activeStep >= i}></span>{/each}</div>
        </div>
      {/if}
    </div>
  </section>

  <section class="signal" id="signal">
    <div class="signal-copy" use:reveal>
      <h2>{t("lp.signalTitle")}</h2>
      <p>{t("lp.signalLead")}</p>
    </div>
    <div class="feed" use:reveal={150}>
      {#each quiet.slice(0, 2) as line, i (i)}<p class="feed-q" style:--i={i}>{line}<span>✓</span></p>{/each}
      <div class="feed-hit">
        <span class="feed-pill">!</span>
        <div>
          <p>Saya sampai di gudang <mark>jam setengah sepuluh malam</mark>, Pak.</p>
          <span>{t("status.potential_inconsistency")} · Log akses: <mark>pukul 20:07:41</mark></span>
        </div>
      </div>
      {#each quiet.slice(2) as line, i (i)}<p class="feed-q" style:--i={i + 2}>{line}<span>✓</span></p>{/each}
    </div>
  </section>

  <section class="approach" id="approach">
    <div class="approach-head" use:reveal>
      <h2>{t("lp.approachTitle1")}<br /><em>{t("lp.approachTitle2")}</em></h2>
      <p>{t("lp.approachLead")}</p>
    </div>
    <div class="principles">
      {#each [["01", t("lp.p1.title"), t("lp.p1.text")], ["02", t("lp.p2.title"), t("lp.p2.text")], ["03", t("lp.p3.title"), t("lp.p3.text")]] as p, i (p[0])}
        <article class="principle" use:tilt use:reveal={i * 120}>
          <span class="p-n">{p[0]}</span>
          <h3>{p[1]}</h3>
          <p>{p[2]}</p>
        </article>
      {/each}
    </div>
  </section>

  <section class="closing">
    <div class="aurora small" aria-hidden="true"><span></span><span></span></div>
    <div class="closing-inner" use:reveal>
      <h2>{t("lp.closingTitle1")}<br /><em>{t("lp.closingTitle2")}</em></h2>
      <p>{t("lp.closingLead")}</p>
      <button class="cta shine" use:magnetic onclick={() => go("/case/c1")}><span>{t("lp.demo")}</span><ArrowRight size={18} /></button>
      <span class="note">{t("lp.note")}</span>
    </div>
  </section>

  <footer class="footer">
    <span class="logo">jude.</span>
    <span>{t("lp.tagline")}</span>
    <span class="muted">{t("lp.concept")}</span>
    <p class="footnote">{t("lp.footerNote")}</p>
  </footer>
</div>

<style>
  .landing {
    --forest: #10281e;
    --forest-2: #183b2d;
    --cream: #f6f0e4;
    --amber: #e3a95c;
    background: var(--bg);
    color: var(--ink);
    overflow-x: clip;
  }
  /* Navigation */
  .nav {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 18px clamp(16px, 4vw, 56px);
    color: var(--cream);
    transition: background-color 0.35s, padding 0.35s, color 0.35s, box-shadow 0.35s;
  }
  .nav.scrolled {
    padding-block: 10px;
    background: color-mix(in srgb, var(--forest) 82%, transparent);
    backdrop-filter: blur(14px) saturate(1.2);
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.18);
  }
  .logo {
    font-family: var(--font-title);
    font-size: 34px;
    line-height: 1;
    color: inherit;
    text-decoration: none;
  }
  .links {
    display: flex;
    gap: clamp(14px, 2.5vw, 34px);
    margin-left: auto;
  }
  .links button {
    color: inherit;
    font-size: 14px;
    opacity: 0.85;
    position: relative;
    padding: 6px 0;
  }
  .links button::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: currentColor;
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .links button:hover::after {
    transform: scaleX(1);
    transform-origin: left;
  }
  .nav-end {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .lang {
    display: flex;
    border: 1px solid color-mix(in srgb, var(--cream) 35%, transparent);
    border-radius: 999px;
    padding: 2px;
  }
  .lang button {
    color: inherit;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    opacity: 0.7;
  }
  .lang button[aria-pressed="true"] {
    background: var(--cream);
    color: var(--forest);
    opacity: 1;
  }
  .nav-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--cream) 50%, transparent);
    color: inherit;
    font-size: 14px;
    font-weight: 600;
    transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.25s, color 0.25s;
  }
  .nav-cta:hover {
    background: var(--cream);
    color: var(--forest);
  }
  @media (max-width: 860px) {
    .links {
      display: none;
    }
    .nav-end {
      margin-left: auto;
    }
  }
  @media (max-width: 520px) {
    .nav-cta {
      display: none;
    }
  }

  /* Hero */
  .hero {
    --mx: 70%;
    --my: 30%;
    position: relative;
    min-height: 100svh;
    display: flex;
    align-items: center;
    padding: 120px clamp(16px, 5vw, 72px) 70px;
    background: radial-gradient(700px circle at var(--mx) var(--my), rgb(246 228 190 / 0.1), transparent 45%), linear-gradient(160deg, #0d2219 0%, var(--forest) 45%, #1b4433 100%);
    color: var(--cream);
    overflow: hidden;
    isolation: isolate;
  }
  .aurora {
    position: absolute;
    inset: -20%;
    z-index: -1;
    filter: blur(60px);
    opacity: 0.75;
    pointer-events: none;
  }
  .aurora span {
    position: absolute;
    width: 46vmax;
    height: 46vmax;
    border-radius: 50%;
    mix-blend-mode: screen;
    animation: drift 22s ease-in-out infinite alternate;
  }
  .aurora span:nth-child(1) {
    left: 5%;
    top: 10%;
    background: radial-gradient(circle, rgb(47 110 76 / 0.75), transparent 65%);
  }
  .aurora span:nth-child(2) {
    right: 0;
    top: 30%;
    background: radial-gradient(circle, rgb(196 140 60 / 0.35), transparent 65%);
    animation-duration: 28s;
    animation-direction: alternate-reverse;
  }
  .aurora span:nth-child(3) {
    left: 35%;
    bottom: -10%;
    background: radial-gradient(circle, rgb(80 140 120 / 0.45), transparent 65%);
    animation-duration: 34s;
  }
  @keyframes drift {
    0% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(6vw, -4vh, 0) scale(1.12); }
    100% { transform: translate3d(-5vw, 5vh, 0) scale(0.94); }
  }
  .grain {
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0.09;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .hero-inner {
    width: 100%;
    max-width: 1320px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: clamp(28px, 5vw, 80px);
    align-items: center;
  }
  @media (max-width: 960px) {
    .hero-inner {
      grid-template-columns: 1fr;
    }
  }
  h1 {
    font-family: var(--font-title);
    font-weight: 400;
    font-size: clamp(46px, 6.4vw, 96px);
    line-height: 0.98;
    letter-spacing: -0.03em;
  }
  .line {
    display: block;
    overflow: hidden;
    padding-bottom: 0.08em;
  }
  .line:nth-child(2) {
    color: #e9d3a8;
    font-style: italic;
  }
  .word {
    display: inline-block;
    transform: translateY(105%) rotate(4deg);
    opacity: 0;
    filter: blur(6px);
    animation: rise 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: calc(var(--i) * 75ms + 150ms);
  }
  @keyframes rise {
    to {
      transform: none;
      opacity: 1;
      filter: blur(0);
    }
  }
  .lead {
    margin-top: 26px;
    max-width: 34ch;
    font-size: clamp(18px, 1.6vw, 23px);
    line-height: 1.45;
    color: color-mix(in srgb, var(--cream) 82%, transparent);
  }
  .ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 34px;
  }
  .cta {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 14px;
    padding: 16px 28px;
    border-radius: 999px;
    background: var(--cream);
    color: var(--forest);
    font-family: var(--font-serif);
    font-size: 21px;
    transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s;
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.25);
  }
  .cta:hover {
    box-shadow: 0 16px 50px rgb(233 211 168 / 0.35);
  }
  .cta :global(svg) {
    transition: transform 0.25s;
  }
  .cta:hover :global(svg) {
    transform: translateX(4px);
  }
  .ghost {
    padding: 16px 22px;
    border-radius: 999px;
    color: var(--cream);
    font-size: 16px;
    border: 1px solid color-mix(in srgb, var(--cream) 30%, transparent);
    transition: background-color 0.25s;
  }
  .ghost:hover {
    background: color-mix(in srgb, var(--cream) 10%, transparent);
  }

  /* Hero device */
  .device-wrap {
    position: relative;
  }
  .device {
    position: relative;
    display: grid;
    gap: 14px;
    padding: 16px;
    border-radius: 20px;
    background: rgb(250 247 240 / 0.96);
    color: #1d2f25;
    box-shadow: 0 40px 90px rgb(0 0 0 / 0.45), 0 0 0 1px rgb(255 255 255 / 0.12) inset;
    transform: perspective(1400px) rotateY(-6deg) rotateX(3deg);
    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .device-wrap:hover .device {
    transform: perspective(1400px) rotateY(-2deg) rotateX(1deg);
  }
  .device-bar,
  .frame-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    font-weight: 600;
    color: #65705f;
  }
  .dots {
    display: flex;
    gap: 5px;
  }
  .dots i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #d8d3c4;
  }
  .device-title {
    flex: 1;
  }
  .device-rec {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #b4472f;
    font-weight: 800;
  }
  .device-stage {
    display: flex;
    justify-content: space-around;
    padding: 22px 8px 12px;
    border-radius: 12px;
    background: linear-gradient(180deg, #f1ede2, #e9e4d6);
  }
  .d-seat {
    transition: transform 0.35s;
  }
  .d-seat.on {
    transform: translateY(-4px);
  }
  .device-log {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 8px;
    height: 300px;
    overflow: hidden;
    mask-image: linear-gradient(180deg, transparent 0, #000 36px);
  }
  .device-quiet {
    display: flex;
    gap: 8px;
    align-items: baseline;
    flex-shrink: 0;
    padding: 8px 12px;
    border-radius: 10px;
    background: #f1ede2;
    color: #7a7f73;
    font-size: 12.5px;
    line-height: 1.4;
  }
  .device-quiet b {
    flex-shrink: 0;
    font-size: 11px;
    color: #a8731c;
  }
  .device-quiet span {
    margin-left: auto;
    color: #5f8a69;
    font-weight: 700;
  }
  .card-wrap {
    display: grid;
    grid-template-rows: 0fr;
    flex-shrink: 0;
    transition: grid-template-rows 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .card-wrap.show {
    grid-template-rows: 1fr;
  }
  .card-inner {
    min-height: 0;
    overflow: hidden;
    padding: 0 4px 6px;
  }
  .device-line {
    display: flex;
    flex-shrink: 0;
    gap: 10px;
    align-items: flex-start;
    min-height: 64px;
    padding: 12px 14px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid #e3e0d4;
  }
  .device-line p {
    font-size: 15px;
    line-height: 1.45;
    color: #173a2c;
  }
  .device-line b {
    display: block;
    font-size: 12px;
    color: #a8731c;
  }
  .caret {
    display: inline-block;
    width: 2px;
    height: 1em;
    margin-left: 2px;
    background: #173a2c;
    vertical-align: -2px;
    animation: blink 1s steps(2) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  .device-card {
    display: grid;
    gap: 10px;
    padding: 14px;
    border-radius: 14px;
    background: linear-gradient(180deg, #fbe7d6, #fffaf3 60%);
    border: 1px solid #ecc49f;
    border-top: 4px solid #c4622d;
    opacity: 0;
    transform: translateY(18px) scale(0.97);
    transition: opacity 0.5s, transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.6s;
  }
  .device-card.show {
    opacity: 1;
    transform: none;
    box-shadow: 0 0 0 6px rgb(196 98 45 / 0.12), 0 18px 40px rgb(196 98 45 / 0.18);
  }
  .device-card.done {
    border-top-color: #9fb3a3;
    box-shadow: none;
  }
  .d-pill {
    justify-self: start;
    padding: 3px 10px;
    border-radius: 999px;
    background: #c4622d;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }
  .d-compare {
    display: grid;
    grid-template-columns: 1fr 34px 1fr;
    align-items: center;
    gap: 6px;
  }
  .d-quote {
    display: grid;
    gap: 4px;
    padding: 8px 10px;
    border-radius: 8px;
    background: #fff;
    border: 1px solid #ead7c4;
    font-size: 13px;
    line-height: 1.4;
  }
  .d-quote span {
    font-size: 10.5px;
    font-weight: 700;
    color: #7a6a58;
  }
  .d-quote :global(mark),
  .c-card :global(mark),
  .feed :global(mark) {
    background: rgb(196 98 45 / 0.18);
    box-shadow: inset 0 -2px 0 #c4622d;
    color: inherit;
  }
  .d-wire {
    width: 34px;
    height: 20px;
    overflow: visible;
  }
  .d-wire path {
    fill: none;
    stroke: #c4622d;
    stroke-width: 2.5;
    stroke-dasharray: 60;
    stroke-dashoffset: 60;
    transition: stroke-dashoffset 0.9s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .d-wire.drawn path {
    stroke-dashoffset: 0;
  }
  .d-ask {
    font-family: var(--font-serif);
    font-size: 15px;
    color: #173a2c;
  }
  .d-check {
    justify-self: end;
    padding: 6px 14px;
    border-radius: 7px;
    background: #173a2c;
    color: #f6f0e4;
    font-size: 12.5px;
    font-weight: 600;
    transition: background-color 0.3s;
  }
  .done .d-check {
    background: #5f8a69;
  }
  .device-foot {
    font-size: 11px;
    color: #7c8174;
    text-align: right;
  }
  .pause-demo {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid #d8d3c4;
    color: #65705f;
  }
  .pause-demo:hover {
    background: #ece8dc;
  }

  /* Marquee */
  .marquee {
    overflow: hidden;
    background: var(--forest-2);
    color: var(--cream);
    padding: 18px 0;
    border-block: 1px solid rgb(255 255 255 / 0.08);
  }
  .track {
    display: flex;
    width: max-content;
    animation: slide 38s linear infinite;
  }
  .marquee:hover .track,
  .paused .track {
    animation-play-state: paused;
  }
  .run {
    display: flex;
    align-items: center;
    gap: 28px;
    padding-right: 28px;
    font-family: var(--font-serif);
    font-size: clamp(20px, 2vw, 28px);
    white-space: nowrap;
  }
  .sep {
    color: var(--amber);
    font-size: 14px;
  }
  @keyframes slide {
    to {
      transform: translateX(-50%);
    }
  }

  /* Reveal: classes are added by the reveal action, so they are global. */
  :global(.lp-reveal) {
    opacity: 0;
    transform: translateY(28px);
    filter: blur(4px);
    transition:
      opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) var(--delay, 0ms),
      transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) var(--delay, 0ms),
      filter 0.9s var(--delay, 0ms);
  }
  :global(.lp-reveal.in) {
    opacity: 1;
    transform: none;
    filter: none;
  }

  /* How it works */
  .how {
    padding: clamp(80px, 10vw, 140px) clamp(16px, 5vw, 72px);
    max-width: 1320px;
    margin: 0 auto;
  }
  .how-head,
  .approach-head {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 40px;
    align-items: end;
    margin-bottom: 60px;
  }
  @media (max-width: 860px) {
    .how-head,
    .approach-head {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }
  h2 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: clamp(38px, 4.6vw, 66px);
    line-height: 1.02;
    letter-spacing: -0.02em;
    color: var(--ink-strong);
  }
  h2 em {
    color: var(--focus);
  }
  .how-head p,
  .approach-head p,
  .signal-copy p {
    font-size: 17px;
    line-height: 1.6;
    color: var(--muted);
    max-width: 46ch;
  }
  .how-body {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: clamp(30px, 5vw, 80px);
  }
  @media (max-width: 899px) {
    .how-body {
      grid-template-columns: 1fr;
    }
  }
  .steps {
    display: grid;
    gap: 0;
  }
  .step {
    display: grid;
    gap: 10px;
    padding: 12vh 0;
    border-top: 1px solid var(--line);
    opacity: 0.35;
    transition: opacity 0.5s;
  }
  .step.active {
    opacity: 1;
  }
  @media (max-width: 899px) {
    .step {
      padding: 40px 0;
      opacity: 1;
    }
  }
  .step-n {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--focus);
  }
  .step h3 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: clamp(28px, 3vw, 40px);
    color: var(--ink-strong);
  }
  .step p {
    color: var(--muted);
    font-size: 16px;
    line-height: 1.65;
    max-width: 44ch;
  }
  .inline-scene {
    margin-top: 12px;
  }
  .sticky {
    position: sticky;
    top: 18vh;
    align-self: start;
    display: grid;
    gap: 16px;
  }
  .frame {
    position: relative;
    display: grid;
    gap: 12px;
    padding: 16px;
    min-height: 380px;
    border-radius: 20px;
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: 0 30px 80px rgb(20 40 30 / 0.12);
  }
  .frame-scene {
    grid-area: 2 / 1;
    opacity: 0;
    transform: translateY(16px) scale(0.98);
    transition: opacity 0.5s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }
  .frame-scene.show {
    opacity: 1;
    transform: none;
  }
  .progress {
    display: flex;
    gap: 6px;
  }
  .progress span {
    flex: 1;
    height: 3px;
    border-radius: 2px;
    background: var(--line);
    transition: background-color 0.4s;
  }
  .progress span.on {
    background: var(--ink-strong);
  }

  /* Scenes */
  .scene {
    display: grid;
    gap: 14px;
  }
  .scene-stage {
    display: flex;
    justify-content: space-around;
    padding: 24px 8px 14px;
    border-radius: 14px;
    background: var(--surface-2);
    border: 1px solid var(--line);
  }
  .cycler :global(.avatar) {
    animation: cycle 6s infinite;
    animation-delay: calc(var(--i) * 1.5s);
    animation-play-state: paused;
  }
  .active .cycler :global(.avatar) {
    animation-play-state: running;
  }
  .paused .cycler :global(.avatar) {
    animation-play-state: paused;
  }
  @keyframes cycle {
    0%, 25% { transform: scale(1.12); box-shadow: 0 0 0 4px var(--tone), 0 0 26px var(--tone); }
    30%, 100% { transform: none; box-shadow: 0 0 0 2px color-mix(in srgb, var(--tone) 35%, transparent); }
  }
  .scene-lines {
    display: grid;
    gap: 8px;
  }
  .scene-lines p {
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--surface-2);
    font-size: 14px;
    color: var(--ink-strong);
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.5s, transform 0.5s;
    transition-delay: calc(var(--i) * 260ms + 200ms);
  }
  .scene-lines b {
    display: block;
    font-size: 11.5px;
    color: var(--muted);
  }
  .active .scene-lines p {
    opacity: 1;
    transform: none;
  }
  .connect {
    display: grid;
    grid-template-columns: 1fr 70px 1fr;
    align-items: center;
    min-height: 260px;
  }
  .c-right {
    display: grid;
    gap: 40px;
  }
  .c-card {
    display: grid;
    gap: 6px;
    padding: 12px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    font-size: 13.5px;
    line-height: 1.45;
    color: var(--ink-strong);
    opacity: 0.3;
    transition: opacity 0.6s 0.2s;
  }
  .c-card.said {
    border-left: 4px solid var(--role-witness);
  }
  .active .c-card {
    opacity: 1;
  }
  .c-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
  }
  .c-wires {
    width: 100%;
    height: 200px;
    overflow: visible;
  }
  .c-wires path {
    fill: none;
    stroke: var(--rel-conflicts);
    stroke-width: 2.5;
    stroke-dasharray: 220;
    stroke-dashoffset: 220;
    transition: stroke-dashoffset 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s;
    vector-effect: non-scaling-stroke;
  }
  .c-wires path:nth-child(2) {
    transition-delay: 0.8s;
  }
  .active .c-wires path {
    stroke-dashoffset: 0;
  }
  .examine {
    display: grid;
    gap: 8px;
  }
  .q {
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 13px;
    color: var(--muted);
    background: var(--surface-2);
    transition: opacity 0.6s;
    transition-delay: calc(var(--i) * 120ms);
  }
  .active .q {
    opacity: 0.45;
  }
  .e-card {
    display: grid;
    gap: 8px;
    padding: 14px;
    border-radius: 14px;
    background: linear-gradient(180deg, var(--alert-soft), var(--surface) 70%);
    border: 1px solid color-mix(in srgb, var(--alert) 45%, var(--line));
    border-top: 4px solid var(--alert);
    transform: scale(0.96);
    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s, box-shadow 0.6s 0.3s;
  }
  .active .e-card {
    transform: scale(1.02);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--alert) 14%, transparent), 0 18px 40px color-mix(in srgb, var(--alert) 18%, transparent);
  }
  .e-pill {
    justify-self: start;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--alert);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }
  .e-card strong {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 19px;
    color: var(--ink-strong);
  }
  .e-ask {
    font-size: 13.5px;
    color: var(--ink);
  }
  .e-btn {
    justify-self: end;
    padding: 6px 14px;
    border-radius: 7px;
    background: var(--primary);
    color: var(--primary-ink);
    font-size: 12.5px;
    font-weight: 600;
  }

  /* Signal */
  .signal {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: clamp(30px, 6vw, 90px);
    align-items: center;
    padding: clamp(70px, 9vw, 130px) clamp(16px, 5vw, 72px);
    max-width: 1320px;
    margin: 0 auto;
  }
  @media (max-width: 899px) {
    .signal {
      grid-template-columns: 1fr;
    }
  }
  .signal-copy {
    display: grid;
    gap: 18px;
  }
  .feed {
    display: grid;
    gap: 8px;
  }
  .feed-q {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--line);
    color: var(--muted);
    font-size: 14px;
    opacity: 0.55;
  }
  .feed-q span {
    color: var(--st-supported-dot);
    font-weight: 700;
  }
  .feed-hit {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 18px;
    border-radius: 16px;
    background: linear-gradient(180deg, var(--alert-soft), var(--surface) 80%);
    border: 1px solid color-mix(in srgb, var(--alert) 45%, var(--line));
    transform: scale(1.04);
    box-shadow: 0 24px 60px color-mix(in srgb, var(--alert) 18%, transparent);
    animation: hit-glow 3.2s ease-in-out infinite;
  }
  .paused .feed-hit {
    animation-play-state: paused;
  }
  @keyframes hit-glow {
    0%, 100% { box-shadow: 0 24px 60px color-mix(in srgb, var(--alert) 14%, transparent), 0 0 0 0 color-mix(in srgb, var(--alert) 0%, transparent); }
    50% { box-shadow: 0 24px 60px color-mix(in srgb, var(--alert) 22%, transparent), 0 0 0 8px color-mix(in srgb, var(--alert) 12%, transparent); }
  }
  .feed-pill {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--alert);
    color: #fff;
    font-weight: 800;
  }
  .feed-hit p {
    font-family: var(--font-serif);
    font-size: 21px;
    line-height: 1.3;
    color: var(--ink-strong);
  }
  .feed-hit span {
    display: block;
    margin-top: 6px;
    font-size: 13px;
    color: var(--ink);
  }

  /* Approach */
  .approach {
    padding: clamp(70px, 9vw, 130px) clamp(16px, 5vw, 72px);
    max-width: 1320px;
    margin: 0 auto;
  }
  .principles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
  @media (max-width: 899px) {
    .principles {
      grid-template-columns: 1fr;
    }
  }
  .principle {
    --gx: 50%;
    --gy: 0%;
    position: relative;
    display: grid;
    gap: 12px;
    align-content: start;
    padding: 28px;
    border-radius: 20px;
    background: radial-gradient(400px circle at var(--gx) var(--gy), color-mix(in srgb, var(--amber) 14%, transparent), transparent 60%), var(--surface);
    border: 1px solid var(--line);
    transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.9s, filter 0.9s, box-shadow 0.35s;
    will-change: transform;
  }
  .principle:hover {
    box-shadow: 0 30px 60px rgb(20 40 30 / 0.12);
  }
  .p-n {
    font-family: var(--font-title);
    font-size: 44px;
    line-height: 1;
    color: var(--focus);
  }
  .principle h3 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 26px;
    color: var(--ink-strong);
  }
  .principle p {
    color: var(--muted);
    line-height: 1.6;
  }

  /* Closing */
  .closing {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    padding: clamp(90px, 12vw, 170px) clamp(16px, 5vw, 72px);
    background: linear-gradient(160deg, var(--forest) 0%, #1b4433 100%);
    color: var(--cream);
    text-align: center;
  }
  .aurora.small {
    opacity: 0.6;
  }
  .closing-inner {
    display: grid;
    justify-items: center;
    gap: 22px;
  }
  .closing h2 {
    color: var(--cream);
    font-size: clamp(42px, 5.6vw, 84px);
  }
  .closing h2 em {
    color: #e9d3a8;
  }
  .closing p {
    font-size: 19px;
    color: color-mix(in srgb, var(--cream) 80%, transparent);
  }
  .shine {
    overflow: hidden;
  }
  .shine::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(110deg, transparent 30%, rgb(255 255 255 / 0.55) 50%, transparent 70%);
    transform: translateX(-120%);
    animation: sheen 3.6s ease-in-out infinite;
  }
  .paused .shine::after {
    animation-play-state: paused;
  }
  @keyframes sheen {
    0%, 55% { transform: translateX(-120%); }
    80%, 100% { transform: translateX(120%); }
  }
  .note {
    font-size: 13px;
    color: color-mix(in srgb, var(--cream) 65%, transparent);
  }

  /* Footer */
  .footer {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 10px 24px;
    padding: 40px clamp(16px, 5vw, 72px) 120px;
    background: #0b1d15;
    color: color-mix(in srgb, var(--cream) 80%, transparent);
    font-size: 14px;
  }
  .footer .logo {
    font-size: 40px;
    color: var(--cream);
  }
  .footer .muted {
    color: color-mix(in srgb, var(--cream) 55%, transparent);
  }
  .footnote {
    flex-basis: 100%;
    font-size: 12px;
    color: color-mix(in srgb, var(--cream) 55%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    .aurora span,
    .track,
    .feed-hit,
    .shine::after,
    .cycler :global(.avatar),
    .caret {
      animation: none;
    }
    .word {
      animation: none;
      opacity: 1;
      transform: none;
      filter: none;
    }
    .device {
      transform: none;
    }
  }
</style>
