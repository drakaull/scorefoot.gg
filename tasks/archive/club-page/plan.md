# Plan — Spec 04 Club page

Branch: `feature/club-page` from `develop`, merged back with `--no-ff` after review and approval. The branch stays local (only `main`, `develop` and tags are pushed).
Each task: build, test, verify, commit. ✋ = checkpoint where Léonard validates before going on.
No new dependency.

## Phase 1 — Data and API (tests first, against the test database)
**T1. Clubs without a standing leave search; player answers get `hasPage`**
- `Search.RunAsync`: a club appears only if it has a standing.
- `PlayerPage`: `SeasonClub` and `ClubRef` get `HasPage`.
- Tests: U21-style club absent from search; player history with a club without standing → `hasPage: false`.

**T2. Zones**
- `Zones.FromDescription(string?)` → `ucl`, `uecl`, `uel`, `playoff`, `relegation` or null, rules of the spec table.
- Test: one case per label found in the database (the 25 labels) plus null and empty.

**T3. Club profile, standing, table**
- `ClubPage.cs`: identity, seasons with a standing, chosen season (latest by default), league, `standing`, `previous` (season before, any league), full `table` with zones.
- 404 cases: unknown id, club without standing, season without standing.
- Tests: latest season default, promoted club (`previous` null, one season), 404 cases, table order and the club's zone.

**T4. Form and results**
- Every league match of the club in the season, most recent first, score from the club's side; `form` = first 5.
- Tests: order, away score flipped, unplayed fixture (no score) left out.

**T5. Key players and squad**
- Played lines of the club and season: squad order (position, then minutes), key players (ties by minutes, 900 minutes for best rated, zero values → null).
- Tests: order, empty lines ignored, ties, 900-minute rule, zero → null.

**T6. `GET /clubs/{id}`** ✋
- Endpoint with the 404 rules.
- Done when: tests pass; 20 clubs × latest and oldest season under 200 ms; checkpoint with Léonard on the spec examples (Real Madrid figures and key players, Getafe / Real Sociedad / relegation zones, Oviedo one season, Crystal Palace U21 404 and out of search, Poussin's Red Star without page).

## Phase 2 — Web
**T7. Club data and formatting (tests first)**
- `src/lib/club.ts`: response types, `fetchClub` (server only), helpers: ordinal (en / fr), rank delta (better rank = positive), round label ("Regular Season - 38" → "MD 38").
- Vitest for every helper.

**T8. Route, states and texts**
- `src/app/[locale]/clubs/[slug]/page.tsx` like the player route (slug redirect, 404 rules, metadata), `error.tsx`, `Club` namespace in `en.json` and `fr.json`.

**T9. Header, stat cards, form and key players**
- `ResultChip` component; header with league chip and season tabs (`LinkPending`); 4 stat cards; last 5 matches; key players.

**T10. League table, results and squad**
- `ZoneBar`, table with legend, results with native `<details>`, squad grouped by position; mobile columns as in the spec.
- Player page: club names without a page as plain text (`hasPage`).

**T11. End-to-end tests**
- Search → club page; season tab; wrong slug redirect; U21 404; "Show all 38 matches"; player page → club link; Poussin's Red Star not a link; French labels; no third-party request. Chrome + Firefox.

## Phase 3 — Check and ship
**T12. Visual check** ✋
- Chrome and Firefox, desktop and 390 px: Real Madrid, a promoted club (Oviedo), a Bundesliga club in the play-off zone. Screenshots shown to Léonard.

**T13. Acceptance, docs, review** ✋
- Every acceptance criterion of spec 04 ticked; DESIGN_SYSTEM.md (zone colours, result chip), ARCHITECTURE.md if needed.
- Review, then merge into `develop` after approval.
