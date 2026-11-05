/** Hash routing keeps the mockup a static site that works behind any tunnel or file server. */
export const route = $state({
  path: "/",
  parts: [] as string[],
  query: {} as Record<string, string>,
});

function sync() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, search = ""] = raw.split("?");
  route.path = path || "/";
  route.parts = route.path.split("/").filter(Boolean);
  route.query = Object.fromEntries(new URLSearchParams(search));
}

if (typeof window !== "undefined") {
  sync();
  window.addEventListener("hashchange", sync);
}

export function go(path: string) {
  if (location.hash.replace(/^#/, "") !== path) location.hash = path;
}

export const href = (path: string) => `#${path}`;

/** Swaps the current address for another, so old links land on their new page without a back step. */
export function redirect(path: string) {
  location.replace(`#${path}`);
}

/** The responsive preview embeds the app with ?embed, which hides the mockup controls. */
export const embedded =
  typeof window !== "undefined" && new URLSearchParams(location.search).has("embed");
