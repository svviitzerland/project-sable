import type { Role, Speaker } from "./types";

/** Color family per role; associate judges share the bench color. */
export const roleTone = (role: Role | undefined) => (role === "judge_member" ? "judge" : (role ?? "unknown"));

/** Short name for captions: the person's first name, or the role title. */
export function shortName(sp: Speaker | undefined) {
  if (!sp?.label) return "";
  const named = sp.label.match(/^(?:Saksi|Terdakwa|Ahli)\s+(.+)$/i);
  return named ? named[1].split(/\s+/)[0] : sp.label;
}

/** Order people are listed in: the bench first, then prosecution, witnesses, defense. */
export const roleOrder: Role[] = ["judge", "judge_member", "prosecutor", "witness", "defense", "defendant", "unknown"];
