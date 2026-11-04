# Spec 05 — Leaderboards

Status: approved 2026-11-03.

## Goal
Rankings of players by stat over a season, filterable by league, position and age, with a podium for the top 3 (PRD §05). The home page gets the preview cards planned since scoping, and the header gets a "Leaderboards" link. Layout follows the leaderboards mockup approved on 2026-11-03.

## Scope
- `ScoreFoot.Api`: `GET /leaderboards/{stat}`.
- `web`: page `/{locale}/leaderboards/{stat}` (and `/{locale}/leaderboards` → goals), 3 preview cards on the home page, "Leaderboards" link in the header.

## Out of Scope
- Club leaderboards and league tables (the club page has the table).
- Sorting by another column, more than 50 rows, pagination, CSV export.
- Stats over several seasons, career totals.
- The comparator (next spec).

## Stats
| Key | Label | Total | Per 90 |
|---|---|---|---|
| `goals` | Goals | yes | yes |
| `assists` | Assists | yes | yes |
| `goalsAssists` | Goals + assists | yes | yes |
| `rating` | Rating | average, weighted by minutes | — |
| `minutes` | Minutes | yes | — |
| `shotsOnTarget` | Shots on target | yes | yes |
| `keyPasses` | Key passes | yes | yes |
| `dribbles` | Successful dribbles | yes | yes |
| `tackles` | Tackles | yes | yes |
| `interceptions` | Interceptions | yes | yes |
| `duelsWon` | Duels won | yes | yes |
| `saves` | Saves | yes | yes |

- Rating and every per-90 ranking need 900+ minutes (`Radar.MinMinutes`, same as the radar), so a substitute with one goal in 10 minutes is not first.
- Totals have no minimum.

## Data rules
- One row per player and season: his played lines (minutes > 0) of the season added up with `SeasonTotals` (spec 03 rules: missing counts are 0, missing ratings left out). With a league filter, only his lines in that league.
- **Position:** the position of his line with the most minutes (as on his page).
- **Club shown:** the club he played his last match of the season for (as on his page); with a league filter, his last club in that league.
- **Age:** on 1 July of the season's first year (2025-26 → 1 July 2025). `u21` = under 21 on that day, `u23` = under 23. Players without a birth date are left out when an age filter is set.
- **Zero values:** a player whose value is 0 (no goal, no save…) is left out, so a narrow filter shows the empty state rather than a list of zeros.
- **Order:** value, highest first; ties: fewer minutes first (more efficient), then name. Ranks are 1 to 50 without gaps.

## API
### `GET /leaderboards/{stat}?season=&league=&position=&age=&mode=`
- `stat`: one of the 12 keys, otherwise `404`.
- `season`: a season in the database; missing → the latest one. `league`: a league id in the database, missing → all 5. `position`: `Goalkeeper`, `Defender`, `Midfielder` or `Attacker`. `age`: `u21` or `u23`. `mode`: `total` (default) or `per90`, and `per90` only for stats that have it. Any other value → `400`.

Response (example values, goals 2025-26, all filters off):
```json
{
  "stat": "goals", "mode": "total", "season": 2025, "league": null, "position": null, "age": null,
  "minMinutes": null,
  "seasons": [2025, 2024, 2023, 2022],
  "leagues": [{ "id": 39, "name": "Premier League" }, { "id": 140, "name": "La Liga" }],
  "rows": [{ "rank": 1, "player": { "id": 184, "name": "Harry Kane", "photo": "/media/players/184.png" },
             "club": { "id": 157, "name": "Bayern München", "logo": "/media/teams/157.png", "hasPage": true },
             "position": "Attacker", "appearances": 31, "minutes": 2382, "value": 36, "per90": 1.36 }]
}
```
- `minMinutes`: 900 when the ranking needs it, otherwise null (shown under the table).
- `value`: the ranked number (total, per-90 value with 2 decimals, or rating with 2 decimals). `per90`: the per-90 value for count stats (shown as a column), null for rating and minutes.
- Up to 50 rows; empty list when nobody matches.

## Web
### Routes
- `/{locale}/leaderboards` → permanent redirect to `/{locale}/leaderboards/goals`.
- `/{locale}/leaderboards/{stat}?season=&league=&position=&age=&mode=`: unknown stat or any invalid filter → localized 404 page. No `loading.tsx` (AGENTS.md).
- Title "Top scorers · ScoreFoot.gg" (stat name), description with the active filters.

### Layout (leaderboards mockup)
1. **Title** (H1, stat name: "Top scorers", "Best rated"…) and a Muted line with the active filters ("Top 5 leagues · 2025-26 · all positions · all ages").
2. **Stat tabs:** the 12 stats as chips (links keeping the filters; active chip Accent with `#0B100D` text); they scroll sideways on mobile. `LinkPending` on each.
3. **Filters:** 4 native `<select>` (league, season, position, age) in a `<form method="get">`; a change submits the form at once (small client script, navigation shown as pending); an "Apply" button is shown only when JavaScript is off. Next to them, a "Total / Per 90" switch (links), hidden for rating and minutes.
4. **Podium** (3 or more rows): cards for ranks 1–3, 1st in the middle, taller, rank and value in Gold with a 3px Gold bar; 2nd left, 3rd right. Photo 72px (48px on mobile), name (link), club, value (Stat size) and per-90 line.
5. **Table** for ranks 4–50: rank, player (photo 32px, name link, Muted sub-line "club · position"), Apps, Min, Per 90, value (Accent, bold). Under 640px: rank, player and value only. Note under the table when `minMinutes` is set ("Players with 900+ minutes").
6. **Empty state:** "No player matches these filters" with a link to reset them.

### Home page
- Under the search bar, 3 preview cards (Card with the 3px Accent bottom bar): "Top scorers", "Best rated", "Top assists" for the latest season, all leagues, top 5 each: rank (1st in Gold), photo, name (link), club, value (rating as a Rating badge). Footer link "See the full leaderboard →".
- Stacked under 1024px. If the api cannot be reached, the cards are left out and the search still works.

### Header
- "Leaderboards" link after the logo, also on mobile; Text colour with the 2px Accent underline on leaderboard pages.

### Text
- New namespace `Leaderboards` (stat names, page titles, filter labels and options, podium, empty state, home cards) in `en.json` and `fr.json`. League names stay as the API gives them.

## Acceptance criteria
- [x] `/en/leaderboards/goals` (2025-26, all filters off): Kane 36, Haaland 27, Mbappé 25 on the podium; Semenyo shown at Manchester City.
- [x] `rating`: Lamine Yamal first (7.95 → "8.0"), every row has 900+ minutes.
- [x] `?league=39` (Premier League) shows only Premier League lines; `?position=Goalkeeper` on `saves` lists only goalkeepers; `?age=u21` on `rating` keeps Yamal (born 2007).
- [x] `?mode=per90` re-ranks with 900+ minutes; the switch is hidden on `rating` and `minutes`.
- [x] Changing a filter updates the URL and the table; with JavaScript off the Apply button does the same.
- [x] `/en/leaderboards` redirects to `/en/leaderboards/goals`; `/en/leaderboards/xyz` and `?season=1990` show the 404 page.
- [x] Home shows the 3 preview cards with the same figures as the leaderboards; header link works on desktop and mobile.
- [x] The api answers in under 200 ms locally for 20 filter combinations; pages load in under 1 s.
- [x] `/en` and `/fr` show every label in the right language; no request to a third-party domain.
- [x] Checked in Chrome and Firefox, desktop and 390px wide; screenshots shown to Léonard.

## Tests
- xUnit (test database): adding-up across clubs, league filter, position from the most-minutes line, age on 1 July (birthday on 30 June / 1 July / 2 July), u21 / u23, missing birth date left out, 900-minute rule for rating and per 90, ties by minutes then name, 50-row limit, last club shown, every invalid parameter → error, `mode=per90` refused for rating and minutes.
- Vitest: filter parsing from the URL (valid, missing, invalid), active filters line, URL building that keeps filters when switching stat or mode.
- Playwright (Chrome + Firefox): header link → goals leaderboard; stat tab; filter change updates the URL; per-90 switch; redirect and 404; home preview card link; French labels.

## Decisions (2026-11-03)
1. 12 stats, total and per 90 (900+ minutes for per 90 and rating).
2. Filters: league, season, position, age (u21 / u23 on 1 July of the season); a transfer adds both clubs, the last club is shown.
3. Podium for the top 3, table to 50, no pagination.
4. Everything in the URL; selects submit on change, Apply button without JavaScript.
5. Home: 3 preview cards (top scorers, best rated, top assists) and a header link.
6. No new dependency.
