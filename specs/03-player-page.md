# Spec 03 — Player page

Status: approved 2026-11-02.

## Goal
The page a search result opens: one dense, readable page per player with the season's key numbers, the last 5 matches with ratings, a percentile radar against players in the same position, detailed stats and the club history over the 4 seasons (PRD §03 and §05). Layout follows the scoping mockup (player part).

## Scope
- `ScoreFoot.Api`: `GET /players/{id}`.
- `web`: page `/{locale}/players/{id}-{slug}` with a season switch.
- `ScoreFoot.Sync`: position labels normalized at import ("Forward" → "Attacker"), then `reimport` (no API call).
- `GET /search` (spec 02): players who never played a minute are left out.

## Out of Scope
- Comparator and its "Compare" button (comparator spec).
- Club page: club names link to `/{locale}/clubs/{id}-{slug}`, which stays a 404 until spec 04.
- Rating chart over the whole season, match pages, shot maps, transfer fees, market values.
- Percentiles stored in a table: computed per request (about 1,600 players per season, see Decisions).
- Positions finer than the 4 the API gives (no "winger" or "centre-back").

## Data fix: position labels
- The API gives "Attacker" for most season lines and "Forward" for 569 of them; match lines use G, D, M, F.
- `Importer.FillStatLine` maps "Forward" to "Attacker", so season lines only hold Goalkeeper, Defender, Midfielder, Attacker. Match lines are unchanged.
- After the change, `docker compose run --rm sync reimport` rewrites the existing rows. Test: a season line with "Forward" is stored as "Attacker".

## Data rules
- **Played line:** a season line with minutes > 0. The API also lists squad members who never played (6,560 empty lines, e.g. Mbappé at PSG in 2024-25 after his move). Empty lines are ignored everywhere: season tabs, club chips, summary, history, radar.
- **Players who never played** (2,701, e.g. Tom Heaton, id 2931): no page (404) and left out of search results. The PRD covers players who played.
- **Missing counts:** the API sends `null` instead of 0 for counts (goals is null in 92 % of played match lines). On a played line or match, a null count (goals, assists, shots, tackles, blocks, cards…) counts as 0.
- **Missing rating or percentage:** a null rating or pass accuracy is a real gap. It shows "–", is left out of weighted averages and of that radar axis's ranking.

## API
### `GET /players/{id}?season={year}`
- `id` unknown, or the player has no played line → `404`.
- `season` missing → the latest season the player has a played line in. `season` given but not one of the player's seasons → `404`.
- A season can hold several lines (mid-season transfer, or two leagues): the season figures add them up.

Response (example values):
```json
{
  "id": 278, "name": "Kylian Mbappé", "photo": "/media/players/278.png",
  "birthDate": "1998-12-20", "nationality": "France", "heightCm": 178,
  "seasons": [2025, 2024, 2023, 2022],
  "season": 2025,
  "position": "Attacker",
  "clubs": [{ "id": 541, "name": "Real Madrid", "logo": "/media/teams/541.png",
              "league": "La Liga" }],
  "summary":  { "appearances": 34, "minutes": 2900, "goals": 31, "assists": 4, "rating": 7.62 },
  "previous": { "appearances": 34, "minutes": 2850, "goals": 31, "assists": 3, "rating": 7.55 },
  "form": [{ "fixtureId": 1208390, "kickoffUtc": "2026-05-24T19:00:00Z",
             "opponent": { "id": 548, "name": "Real Sociedad", "code": "RSO", "logo": "/media/teams/548.png" },
             "home": true, "goalsFor": 3, "goalsAgainst": 1, "minutes": 90,
             "rating": 8.3, "goals": 2, "assists": 0 }],
  "radar": { "minMinutes": 900, "eligible": true,
             "axes": [{ "key": "goals", "value": 0.96, "percentile": 99 }] },
  "stats": [{ "group": "attack",
              "rows": [{ "key": "goals", "total": 31, "per90": 0.96 }] }],
  "history": [{ "season": 2025, "club": { "id": 541, "name": "Real Madrid", "logo": "/media/teams/541.png" },
                "league": "La Liga", "appearances": 34, "minutes": 2900,
                "goals": 31, "assists": 4, "rating": 7.62 }]
}
```
- `position`: position of the season line with the most minutes. `clubs`: the season's clubs, most minutes first.
- `summary.rating`: season ratings weighted by minutes. `previous`: same figures for the season before, `null` if the player has none (used for deltas).
- `form`: up to 5 matches of the chosen season where the player played (minutes > 0), most recent first. `goalsFor` / `goalsAgainst` from the player's team side.
- `history`: every season line of the 4 seasons, newest first (two clubs in one season → two rows).
- Missing values follow the Data rules: counts are 0, a missing rating or percentage is `null` (shown as "–").

### Radar
- Compared group: same season, same position, all 5 leagues, players with at least 900 minutes in that season (all their lines added up). The 900 is a constant in `ScoreFoot.Api`, not hard-coded in SQL.
- Values per 90 minutes, except percentages and rating. Percentile = `round(100 × percent_rank)` inside the group (ties share a value); for "goals conceded" lower is better.
- Below 900 minutes: `eligible: false`, no axes; the page shows "Not enough minutes for a fair comparison (900 min needed)".
- A player with a null rating or percentage on an axis gets `percentile: null` on that axis and is left out of that axis's ranking.

| Position   | Axes |
|------------|------|
| Attacker   | Goals, Shots on target, Key passes, Successful dribbles, Duels won %, Rating |
| Midfielder | Key passes, Passes, Pass accuracy %, Tackles + interceptions, Successful dribbles, Rating |
| Defender   | Tackles, Interceptions, Blocks, Duels won %, Pass accuracy %, Rating |
| Goalkeeper | Saves, Save %, Goals conceded (lower is better), Pass accuracy %, Rating |

Formulas: duels won % = won / total; save % = saves / (saves + conceded); pass accuracy % = season percentages weighted by passes; rating = weighted by minutes.

### Detailed stats
Groups and rows (total and per 90; percentages have no per 90):
- Attack: goals, assists, shots, shots on target, successful dribbles (of attempts), penalties scored.
- Passing: passes, key passes, pass accuracy %.
- Defence: tackles, interceptions, blocks, duels won (and %).
- Discipline: fouls committed, fouls drawn, yellow cards, red cards.
- Goalkeeping (goalkeepers only, listed first): saves, goals conceded, save %.

## Web
### Route
- `/{locale}/players/{id}-{slug}`; `?season=2024` picks the season. Season tabs are plain links (work without JavaScript).
- Wrong or missing slug (`/en/players/278-x`, `/en/players/278`) → permanent redirect to the right slug, keeping `season`.
- Non-numeric id, unknown player, unknown or invalid season → the localized 404 page.
- Page title: "Kylian Mbappé · ScoreFoot.gg"; description with club and season.

### Layout (player mockup approved 2026-11-02)
1. **Header card:** photo 96px (64px on mobile, initials if missing), name (H1), chips: club(s) (link), position, nationality, age ("27 y/o", from the birth date and today), height when known. Below: season tabs "2025-26 · 2024-25 · …" (only seasons the player has), active tab Text colour + Accent underline.
2. **4 stat cards** (2 × 2 on mobile): Goals, Assists, Avg rating (rating colour, one decimal), Minutes (sub-line: appearances). Each with a Delta line vs the previous season ("+11 vs 24-25"); none if no previous season.
3. **Two cards side by side** (stacked under 1024px):
   - "Last 5 matches": per match, rating badge (Muted "–" chip if no rating), "vs BIL" (or "at SEV" away), then "W 4-2" and minutes on two sub-lines; most recent on the left.
   - "Percentiles vs attackers" (position plural, translated): SVG radar, hand-written, with "Goals 99" labels and a note "Against 348 attackers with 900+ minutes in 2025-26, top 5 leagues"; or the not-enough-minutes message.
4. **Two cards side by side** (stacked under 1024px):
   - Detailed stats: table per group (Caption headers "Total" and "Per 90"), tabular figures.
   - Club history: table Season, Club (logo + name, league as sub-line, truncated with "…"), Apps, Min, Goals, Assists, Rating badge. Under 640px: no Season, Min and Assists columns; the season moves into the sub-line ("25-26 · La Liga").

### States
- Loading: `loading.tsx` with grey card skeletons of the same sizes (no layout jump).
- Error (api unreachable): an error card "Stats are unavailable, try again" with a retry button.
- Empty pieces: no rated match → badges show "–"; no form match in the season → "No match played this season".

### Accessibility
- Radar: `role="img"` with an `aria-label` listing every axis and percentile.
- Rating badges carry the number as text (colour is never the only signal).
- Tables use real `<table>` with `<th scope>`.

### Text
- Every label in `messages/en.json` and `fr.json` (new namespace `Player`). Season label "2024-25" is the same in both languages.
- Nationality and league names stay as the API gives them (English), as for search.

## Acceptance criteria
- [ ] `/en/players/278-kylian-mbappe` shows Mbappé's latest season; `?season=2022` shows 2022-23 with his club of that season.
- [ ] `/en/players/278-x` redirects to `/en/players/278-kylian-mbappe`; `/en/players/999999999-x` and `?season=2019` show the 404 page.
- [ ] Mbappé's club history has no PSG 2024-25 row (empty line).
- [ ] Antoine Semenyo (2025-26, Bournemouth then Manchester City) shows the added-up season and two rows in the club history.
- [ ] Jadon Sancho in 2025-26 (891 minutes) shows the not-enough-minutes message instead of the radar.
- [ ] Tom Heaton (never played) is not in search results and `/en/players/2931-tom-heaton` shows the 404 page.
- [ ] Form shows 0 goals, not "–", for a match where the player did not score.
- [ ] No season line says "Forward" after `reimport`.
- [ ] The api answers in under 200 ms locally (20 players, latest and oldest season); the page loads in under 1 s.
- [ ] `/en` and `/fr` show every label in the right language.
- [ ] No request to a third-party domain.
- [ ] Checked in Chrome and Firefox, desktop and 390px wide; screenshots shown to Léonard.

## Tests
- xUnit (test database): empty lines ignored, never-played player → 404 and absent from search, null counts as 0 but null rating left out, season adding-up across two clubs and weighted rating, latest season default, unknown id / season → 404 data, form order and minutes > 0 filter, percentile values on a small known group (including ties, nulls and the inverted goals-conceded axis), the 900-minute rule, "Forward" → "Attacker" at import.
- Vitest: season label (2024 → "2024-25"), age from birth date, delta formatting, rating colour bands, radar point coordinates.
- Playwright (Chrome + Firefox): search → Enter → player page shows the name and 4 cards; season tab switches the season in the URL and the cards; wrong slug redirects; French labels on `/fr`.

## Decisions (2026-11-02)
1. Content: everything the PRD lists for the player page, in the mockup's order, without the Compare button.
2. Radar: same position + season + 5 leagues, at least 900 minutes, per 90, axes above; percentiles computed by SQL per request, no new table.
3. Form: last 5 matches played in the chosen season, with opponent, home/away, score, minutes and rating.
4. Detailed stats: total and per 90 side by side, no toggle; mid-season transfers are added up, the history keeps one row per club.
5. "Forward" → "Attacker" fixed at import in this branch, then `reimport`.
6. URL: `/{locale}/players/{id}-{slug}?season=YYYY`, latest season by default, wrong slug redirected.
7. No new dependency.
8. Lines with 0 minutes are ignored; players who never played have no page and are not in search.
9. A missing count is 0 on a played line or match; a missing rating or percentage stays "–".
10. Desktop: detailed stats and club history side by side (player mockup).
