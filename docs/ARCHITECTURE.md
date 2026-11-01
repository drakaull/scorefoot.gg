# Architecture

Every choice below is decided and approved during scoping.

## 01 System Overview
```
Browser ──> web (Next.js, server-rendered pages)
               │  HTTP, internal Docker network
               v
            api (ASP.NET Core, read-only JSON + player/club images)
               │
               v
            db (PostgreSQL)  <── sync (.NET console app) <── API-Football
                                   │
                                   └──> images volume (photos, logos)
```
- The browser only talks to `web`. `web` only talks to `api`. Only `sync` talks to API-Football.
- The website never calls API-Football while a visitor browses (see PRD §07).

## 02 Tech Stack
Major versions below; the exact patch version is pinned at install time and must be at least 2 weeks old.

| Area       | Tool |
|------------|------|
| Frontend   | Next.js 16 (App Router) + TypeScript, Tailwind CSS 4, next-intl (EN default, FR), Lucide icons, Plus Jakarta Sans self-hosted |
| Backend    | ASP.NET Core 10 (LTS) Minimal API, C# |
| Data access| Entity Framework Core 10 + Npgsql |
| Sync       | .NET 10 console app, run by hand or on a schedule |
| Database   | PostgreSQL 18 with `pg_trgm` and `unaccent` extensions (fuzzy, accent-insensitive search) |
| Charts     | Hand-written SVG (radar, form bars), no chart library |
| Auth       | None in v1 |
| Email      | None |
| Hosting    | Not chosen. Everything runs with Docker Compose so it can move to any server |
| Testing    | xUnit (C#), Vitest (TS logic), Playwright (end-to-end, Chrome + Firefox) |
| Runtime images | `node:24` (LTS) for web, `mcr.microsoft.com/dotnet/aspnet:10.0` for api, `postgres:18` |

## 03 Project Structure
```
ScoreFoot.gg/
├─ web/                     # Next.js app (pages, components, i18n messages en.json / fr.json)
├─ server/
│  ├─ ScoreFoot.sln
│  ├─ ScoreFoot.Data/       # EF Core entities, DbContext, migrations (shared by Api and Sync)
│  ├─ ScoreFoot.Api/        # Read-only endpoints + serves images from the volume
│  ├─ ScoreFoot.Sync/       # API-Football client, quota tracking, import + image download
│  └─ ScoreFoot.Tests/      # xUnit tests
├─ docker-compose.yml       # web, api, db (sync runs as a one-off: docker compose run sync)
├─ .env.example             # Variable names only, no values
├─ docs/                    # PRD, design system, architecture, deployment checklist
├─ specs/                   # One spec per feature (NN-name.md)
└─ tasks/                   # plan.md, todo.md, archive/
```

## 04 Data Flow
**Sync (offline, a few times per day until the 3 seasons are complete):**
1. `sync` reads its progress from the database and checks today's remaining quota (API-Football `/status`).
2. It fetches the next batch (leagues, teams, players per page, fixtures, per-match player stats) and upserts it into PostgreSQL.
3. It downloads new player photos and club logos into the images volume.
4. It stops before reaching 100 requests and resumes the next day where it left off.
5. Derived values (percentiles per position, season aggregates) are recomputed in the database after an import.

**A visitor opens a player page:**
1. Browser requests `/en/players/{id}-{slug}` from `web`.
2. `web` (server component) calls `api` `GET /players/{id}?season=2024`.
3. `api` reads PostgreSQL and returns JSON; `web` renders HTML and sends it.
4. Images load from `api` `/media/...`, never from a third-party domain.

**Search:** the search bar calls `web`, which calls `api` `GET /search?q=mbape`; PostgreSQL ranks players and clubs with trigram similarity on unaccented names.

## 05 Data & Privacy
- No visitor accounts, no visitor data stored, no cookies. Language is in the URL (`/en`, `/fr`).
- No analytics, trackers or third-party requests from the browser (fonts and images are self-hosted).
- Stored data: public professional data about players and clubs from API-Football (names, birth dates, nationalities, stats, photos).
- Player photos and club logos are owned by third parties; acceptable for a non-commercial portfolio, to review before any public or commercial launch.
- The API-Football key lives only in `.env` (git-ignored) and is read only by `sync`. It never reaches `web`, `api` or the browser.
- The database port is bound to `127.0.0.1` only.

## 06 Scalability
- Keep features in separate, modular parts
- No new tool, service or dependency without approval and an update to this file
- The season is never hard-coded: switching to a paid plan and the current season means re-running `sync`
- `api` is read-only and stateless, so pages can be cached later if traffic grows
