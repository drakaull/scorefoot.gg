# Spec 04 — Club page

Status: approved 2026-11-03.

## Goal
The page a club link opens: one dense page per club and season with its league position, recent form, key players, the full league table, the season's results and the squad (PRD §05). Layout follows the club mockup approved on 2026-11-03 (Real Madrid 2025-26).

## Scope
- `ScoreFoot.Api`: `GET /clubs/{id}`; clubs without a standing leave search; player answers tell which clubs have a page.
- `web`: page `/{locale}/clubs/{id}-{slug}` with a season switch, built like the player page (spec 03).

## Out of Scope
- Stadium, founding year, coach, transfers (not stored; the import would have to change).
- Cups and European matches: only league matches of the 5 leagues are stored.
- Sorting or filtering the tables; a separate full league table page (leaderboards spec).
- Club comparison.

## Data rules
- **Club with a page:** a club with at least one standing in the 5 leagues (125 of 150). The other 25 (U21 sides, second-division or foreign clubs that came in through player lines, e.g. Crystal Palace U21, id 17000) have no page (404) and are left out of search.
- **Links:** wherever a club without a page appears (e.g. Red Star in G. Poussin's history, id 1254), its name is plain text, not a link.
- **Seasons:** only seasons with a standing for the club. A club promoted in 2025 has one tab.
- **Squad and key players:** the club's played season lines (minutes > 0) of that season. A player who left in January counts only for his part at this club. Missing counts are 0, missing ratings stay "–" (same as spec 03).
- **Zones:** the API's standing description (about 25 different labels) is grouped, first match wins:

| Zone | Label contains | Colour |
|---|---|---|
| `ucl` | "Champions League" | Accent `#3DDC84` |
| `uecl` | "Conference League" | Gold `#F5C451` |
| `uel` | "Europa League" | `#4C9AFF` |
| `playoff` | "Relegation Playoffs", "(Relegation)", "Play Offs" | `#F5803E` |
| `relegation` | starts with "Relegation" | Error `#F2555A` |
| none | anything else or empty | no bar |

  Zones follow the label, not the rank (Real Sociedad, 10th in 2025-26, has the Europa League bar: cup winner).

## API
### `GET /clubs/{id}?season={year}`
- Unknown id, or a club without a standing → `404`. `season` missing → the club's latest season with a standing; given but not one of them → `404`.

Response (example values, Real Madrid 2025-26):
```json
{
  "id": 541, "name": "Real Madrid", "logo": "/media/teams/541.png", "country": "Spain",
  "seasons": [2025, 2024, 2023, 2022],
  "season": 2025,
  "league": { "id": 140, "name": "La Liga", "logo": "/media/leagues/140.png" },
  "standing": { "rank": 2, "points": 86, "played": 38, "won": 27, "drawn": 5, "lost": 6,
                "goalsFor": 77, "goalsAgainst": 35, "zone": "ucl" },
  "previous": { "rank": 2, "points": 84, "played": 38, "won": 26, "drawn": 6, "lost": 6,
                "goalsFor": 78, "goalsAgainst": 38, "zone": "ucl" },
  "form": [{ "fixtureId": 1, "kickoffUtc": "2026-05-23T19:00:00Z", "round": "Regular Season - 38",
             "opponent": { "id": 531, "name": "Athletic Club", "code": "BIL", "logo": "/media/teams/531.png" },
             "home": true, "goalsFor": 4, "goalsAgainst": 2 }],
  "keyPlayers": {
    "topScorer":   { "id": 278, "name": "Kylian Mbappé", "photo": "/media/players/278.png", "value": 25 },
    "topAssists":  { "id": 1, "name": "Arda Güler", "photo": null, "value": 9 },
    "bestRated":   { "id": 278, "name": "Kylian Mbappé", "photo": "/media/players/278.png", "value": 7.53 },
    "mostMinutes": { "id": 2, "name": "Thibaut Courtois", "photo": null, "value": 2880 }
  },
  "table": [{ "rank": 1, "club": { "id": 529, "name": "Barcelona", "logo": "/media/teams/529.png" },
              "played": 38, "won": 31, "drawn": 1, "lost": 6, "goalDiff": 59, "points": 94, "zone": "ucl" }],
  "results": [{ "fixtureId": 1, "...": "same fields as form" }],
  "squad": [{ "id": 278, "name": "Kylian Mbappé", "photo": "/media/players/278.png", "position": "Attacker",
              "appearances": 31, "minutes": 2604, "goals": 25, "assists": 5, "rating": 7.53 }]
}
```
- `previous`: the club's standing the season before, in any of the 5 leagues; `null` if it was not in one (promoted club).
- `form`: the last 5 results. `results`: every league match of the season, most recent first, scores from the club's side.
- `keyPlayers`: highest value, ties broken by minutes. `bestRated` needs 900+ minutes for the club (same threshold as the radar); `null` when nobody qualifies, as is any key player whose value is 0.
- `table`: the league's standings of that season, by rank.
- `squad`: played lines for the club, Goalkeeper → Defender → Midfielder → Attacker, then most minutes first.
- Player answers (spec 03): `clubs[]` and `history[].club` get `hasPage` (false for clubs without a standing).

## Web
### Route
- `/{locale}/clubs/{id}-{slug}`, `?season=` as on the player page: wrong slug → permanent redirect keeping `season`; bad id, unknown club or season → localized 404 page.
- No `loading.tsx` (AGENTS.md); season tabs use `LinkPending`, the content below the header fades while the next season loads.
- Title "Real Madrid · ScoreFoot.gg"; description with league and season.

### Layout (club mockup)
1. **Header card:** logo 96px (64px on mobile, square, no radius), name (H1), chips: league (logo + name), country. Season tabs.
2. **4 stat cards** (2 × 2 on mobile), each with a Delta vs the previous season when there is one:
   - Rank: ordinal ("2nd" / "2e"), Gold when 1st; a better rank is a positive delta (rank 3 → 2 shows "+1" in Success).
   - Points. W-D-L ("27-5-6", sub-line "38 played", no delta). Goal difference ("+42", sub-line "77 for, 35 against").
3. **Two cards side by side** (stacked under 1024px):
   - "Last 5 matches": W/D/L chip, "vs BIL" / "at SEV", score from the club's side. Most recent on the left.
   - "Key players": 4 rows (photo, label, name linking to the player, value; rating as a Rating badge).
4. **Two cards side by side:**
   - League table "La Liga 2025-26": rank with the zone bar, club (logo + name, link), P, W, D, L, GD, Pts. The club's row on Surface raised with its name in Accent. Legend of the zones present, under the table. Under 640px: only rank, club, GD and Pts.
   - "Season results": date and matchday ("MD 38"; the other rounds, relegation play-offs and the 2022 Serie A decider, show "Play-off" / "Barrage" and stay in the list), opponent, score, W/D/L chip. First 10, then the rest inside a native `<details>` "Show all 38 matches" (works without JavaScript).
5. **Squad card** (full width): "Squad · 35 players used", grouped by position (plural headings), columns Player (photo, name, link), Apps, Min, Goals, Assists, Rating. Under 640px: Player, Apps, Goals, Rating.

### Components
- Reused: `Card`, `RatingBadge`, `LinkPending`, the stat card and form layouts of the player page.
- New: `ResultChip` (W/D/L: W Accent, D Surface raised with Muted text, L Error; `#0B100D` text on colour), used by the form card and the results list; `ZoneBar`.
- Player page: club names without a page are plain text.

### States
- Error: same error card as the player page. Empty: no results yet → "No match played this season"; no key player → "–".

### Text
- New namespace `Club` in `en.json` and `fr.json`, zone names, ordinals (en "1st 2nd 3rd 4th", fr "1er 2e"). League, club and country names stay as the API gives them.

## Acceptance criteria
- [ ] `/en/clubs/541-real-madrid` shows 2025-26: 2nd, 86 pts, 27-5-6, +42; key players Mbappé (25 goals, 7.5), Güler (9 assists), Courtois (2,880 min); Real Madrid highlighted in the La Liga table.
- [ ] Getafe has the Gold bar, Real Sociedad the blue bar, Mallorca / Girona / Oviedo the red bar; the legend lists the 4 zones present.
- [ ] Oviedo (promoted in 2025) has one season tab; `?season=2024` shows the 404 page.
- [ ] `/en/clubs/541-x` redirects to `/en/clubs/541-real-madrid`; `/en/clubs/17000-crystal-palace-u21` shows the 404 page; "crystal palace u21" is not in search results.
- [ ] G. Poussin's player page shows Red Star as plain text, not a link.
- [ ] "Show all 38 matches" opens the rest of the results without JavaScript.
- [ ] Search result, player header chip and club history links open the club page.
- [ ] The api answers in under 200 ms locally (20 clubs, latest and oldest season); the page loads in under 1 s.
- [ ] `/en` and `/fr` show every label in the right language; no request to a third-party domain.
- [ ] Checked in Chrome and Firefox, desktop and 390px wide; screenshots shown to Léonard.

## Tests
- xUnit (test database): latest season default and 404 cases, club without standing → 404 and absent from search, `previous` null for a promoted club, form and results order with the club's score side, key players (ties, 900-minute rule, zero values), squad order and empty lines ignored, zone mapping for every label in the table above, `hasPage` on player answers.
- Vitest: ordinal in both languages, rank delta sign, round label ("Regular Season - 38" → "MD 38").
- Playwright (Chrome + Firefox): search "real madrid" → Enter → club page; season tab; wrong slug redirect; U21 404; show all results; link from a player page to his club.

## Decisions (2026-11-03)
1. Content: everything in the mockup; the full squad is shown (no "show more").
2. Clubs without a standing: no page, out of search, plain text where they appear (option A).
3. Zones from the API label with existing colours; relegation play-offs use the rating orange `#F5803E`.
4. Seasons: only the club's seasons in the 5 leagues.
5. Scores always from the club's side, like the player page.
6. No new dependency.
