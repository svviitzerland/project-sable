/**
 * Reactive current language for the UI. Components call `t()`/`tp()` in their
 * markup; because these read `state.lang`, a language switch re-renders them.
 *
 * Server rendering: the root layout calls `setLang(data.lang)` before any
 * child renders. Svelte's SSR render is synchronous, so one request's render
 * cannot interleave with another's and read the wrong language.
 */
import { browser } from "$app/env";
import {
  LANG_COOKIE,
  LANG_STORAGE_KEY,
  LOCALES,
  formatDate as formatDateFor,
  formatNumber as formatNumberFor,
  translate,
  translatePlural,
  type Lang,
  type MessageKey,
  type Params,
  type PluralKey,
} from "./core";

export * from "./core";

const state = $state<{ lang: Lang }>({ lang: "id" });

export const i18n = {
  get lang() {
    return state.lang;
  },
  get locale() {
    return LOCALES[state.lang];
  },
};

/** Switches the UI language; in the browser it also saves the preference. */
export function setLang(lang: Lang, persist = browser) {
  state.lang = lang;
  if (!persist || !browser) return;
  document.documentElement.lang = lang;
  document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Storage can be unavailable (private mode); the cookie still applies.
  }
}

export function t(key: MessageKey, params?: Params) {
  return translate(state.lang, key, params);
}

export function tp(key: PluralKey, count: number, params?: Params) {
  return translatePlural(state.lang, key, count, params);
}

export function formatDate(
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
) {
  return formatDateFor(state.lang, value, options);
}

export function formatNumber(value: number) {
  return formatNumberFor(state.lang, value);
}
