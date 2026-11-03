import { apiUrl } from "./api";
import type { ClubRef } from "./player";

// Shapes and rules of the api's GET /leaderboards/{stat} (ScoreFoot.Api/Leaderboard.cs).
export const STATS = [
  "goals",
  "assists",
  "goalsAssists",
  "rating",
  "minutes",
  "shotsOnTarget",
  "keyPasses",
  "dribbles",
  "tackles",
  "interceptions",
  "duelsWon",
  "saves",
] as const;
export type Stat = (typeof STATS)[number];
export const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Attacker"] as const;
export const AGES = ["u21", "u23"] as const;

export const isStat = (s: string): s is Stat => (STATS as readonly string[]).includes(s);
export const hasPer90 = (s: Stat) => s !== "rating" && s !== "minutes";

export type Filters = {
  season?: number;
  league?: number;
  position?: (typeof POSITIONS)[number];
  age?: (typeof AGES)[number];
  mode?: "total" | "per90";
};

export type LeaderboardRow = {
  rank: number;
  player: { id: number; name: string; photo: string | null };
  club: ClubRef;
  position: string | null;
  appearances: number;
  minutes: number;
  value: number;
  per90: number | null;
};
export type Leaderboard = {
  stat: Stat;
  mode: "total" | "per90";
  season: number;
  league: number | null;
  position: string | null;
  age: string | null;
  minMinutes: number | null;
  seasons: number[];
  leagues: { id: number; name: string }[];
  rows: LeaderboardRow[];
};

const pick = <T extends string>(list: readonly T[], v: string): T | undefined => list.find((x) => x === v);

/** Filters from the URL query; "invalid" when one is malformed (the page then answers 404). Unknown keys are ignored. */
export function parseFilters(params: Record<string, string | string[] | undefined>): Filters | "invalid" {
  const filters: Filters = {};
  for (const key of ["season", "league", "position", "age", "mode"] as const) {
    const raw = params[key];
    if (raw === undefined || raw === "") continue;
    if (typeof raw !== "string") return "invalid";
    if (key === "season" || key === "league") {
      if (!(key === "season" ? /^[0-9]{4}$/ : /^[0-9]{1,10}$/).test(raw)) return "invalid";
      filters[key] = Number(raw);
    } else {
      const value = key === "position" ? pick(POSITIONS, raw) : key === "age" ? pick(AGES, raw) : pick(["total", "per90"] as const, raw);
      if (!value) return "invalid";
      Object.assign(filters, { [key]: value });
    }
  }
  return filters;
}

/** Link to a leaderboard keeping the filters; drops per 90 where the stat has none, and the default total mode. */
export function leaderboardHref(stat: Stat, filters: Filters) {
  const { mode, ...rest } = filters;
  return { pathname: `/leaderboards/${stat}`, query: mode === "per90" && hasPer90(stat) ? { ...rest, mode } : rest };
}

/** Server side only. Null when the api refuses the stat or a filter (404 / 400); throws when the api fails. */
export async function fetchLeaderboard(stat: Stat, filters: Filters): Promise<Leaderboard | null> {
  const query = new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${apiUrl()}/leaderboards/${stat}?${query}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`leaderboard ${stat}: api answered ${res.status}`);
  return res.json();
}
