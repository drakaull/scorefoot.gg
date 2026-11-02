# Plan — Spec 02 Site shell and search

Branch: `feature/site-shell-and-search` from `develop`, merged back with `--no-ff` after review and approval.
Each task: build, test, verify, commit. ✋ = checkpoint where Léonard validates before going on.

## Phase 1 — Dependencies and API skeleton
**T1. Approve dependencies** ✋
- Exact versions below, each published before 2026-10-19 (checked on the npm registry, Docker Hub and MCR on 2026-11-02).

| Dependency | Version | Use |
|---|---|---|
| next | 16.4.2 | Web framework (App Router) |
| react, react-dom | 19.3.1 | UI library (required by Next.js) |
| typescript | 6.0.3 | Types. Not 7.0.2: its package no longer exposes the JavaScript API that Next.js uses for type checking |
| @types/react, @types/react-dom | 19.3.0 | React types |
| @types/node | 24.19.2 | Node 24 types |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | Styling |
| next-intl | 4.14.9 | EN / FR routing and messages |
| lucide-react | 1.59.0 | Icons (search, close) |
| eslint | 10.13.0 | Lint |
| eslint-config-next | 16.4.2 | Next.js lint rules |
| vitest | 5.0.5 | Unit tests (pure TS logic, no DOM library needed) |
| @playwright/test | 1.64.1 | End-to-end tests, Chrome + Firefox |
| Plus Jakarta Sans | font files (OFL licence) | Loaded with `next/font/local` from `web/src/fonts/`, no runtime request |
| `node` image | 24.22.0-alpine | Web build and runtime |
| `mcr.microsoft.com/dotnet/aspnet` image | 10.0.13 | Api runtime (same patch as the sync runtime) |

- Deliberately not used: `Npgsql...Trgm` plugin (search is one parameterized SQL query using `similarity()`), `Microsoft.AspNetCore.Mvc.Testing` (search and path filtering are tested as plain classes against the test database), a UI component kit, a data-fetching library.
- Done when: Léonard approves; ARCHITECTURE.md pinned table updated.

**T2. Scaffold `ScoreFoot.Api`**
- Minimal API project in `server/`, added to the solution, references `ScoreFoot.Data`; `GET /health` checks the database.
- Dockerfile (sdk 10.0.402 → aspnet 10.0.13, user `app`); Compose service `api` on `127.0.0.1:5080`, images volume mounted read-only.
- Done when: `dotnet build` has zero warnings; `curl http://localhost:5080/health` → 200 both with `dotnet run` and in Compose.

## Phase 2 — API (tests first)
**T3. Search query**
- `PlayerSearch` / `ClubSearch` in the api: normalize with `SearchText.Normalize`, rank prefix → word prefix → trigram ≥ 0.3, ties by minutes in the latest season; 6 players, 4 clubs; clubs also by `Code`.
- Tests (test database): prefix before contains, stars before reserves, accents and case, `ø` letters, club code, limits.

**T4. `GET /search` endpoint**
- Trim, 2–50 characters else `400`; JSON shape from the spec (photo/logo as `/media/...` or null).
- Done when: `curl "localhost:5080/search?q=mbap"` returns Mbappé first; 20 timed queries all under 100 ms.

**T5. `GET /media/{**path}`**
- Pure path filter (folders `leagues|teams|players`, `.png`/`.svg`, no `..`) + file response with `Cache-Control: public, max-age=604800`.
- Tests: allowed paths, traversal attempts, wrong extensions.

## Phase 3 — Web
**T6. Scaffold `web/`**
- Hand-written `package.json` with the exact versions above (`save-exact`), TypeScript strict, Tailwind 4 with the design system colours as theme tokens, Plus Jakarta Sans via `next/font/local`.
- Done when: `npm run build`, `npm run lint` and `npm test` pass.

**T7. Languages and layout**
- next-intl routing (`/` → `/en`, `/en`, `/fr`), `messages/en.json` + `fr.json`, header with logo and `EN · FR` switch keeping the page, footer, styled 404.

**T8. Home hero and search bar (static)**
- Hero and bar as in the approved mockup, `Ctrl+K` chip hidden on mobile.

**T9. Server bridge to the api**
- `/api/search` route handler calling `API_URL` (server-only variable), `/media/*` rewrite to the api.
- Done when: the browser network tab shows only `localhost:3000`.

**T10. Search combobox (tests first for the logic)**
- 150 ms debounce, stale-answer guard, results dropdown, keyboard (`Ctrl/Cmd+K`, arrows, `Enter`, `Esc`), ARIA combobox, loading / empty / error states, initials and code-chip fallbacks.
- Vitest: slug building, stale-answer guard.

## Phase 4 — Run, test, check
**T11. Web in Docker Compose**
- Dockerfile (node 24.22.0-alpine, Next standalone output, non-root), Compose service `web` on `127.0.0.1:3000`.
- Done when: `docker compose up -d --build` starts db, api and web; the site answers.

**T12. End-to-end tests**
- Playwright, Chrome + Firefox: type → results → `Enter` → player URL; language switch; `Ctrl+K`.

**T13. Visual check** ✋
- Chrome and Firefox, desktop and 390 px; screenshots shown to Léonard; wait for his opinion.

**T14. Acceptance, docs, review** ✋
- Every acceptance criterion of spec 02 ticked.
- Docs: ARCHITECTURE.md (pinned versions, api and web), AGENTS.md commands confirmed, `docs/deployment-checklist.md` created (rate limiting, caching, image rights), short `README.md`.
- Review, then merge into `develop` after approval.
