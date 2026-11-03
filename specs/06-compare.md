# Spec 06 — Compare

Status: approved 2026-11-03.

## Goal
Two players side by side: key numbers, overlaid percentile radars and a per-90 stat table, each player on the season of one's choice (PRD §05). It is the last v1 feature. Layout follows the compare mockup approved on 2026-11-03 (Mbappé vs Haaland, 2025-26).

## Scope
- `ScoreFoot.Api`: optional `radarPosition` on `GET /players/{id}`.
- `web`: page `/{locale}/compare/{player1}/{player2}`, a "Compare" button on the player page, a "Compare" link in the header (logo without its text under 640px).

## Out of Scope
- More than two players, clubs, career totals, sharing images.
- A new endpoint: the page calls `GET /players/{id}` twice.

## API
### `GET /players/{id}?season=&radarPosition=`
- `radarPosition` (optional): `Goalkeeper`, `Defender`, `Midfielder` or `Attacker`; any other value → `400`.
- When given, the radar uses that position's axes and ranks the player against that position's group of his season (900+ minutes). If he is not in that group (other position), he is added to it for the ranking, so a percentile stays between 0 and 100.
- Without it, nothing changes (spec 03).

## Web
### Routes
- `/{locale}/compare` — two empty slots.
- `/{locale}/compare/{id}-{slug}` — player 1 chosen, slot 2 empty.
- `/{locale}/compare/{id}-{slug}/{id}-{slug}?s1=2024&s2=2025` — both chosen; `s1` / `s2` pick each player's season (latest when missing).
- Wrong slug → permanent redirect keeping the seasons; unknown player, unknown season or invalid value → localized 404 page. No `loading.tsx` (AGENTS.md).
- Title "Kylian Mbappé vs Erling Haaland · ScoreFoot.gg".

### Layout (compare mockup)
1. **Two player cards** side by side (stacked under 1024px), a 3px top bar in the player's colour (Player 1 Accent `#3DDC84`, Player 2 `#4C9AFF`, DESIGN_SYSTEM §02): photo 64px (48px on mobile) with a 2px ring in that colour, name (link to the player page), club · position · age; a season select and a "Change player" search box; Goals, Assists, Rating (badge), Minutes.
2. **Radar card** "Percentiles vs {position}" (player 1's position): both shapes overlaid at 25% fill, each axis labelled with both percentiles in the players' colours, a legend (name · season) and a note "Both compared with {position} who played 900+ minutes in their season, top 5 leagues". A player under 900 minutes has no shape and a line in the note says so.
3. **Stats card** "Stats per 90 minutes": the player page groups (player 1's groups; goalkeeping only if player 1 is a goalkeeper), one row per stat with player 1's value, the stat name, player 2's value; per-90 value with the total below in Muted; percentages without total. The better value is bold in its player's colour; for fouls committed, yellow cards, red cards and goals conceded the lower value wins; equal values: no highlight.
4. **Empty slot:** a card with the search box "Pick a player to compare" in place of the player card; radar and stats show "Pick a second player to compare".

### Picking players
- The search box is the home search limited to players: choosing a result fills that slot (URL updated, the other slot kept).
- The season select applies at once (same pattern as the leaderboard filters, Apply button without JavaScript).
- Player page: a "Compare" button (Primary button, Gold) in the header card opens `/compare/{this player}` with his season as `s1`.

### Header
- "Compare" link after "Leaderboards", same active underline.
- Under 640px the header shows the logo mark without the "ScoreFoot.gg" text (it no longer fits next to two links and the language switch); the home page still shows the name in big.

### Text
- New namespace `Compare` in `en.json` and `fr.json`; `Header.compare`.

## Acceptance criteria
- [ ] `/en/compare/278-kylian-mbappe/1100-erling-haaland`: Mbappé 25 goals, 7.5; Haaland 27 goals, 7.3; radar key passes 96 vs 21, duels won 84 vs 96; key passes per 90 2.25 (green) vs 0.76; yellow cards per 90 Haaland 0.06 highlighted in blue (lower wins).
- [ ] Mbappé vs Dean Huijsen (defender): Huijsen is drawn on the attacker axes, ranked among attackers; every percentile is between 0 and 100.
- [ ] Jadon Sancho 2025-26 (891 minutes) as player 2: no blue shape, the note says why.
- [ ] `?s1=2022` shows Mbappé's 2022-23 season (PSG) against Haaland 2025-26.
- [ ] Player page "Compare" button → `/en/compare/278-kylian-mbappe?s1=2025`; picking Haaland in slot 2 → the full comparison.
- [ ] `/en/compare/278-x/1100-y` redirects to the right slugs; `/en/compare/999999999-x` and `?s1=1990` show the 404 page; `radarPosition=Winger` → 400 from the api.
- [ ] Header: "Compare" link works; at 390px the header fits (logo mark only), in English and French.
- [ ] `/en` and `/fr` show every label in the right language; no request to a third-party domain; the page loads in under 1 s.
- [ ] Checked in Chrome and Firefox, desktop and 390px wide; screenshots shown to Léonard.

## Tests
- xUnit: `radarPosition` uses that position's axes; a player of another position is added to the group and gets percentiles in 0–100; invalid `radarPosition` refused; no change without it.
- Vitest: compare URL building (slot replace keeps the other slot and seasons), "better value" rule (higher / lower wins / equal / missing).
- Playwright (Chrome + Firefox): Compare button → pick player 2 → comparison; season select; redirect and 404; header at 390px has no horizontal scroll; French labels.

## Decisions (2026-11-03)
1. URL holds both players; each slot has its own player search; Compare button on the player page and a header link.
2. One season per player (`s1`, `s2`), latest by default.
3. Radar on player 1's position axes; both ranked against that position.
4. Per-90 table with totals below, better value in the player's colour (lower wins for fouls, cards, goals conceded).
5. Two player cards with the 4 key numbers.
6. Header under 640px: logo mark only.
7. No new dependency.
