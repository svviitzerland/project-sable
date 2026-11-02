import type { LayoutServerLoad } from "./$types";
import { getRuntime } from "../lib/server/app-runtime";
import { COOKIE, authenticate } from "../lib/server/runtime";

/** Language and whether the visitor has a live session, so public pages render the right nav. */
export const load: LayoutServerLoad = async ({ locals, cookies, request }) => {
  let signedIn = false;
  if (cookies.get(COOKIE)) {
    try {
      await authenticate(await getRuntime(), request);
      signedIn = true;
    } catch {
      signedIn = false;
    }
  }
  return { lang: locals.lang, signedIn };
};
