# Plan — Spec 06 Compare

Branch: `feature/compare` from `develop`, merged back with `--no-ff` after review and approval. The branch stays local (only `main`, `develop` and tags are pushed).
Each task: build, test, verify, commit. ✋ = checkpoint where Léonard validates before going on.
No new dependency.

## Phase 1 — API (tests first)
**T1. `radarPosition` on `GET /players/{id}`** ✋
- `PlayerPage.LoadAsync` takes an optional radar position; the group is that position's; the player is added to it when he is not a member; invalid value → 400.
- Tests: other position's axes, percentiles in 0–100 for an outsider, invalid value, unchanged without it.
- Checkpoint: Mbappé vs Huijsen and Haaland percentiles from the real api.

## Phase 2 — Web
**T2. Compare helpers (tests first)**
- `src/lib/compare.ts`: route parsing (0, 1 or 2 slugs, `s1` / `s2`), URL building that replaces one slot and keeps the other, "better value" rule.
- Vitest.

**T3. Compare page**
- Route `/[locale]/compare/[[...players]]` (slug redirect, 404 rules, metadata), player cards, empty slot, season select, radar card with two shapes, stats card, `Compare` texts.
- Player search limited to players, filling one slot (search box option).

**T4. Entry points and header**
- "Compare" button on the player page; "Compare" link in the header; logo mark only under 640px.

**T5. End-to-end tests**
- Compare button → pick player 2; season select; redirect and 404; header at 390px without horizontal scroll; French labels; no third-party request. Chrome + Firefox.

## Phase 3 — Check and ship
**T6. Visual check** ✋
- Chrome and Firefox, desktop and 390px: Mbappé vs Haaland, Mbappé vs Huijsen, Sancho as player 2, empty slots. Screenshots shown to Léonard.

**T7. Acceptance, docs, review** ✋
- Every acceptance criterion of spec 06 ticked; DESIGN_SYSTEM.md (comparator usage, header under 640px); README features list.
- Review, then merge into `develop` after approval.
