import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Runtime } from "./runtime";
import type { User } from "./contracts";
import { assert } from "./errors";
import { importCase } from "./archive";
/**
 * The demonstration case is a real public record: an excerpt of Putusan PN Jakarta Selatan
 * 796/Pid.B/2022/PN Jkt.Sel, the Amazon Transcribe transcript of the broadcast 8 November
 * 2022 hearing and the findings Jude saved for it, bundled as a .jude archive. Sources and
 * limits: examples/sambo-796-public/README.md. The archive is a static file (public
 * material, also downloadable at /demo/...): `static/` in development and tests,
 * `build/client/` in the production image.
 */
const PUBLIC_DEMO = "demo/sambo-796-public.jude";
export function publicDemoPath() {
  const candidates = [
    fileURLToPath(new URL(`../../../static/${PUBLIC_DEMO}`, import.meta.url)),
    resolve("build/client", PUBLIC_DEMO),
    resolve("static", PUBLIC_DEMO),
  ];
  const found = candidates.find((path) => existsSync(path));
  assert(found, 503, "The demonstration case is not bundled.");
  return found;
}
/** Import a fresh copy of the public demonstration case for this account. */
export async function seedDemo(rt: Runtime, user: User) {
  return importCase(rt, user, new Uint8Array(await readFile(publicDemoPath())));
}
