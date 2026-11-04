import type { ClubRef, Opponent } from "./player";

// Shapes of the api's GET /clubs/{id} answer (ScoreFoot.Api/ClubPage.cs).
export type Zone = "ucl" | "uecl" | "uel" | "playoff" | "relegation";
export type StandingLine = {
  rank: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  zone: Zone | null;
};
export type ClubMatch = {
  fixtureId: number;
  kickoffUtc: string;
  round: string;
  opponent: Opponent;
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
};
export type KeyPlayer = { id: number; name: string; photo: string | null; value: number };
export type TableRow = {
  rank: number;
  club: ClubRef;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  points: number;
  zone: Zone | null;
};
export type SquadPlayer = {
  id: number;
  name: string;
  photo: string | null;
  position: string | null;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  rating: number | null;
};
export type Club = {
  id: number;
  name: string;
  logo: string | null;
  country: string | null;
  seasons: number[];
  season: number;
  league: { id: number; name: string; logo: string | null };
  standing: StandingLine;
  previous: StandingLine | null;
  form: ClubMatch[];
  keyPlayers: {
    topScorer: KeyPlayer | null;
    topAssists: KeyPlayer | null;
    bestRated: KeyPlayer | null;
    mostMinutes: KeyPlayer | null;
  };
  table: TableRow[];
  results: ClubMatch[];
  squad: SquadPlayer[];
};

/** "Regular Season - 38" → 38; other rounds ("Relegation Round") have no matchday number. */
export function matchday(round: string): number | null {
  const match = /^Regular Season - ([0-9]+)$/.exec(round);
  return match?.[1] ? Number(match[1]) : null;
}

/** W, D or L from the club's side. */
export const result = (m: { goalsFor: number; goalsAgainst: number }) =>
  m.goalsFor > m.goalsAgainst ? "W" : m.goalsFor < m.goalsAgainst ? "L" : "D";
