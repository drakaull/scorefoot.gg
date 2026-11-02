# Plan — Spec 03 Player page

Branch: `feature/player-page` from `develop`, merged back with `--no-ff` after review and approval. The branch stays local (only `main`, `develop` and tags are pushed).
Each task: build, test, verify, commit. ✋ = checkpoint where Léonard validates before going on.
No new dependency.

## Phase 1 — Data fixes
**T1. "Forward" → "Attacker" at import**
- `Importer.FillStatLine` maps the season position "Forward" to "Attacker" (match lines keep G, D, M, F).
- Test: a season answer with "Forward" is stored as "Attacker".
- Then `docker compose build sync` and `docker compose run --rm sync reimport` (no API call).
- Done when: `select count(*) from "PlayerSeasonStats" where "Position" = 'Forward'` → 0; C# tests pass.

**T2. Search leaves out players who never played**
- `Search.RunAsync`: a player appears only if he has a season line with minutes > 0.
- Test: a player with only empty lines is not returned; a player with one played line is.
- Done when: `curl "http://localhost:5080/search?q=heaton"` does not return Tom Heaton (id 2931).

## Phase 2 — API (tests first, against the test database)
**T3. Player profile and seasons**
- `PlayerPage.cs` in `ScoreFoot.Api`: identity, played seasons, chosen season (latest by default), season clubs, `position`, `summary` and `previous` (lines added up, null counts as 0, rating weighted by minutes without null ratings), `history` (played lines only, newest first).
- Unknown id, never-played player, season not played → `null` (the endpoint answers 404).
- Tests: empty lines ignored, two clubs added up, weighted rating, latest season default, 404 cases, Forward/Attacker no longer split.

**T4. Last 5 matches**
- Up to 5 played matches of the season (all the player's clubs), most recent first: opponent (id, name, code, logo), home/away, score from the player's side, minutes, rating, goals and assists (null → 0).
- Tests: order, minutes > 0 filter, away score flipped, null goals → 0.

**T5. Radar percentiles**
- One SQL query per request: group = same season and position, ≥ 900 minutes (constant `MinRadarMinutes`), per-90 values, `percent_rank` per axis, goals conceded inverted, null rating or percentage left out of its axis.
- Axes per position as in the spec; `eligible: false` under 900 minutes; group size returned for the note ("Against 348 attackers…").
- Tests on a small known group: values, ties, null rating, inverted axis, the 900-minute rule.

**T6. Detailed stats and `GET /players/{id}`** ✋
- Stat groups (goalkeeping first for goalkeepers), totals and per 90, percentages without per 90.
- Endpoint `GET /players/{id}?season=`: 404 rules, invalid `season` → 404.
- Done when: tests pass; 20 players × latest and oldest season answer in under 200 ms; checkpoint with Léonard on concrete examples (Mbappé without the PSG 2024-25 line, Tom Heaton absent from search and 404, Semenyo added up, Sancho under 900 minutes).

## Phase 3 — Web
**T7. Player data and formatting (tests first)**
- `src/lib/player.ts`: response types, `fetchPlayer` (server only, `API_URL`, 5 s timeout), helpers: season label (2024 → "2024-25", short "24-25"), age from birth date, delta text, rating colour band, per-90 number format.
- `src/lib/radar.ts`: point coordinates for N axes.
- Vitest for every helper.

**T8. Route, states and texts**
- `src/app/[locale]/players/[slug]/page.tsx`: parse id, wrong slug → permanent redirect keeping `season`, 404 rules, metadata (title and description).
- `error.tsx` (error card with retry). No `loading.tsx`: it would turn 404s and redirects into "200 OK".
- `Player` namespace in `en.json` and `fr.json` (position plurals, labels, messages).

**T9. Header, season tabs and stat cards**
- Header card (photo or initials, chips with club links, age, height), season tabs as links, 4 stat cards with deltas.
- `RatingBadge` component (reused by form, history and later pages).

**T10. Form and radar cards**
- Last 5 matches card; radar card (hand-written SVG, `role="img"` + `aria-label`, group-size note, not-enough-minutes message).

**T11. Detailed stats and club history cards**
- Tables with `<th scope>`, tabular figures; history mobile layout (season in the sub-line, Min and Assists hidden, names truncated).

**T12. End-to-end tests**
- Search → Enter → player page; season tab changes URL and cards; wrong slug redirect; Tom Heaton 404; French labels; no third-party request. Chrome + Firefox.

## Phase 4 — Check and ship
**T13. Visual check** ✋
- Chrome and Firefox, desktop and 390 px: Mbappé, Semenyo, Sancho, a goalkeeper. Screenshots shown to Léonard.

**T14. Acceptance, docs, review** ✋
- Every acceptance criterion of spec 03 ticked; ARCHITECTURE.md data flow updated if needed.
- Review, then merge into `develop` after approval.
