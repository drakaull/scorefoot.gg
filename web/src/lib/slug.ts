// Letters that Unicode decomposition does not split into base letter + accent (same list as SearchText.cs).
const LETTERS: Record<string, string> = { ø: "o", æ: "ae", œ: "oe", đ: "d", ð: "d", ı: "i", ł: "l", ß: "ss", þ: "th" };

/** URL-friendly name: "Kylian Mbappé" → "kylian-mbappe". Only decorative: pages are found by id. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[øæœđðıłßþ]/g, (c) => LETTERS[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "/players/278-kylian-mbappe": id first, so a renamed player keeps working links. */
export const entityPath = (kind: "players" | "clubs", id: number, name: string) =>
  `/${kind}/${id}-${slugify(name)}`;

/** "Kylian Mbappé" → "KM": shown when a photo is missing. */
export const initials = (name: string) =>
  name.split(/s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
