import type { Lang } from "./types";

export interface Prefs {
  lang: Lang;
  theme: "paper" | "night" | "system";
  density: "comfortable" | "compact";
  /** Simulated provider availability. */
  ai: boolean;
  pasal: boolean;
  transcribe: boolean;
  /** Design variants under discussion. */
  assistantMode: "docked" | "overlay";
  /** Show only findings that need a look, or every finding. */
  findingScope: "meaningful" | "all";
  liveText: number;
  liveSpeed: number;
  railCollapsed: boolean;
}

const KEY = "jude-mockup-prefs";

const defaults: Prefs = {
  lang: "id",
  theme: "paper",
  density: "comfortable",
  ai: true,
  pasal: true,
  transcribe: true,
  assistantMode: "docked",
  findingScope: "meaningful",
  liveText: 1,
  liveSpeed: 1,
  railCollapsed: false,
};

function load(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    // Ignore settings from earlier rounds of the mockup that no longer exist.
    const known = Object.fromEntries(Object.entries(saved).filter(([key]) => key in defaults));
    return { ...defaults, ...known };
  } catch {
    return { ...defaults };
  }
}

export const prefs = $state<Prefs>(load());

// Persist, and follow changes made in other frames (the responsive preview embeds the app).
$effect.root(() => {
  $effect(() => {
    const snapshot = JSON.stringify(prefs);
    try {
      localStorage.setItem(KEY, snapshot);
    } catch {
      /* Private mode: preferences last for this visit only. */
    }
  });
});

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY || !event.newValue) return;
    try {
      Object.assign(prefs, JSON.parse(event.newValue));
    } catch {
      /* Ignore malformed values. */
    }
  });
}
