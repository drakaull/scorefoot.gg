# Plan — Spec 05 Leaderboards

Branch: `feature/leaderboards` from `develop`, merged back with `--no-ff` after review and approval. The branch stays local (only `main`, `develop` and tags are pushed).
Each task: build, test, verify, commit. ✋ = checkpoint where Léonard validates before going on.
No new dependency.

## Phase 1 — API (tests first, against the test database)
**T1. Leaderboard query**
- `Leaderboard.cs`: parameters (stat, season, league, position, age, mode) with validation; one row per player and season from `SeasonTotals`; position from the most-minutes line; age on 1 July; 900-minute rule; order (value, fewer minutes, name); 50 rows.
- Tests: the cases listed in the spec (adding-up, league filter, age edges, ties, limit, per-90 refused for rating and minutes, invalid values).

**T2. Last club and endpoint** ✋
- Club shown = club of the player's last match of the season (in the filtered league); `GET /leaderboards/{stat}` with 404 for an unknown stat and 400 for any invalid filter.
- Done when: tests pass; 20 filter combinations under 200 ms; checkpoint with Léonard on the spec examples (goals podium, Yamal on rating, Premier League filter, goalkeepers on saves, u21, per 90).

## Phase 2 — Web
**T3. Leaderboard data and URL helpers (tests first)**
- `src/lib/leaderboard.ts`: types, filter parsing from the URL, URL building that keeps filters, active filters line.
- Vitest for each.

**T4. Leaderboard page**
- Route `/{locale}/leaderboards/[stat]` (+ redirect from `/leaderboards`), stat chips, filter form (client auto-submit, Apply without JS), Total / Per 90 switch, podium, table, empty state, `Leaderboards` texts in `en.json` and `fr.json`.

**T5. Home preview cards and header link**
- 3 cards on the home page (left out if the api fails); "Leaderboards" link in the header with its active state.

**T6. End-to-end tests**
- Header link, stat tab, filter change, per-90 switch, redirect and 404, home card link, French labels, no third-party request. Chrome + Firefox.

## Phase 3 — Check and ship
**T7. Visual check** ✋
- Chrome and Firefox, desktop and 390 px: home, goals, rating with filters, empty state. Screenshots shown to Léonard.

**T8. Acceptance, docs, review** ✋
- Every acceptance criterion of spec 05 ticked; DESIGN_SYSTEM.md (podium, stat chips, filter selects) and ARCHITECTURE.md if needed.
- Review, then merge into `develop` after approval.
