import type { Runtime } from "./runtime";
import { schedule } from "./runtime";
import { investigate } from "./analysis";
/** Runs analysis in this process; `investigate` bounds concurrency and coalesces retries. */
export function enqueue(rt: Runtime, id: string) {
  schedule(rt, investigate(rt, id));
}
