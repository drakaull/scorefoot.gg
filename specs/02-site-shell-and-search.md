# Spec 02 — Site shell and search

Status: approved 2026-11-02.

## Goal
First visible version of ScoreFoot.gg: the home page with the big search bar (dpm.lol style) that finds any player or club of the database as you type, in English and French. It also lays the foundations every later page reuses: the `api` project, the `web` project, the layout and the image pipeline.

## Scope
- `ScoreFoot.Api` (ASP.NET Core 10 Minimal API, read-only): `GET /search`, `GET /media/{**path}`, `GET /health`.
- `web` (Next.js 16): layout (header, footer), language switch, home page with hero + search, styled 404 page.
- Docker Compose services `api` and `web`; both run with `docker compose up -d --build`.
- Design system applied: colours, Plus Jakarta Sans self-hosted, spacing, components from docs/DESIGN_SYSTEM.md.

## Out of Scope
- Player and club pages (specs 03 and 04). Search results already link to `/{locale}/players/{id}-{slug}` and `/{locale}/clubs/{id}-{slug}`; until those specs ship, these URLs show the 404 page.
- Home preview cards (top scorers, standings, best rated): they come with the leaderboards spec.
- Search history, favourites, a full search results page.
- Rate limiting and caching (noted in docs/deployment-checklist.md for a public launch).

## API
### `GET /search?q={text}`
- `q` is trimmed; 2 to 50 characters, otherwise `400` with a short error message.
- Normalized with `SearchText.Normalize` (same as stored names), so accents and case do not matter.
- Players: match on `NameSearch` (name + first + last name). Clubs: match on `NameSearch` or `Code` (so "psg" finds Paris Saint Germain).
- Ranking: names starting with the query first, then any word starting with it, then the rest: substring or `pg_trgm` word similarity (`<%`, default threshold 0.6, so typos like "mbape" still match; whole-name similarity is too low on long names). Ties: closest word similarity, then minutes played in the player's latest season (stars before reserves).
- Limits: 6 players, 4 clubs.
- Response:
```json
{
  "players": [{ "id": 278, "name": "Kylian Mbappé", "photo": "/media/players/278.png",
                "club": "Real Madrid", "position": "Attacker", "season": 2025 }],
  "clubs":   [{ "id": 541, "name": "Real Madrid", "logo": "/media/teams/541.png",
                "league": "La Liga", "country": "Spain" }]
}
```
  `club`, `position` and `season` come from the player's most recent season line; `league` from the club's most recent standing.

### `GET /media/{**path}`
- Serves files from the images volume (`/data/images`), e.g. `/media/players/278.png`.
- Only `leagues/`, `teams/`, `players/` and numeric `.png` file names (`players/278.png`, the only files sync writes); anything else (including `..` and `.svg`, which can carry scripts) → `404`. Header `X-Content-Type-Options: nosniff`.
- `Cache-Control: public, max-age=604800` (images never change).

### `GET /health`
- `200` when the database answers. Used by Compose.

## Web
### Routing and languages
- `/` redirects to `/en`. Routes: `/en`, `/fr`. Language is only in the URL (no cookie), per ARCHITECTURE.md.
- Header: logo (links home), language switch `EN · FR` that keeps the current page.
- All text in `messages/en.json` and `messages/fr.json`.

### Home page
- Hero: mark + "ScoreFoot.gg" (Display 56px, 36px on mobile), tagline below.
- Search bar as in the mockup: search icon, placeholder "Search a player or a club…", `Ctrl+K` hint chip (hidden on mobile).

### Search behaviour
- The browser calls `web` (`/api/search`), which calls `api`; the `api` URL is never exposed to the browser.
- Requests start at 2 characters, 150 ms after the last key press; an older answer never replaces a newer one.
- Dropdown with two groups, "Players" and "Clubs": photo or logo (32px), name in 600, Muted sub-line (club · position, or league · country).
- Keyboard: `Ctrl+K` / `Cmd+K` focuses the bar from anywhere; ↑ ↓ move, `Enter` opens the highlighted result (first one by default), `Esc` closes.
- States: loading (subtle spinner in the bar), no result ("No player or club found for “xyz”"), error ("Search is unavailable, try again").
- Accessible: combobox pattern (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, results as `listbox`/`option`).

### Images
- A Next.js route handler `/media/[...path]` streams images from the `api` (same path rule), so images come from our own domain. Not a `rewrites` entry: it would freeze the api address at build time.
- Missing photo → initials circle (as in the mockup); missing logo → club code chip.

## Acceptance criteria
- [ ] `docker compose up -d --build` starts `db`, `api` and `web`; the site answers on http://localhost:3000.
- [ ] Typing `mbap` shows Kylian Mbappé first; `erling` finds Erling Haaland; `odegaard` finds Martin Ødegaard; `psg` finds Paris Saint Germain.
- [ ] A query under 2 or over 50 characters returns `400` from the api and shows nothing in the UI.
- [ ] `/media/../appsettings.json` and `/media/players/x.exe` return `404`.
- [ ] Search answers in under 100 ms locally (api timing, measured on 20 queries).
- [ ] Keyboard-only use works: `Ctrl+K`, arrows, `Enter`, `Esc`.
- [ ] `/en` and `/fr` show every text in the right language; switching keeps the page.
- [ ] No request to any third-party domain in the browser network tab (fonts and images are local).
- [ ] Checked in Chrome and Firefox, desktop and 390px wide; screenshots shown to Léonard.

## Tests
- xUnit (against the test database): ranking (prefix before contains, stars before reserves), accent and case insensitivity, club code match, input validation, media path filtering.
- Vitest: slug building (`Kylian Mbappé` → `kylian-mbappe`), stale-answer guard.
- Playwright (Chrome + Firefox): type → see results → `Enter` → lands on the player URL; language switch; `Ctrl+K`.

## Decisions (2026-11-02)
1. Home v1 = hero + search only; preview cards come with the leaderboards spec.
2. Result links point to the future player and club URLs (404 until specs 03 and 04).
3. Limits: 6 players, 4 clubs. Names: full common names from match lines ("Achraf Hakimi").
4. New dependencies still to approve, with exact versions, in the plan: Next.js 16, React, Tailwind CSS 4, next-intl, Lucide icons, Plus Jakarta Sans font files, Vitest, Playwright, `node:24` image, `dotnet/aspnet:10.0` image.
