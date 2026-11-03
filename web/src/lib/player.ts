// Shapes of the api's GET /players/{id} answer (ScoreFoot.Api/PlayerPage.cs).
/** `hasPage` is false for clubs outside the 5 leagues: their name is plain text. */
export type ClubRef = { id: number; name: string; logo: string | null; hasPage: boolean };
export type Opponent = { id: number; name: string; code: string | null; logo: string | null; hasPage: boolean };
export type SeasonClub = ClubRef & { league: string };
export type Summary = { appearances: number; minutes: number; goals: number; assists: number; rating: number | null };
export type FormMatch = {
  fixtureId: number;
  kickoffUtc: string;
  opponent: Opponent;
  home: boolean;
  goalsFor: number | null;
  goalsAgainst: number | null;
  minutes: number;
  rating: number | null;
  goals: number;
  assists: number;
};
export type RadarAxis = { key: string; value: number | null; percentile: number | null };
export type Radar = { minMinutes: number; eligible: boolean; groupSize: number; axes: RadarAxis[] };
export type StatRow = { key: string; total: number | null; per90: number | null; outOf: number | null; pct: number | null };
export type StatGroup = { group: string; rows: StatRow[] };
export type HistoryRow = {
  season: number;
  club: ClubRef;
  league: string;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  rating: number | null;
};
export type Player = {
  id: number;
  name: string;
  photo: string | null;
  birthDate: string | null;
  nationality: string | null;
  heightCm: number | null;
  seasons: number[];
  season: number;
  position: string | null;
  clubs: SeasonClub[];
  summary: Summary;
  previous: Summary | null;
  form: FormMatch[];
  radar: Radar;
  stats: StatGroup[];
  history: HistoryRow[];
};

/** "278-kylian-mbappe" → 278. The slug part is decorative. */
export function parseId(slug: string): number | null {
  const match = /^([0-9]{1,10})(-.*)?$/.exec(slug);
  return match?.[1] ? Number(match[1]) : null;
}

/** `?season=` as given in the URL: undefined when absent, "invalid" when it is not a 4-digit year. */
export function parseSeason(raw: string | readonly string[] | undefined): number | undefined | "invalid" {
  if (raw === undefined) return undefined;
  return typeof raw === "string" && /^[0-9]{4}$/.test(raw) ? Number(raw) : "invalid";
}

/** 2024 → "2024-25" (long) or "24-25" (short). */
export function seasonLabel(season: number, form: "long" | "short" = "long"): string {
  const next = String((season + 1) % 100).padStart(2, "0");
  return form === "long" ? `${season}-${next}` : `${String(season % 100).padStart(2, "0")}-${next}`;
}

/** Age in full years on `today`, from an ISO date ("1998-12-20"). */
export function ageOn(birthDate: string | null, today: Date): number | null {
  if (!birthDate) return null;
  const [y = 0, m = 1, d = 1] = birthDate.split("-").map(Number);
  const hadBirthday = today.getUTCMonth() + 1 > m || (today.getUTCMonth() + 1 === m && today.getUTCDate() >= d);
  return today.getUTCFullYear() - y - (hadBirthday ? 0 : 1);
}

/** A number with exactly `decimals` decimals, in the page's language ("2,604" / "2 604", "7.5" / "7,5"). */
export const formatNumber = (n: number, decimals: number, locale: string) =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);

/** Change vs the previous season, computed on the values as shown (rounded to `decimals`). Uses a real minus sign. */
export function delta(
  current: number | null,
  previous: number | null,
  decimals: number,
  locale: string,
): { text: string; sign: -1 | 0 | 1 } | null {
  if (current === null || previous === null) return null;
  const diff = Number(current.toFixed(decimals)) - Number(previous.toFixed(decimals));
  const size = Number(Math.abs(diff).toFixed(decimals));
  const text = formatNumber(size, decimals, locale);
  if (size === 0) return { text, sign: 0 };
  return diff > 0 ? { text: `+${text}`, sign: 1 } : { text: `−${text}`, sign: -1 };
}

/** Ratings always show one decimal. */
export const formatRating = (rating: number | null, locale: string) =>
  rating === null ? "–" : formatNumber(rating, 1, locale);

export type RatingBand = "bad" | "poor" | "ok" | "good" | "great";

/** Colour band of the rating scale in docs/DESIGN_SYSTEM.md, on the value as shown. */
export function ratingBand(rating: number | null): RatingBand | null {
  if (rating === null) return null;
  const shown = Number(rating.toFixed(1));
  if (shown < 6) return "bad";
  if (shown < 6.5) return "poor";
  if (shown < 7) return "ok";
  if (shown < 8) return "good";
  return "great";
}
