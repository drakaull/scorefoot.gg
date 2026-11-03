import { parseId, parseSeason } from "./player";
import { slugify } from "./slug";

export type Slot = { id: number; slug: string; season: number | undefined };

/** Players chosen in /compare/{slug1}/{slug2}?s1=&s2=; "invalid" when the URL is malformed (the page answers 404). */
export function parseCompare(slugs: string[] | undefined, params: Record<string, string | string[] | undefined>): Slot[] | "invalid" {
  const list = slugs ?? [];
  if (list.length > 2) return "invalid";
  const slots: Slot[] = [];
  for (const [i, slug] of list.entries()) {
    const id = parseId(slug);
    const season = parseSeason(params[`s${i + 1}`]);
    if (id === null || season === "invalid") return "invalid";
    slots.push({ id, slug, season });
  }
  return slots;
}

type Pick = { id: number; name: string; season?: number } | null;

/** Link to a comparison. Empty slots are skipped, so a lone second player becomes the first. */
export function compareHref(slots: [Pick, Pick]) {
  const chosen = slots.filter((s) => s !== null);
  const query: Record<string, number> = {};
  chosen.forEach((s, i) => {
    if (s.season !== undefined) query[`s${i + 1}`] = s.season;
  });
  return { pathname: ["/compare", ...chosen.map((s) => `${s.id}-${slugify(s.name)}`)].join("/"), query };
}

/** Which player has the better value: 1, 2, or 0 for equal / missing. Fouls, cards and goals conceded: lower wins. */
export function better(a: number | null, b: number | null, lowerWins: boolean): 0 | 1 | 2 {
  if (a === null || b === null || a === b) return 0;
  return a > b !== lowerWins ? 1 : 2;
}

export const LOWER_WINS = new Set(["foulsCommitted", "yellowCards", "redCards", "goalsConceded"]);
