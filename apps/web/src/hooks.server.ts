import type { Handle } from "@sveltejs/kit/hooks";
import { LANG_COOKIE, detectLang } from "./lib/i18n/core";

/** Resolves the UI language once per request so the first paint is already localized. */
export const handle: Handle = async ({ event, resolve }) => {
  const lang = detectLang({
    cookie: event.cookies.get(LANG_COOKIE),
    acceptLanguage: event.request.headers.get("accept-language"),
  });
  event.locals.lang = lang;
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace("%jude.lang%", lang),
  });
};
