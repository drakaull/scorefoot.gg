// Server side only (route handlers): the browser never learns the api address.
export const apiUrl = () => process.env.API_URL ?? "http://localhost:5080";

export type PlayerResult = {
  id: number;
  name: string;
  photo: string | null;
  club: string | null;
  position: string | null;
  season: number | null;
};

export type ClubResult = {
  id: number;
  name: string;
  logo: string | null;
  league: string | null;
  country: string | null;
};

export type SearchResults = { players: PlayerResult[]; clubs: ClubResult[] };

/** Same rule as the api (Search.ValidQuery): 2 to 50 characters after trimming. */
export function validQuery(q: string | null): string | null {
  const t = q?.trim() ?? "";
  return t.length >= 2 && t.length <= 50 ? t : null;
}

/** Same rule as the api (Media.cs): only "<folder>/<id>.png" written by the sync. */
export const isMediaPath = (path: string) => /^(leagues|teams|players)\/[0-9]{1,10}\.png$/.test(path);

/** Server side only: GET /{kind}/{id}?season= (plus `extra` query values). Null when the api has no such page (404); throws when the api fails. */
export async function fetchPage<T>(
  kind: "players" | "clubs",
  id: number,
  season: number | undefined,
  extra: Record<string, string> = {},
): Promise<T | null> {
  const params = new URLSearchParams(extra);
  if (season !== undefined) params.set("season", String(season));
  const query = params.size ? `?${params}` : "";
  const res = await fetch(`${apiUrl()}/${kind}/${id}${query}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${kind} ${id}: api answered ${res.status}`);
  return res.json();
}
