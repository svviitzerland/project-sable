/**
 * Framework-free i18n helpers shared by the server hook, the browser state
 * and the unit tests. No runes here so Node tests can import it directly.
 */
import { en, type MessageKey } from "./en";
import { id } from "./id";

export type { MessageKey, Messages } from "./en";
export type Lang = "id" | "en";
export type Params = Record<string, string | number>;

export const LANGS: readonly Lang[] = ["id", "en"];
export const LANG_COOKIE = "lang";
export const LANG_STORAGE_KEY = "jude.lang";
/** Indonesian lawyers are the primary audience, so no signal at all means Indonesian. */
export const DEFAULT_LANG: Lang = "id";
export const LOCALES: Record<Lang, string> = { id: "id-ID", en: "en-US" };
export const dictionaries = { id, en } as const;

export function isLang(value: unknown): value is Lang {
  return value === "id" || value === "en";
}

/** `id`, `id-ID` (and the legacy `in`) are Indonesian; any other tag is English. */
export function langFromTag(tag: string | null | undefined): Lang | null {
  const primary = tag?.trim().toLowerCase().split(/[-_]/)[0];
  if (!primary || primary === "*") return null;
  return primary === "id" || primary === "in" ? "id" : "en";
}

/** Picks the most preferred language range in an `Accept-Language` header. */
export function langFromAcceptLanguage(
  header: string | null | undefined,
): Lang | null {
  if (!header) return null;
  const ranges = header
    .split(",")
    .map((part, index) => {
      const [tag, ...rest] = part.trim().split(";");
      const q = rest
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { tag, weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((r) => r.tag && r.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const range of ranges) {
    const lang = langFromTag(range.tag);
    if (lang) return lang;
  }
  return null;
}

/**
 * Resolution order: saved cookie, saved localStorage value, the request's
 * `Accept-Language`, the browser's `navigator.language`, then Indonesian.
 */
export function detectLang(signals: {
  cookie?: string | null;
  stored?: string | null;
  acceptLanguage?: string | null;
  navigatorLanguage?: string | null;
}): Lang {
  if (isLang(signals.cookie)) return signals.cookie;
  if (isLang(signals.stored)) return signals.stored;
  return (
    langFromAcceptLanguage(signals.acceptLanguage) ??
    langFromTag(signals.navigatorLanguage) ??
    DEFAULT_LANG
  );
}

export function readCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  for (const part of (cookieHeader ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function interpolate(template: string, params?: Params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}

export function translate(lang: Lang, key: MessageKey, params?: Params) {
  return interpolate(dictionaries[lang][key] ?? en[key] ?? key, params);
}

/** Keys that come in `.one`/`.other` pairs, addressed by their shared base. */
export type PluralKey = {
  [K in MessageKey]: K extends `${infer Base}.one` ? Base : never;
}[MessageKey];

export function translatePlural(
  lang: Lang,
  key: PluralKey,
  count: number,
  params?: Params,
) {
  const form = new Intl.PluralRules(LOCALES[lang]).select(count);
  return translate(
    lang,
    `${key}.${form === "one" ? "one" : "other"}` as MessageKey,
    { count: formatNumber(lang, count), ...params },
  );
}

export function formatNumber(lang: Lang, value: number) {
  return new Intl.NumberFormat(LOCALES[lang]).format(value);
}

/**
 * Formats ISO timestamps and plain `YYYY-MM-DD` dates. Plain dates are read
 * as calendar dates so they never shift across time zones.
 */
export function formatDate(
  lang: Lang,
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  const plain =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = plain
    ? new Date(`${value}T00:00:00Z`)
    : value instanceof Date
      ? value
      : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(LOCALES[lang], {
    ...options,
    ...(plain ? { timeZone: "UTC" } : {}),
  }).format(date);
}
