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
| Database   | PostgreSQL 18 with the `pg_trgm` extension (fuzzy search) on a lower-case, accent-free name column computed in C# (`SearchText.Normalize`), so `unaccent` is not needed |
| Charts     | Hand-written SVG (radar, form bars), no chart library |
| Auth       | None in v1 |
| Email      | None |
| Hosting    | Léonard's VPS (OVH, Ubuntu 24.04), behind the portfolio's Caddy; Docker Compose with `docker-compose.prod.yml` on top (spec 07) |
| Testing    | xUnit (C#), Vitest (TS logic), Playwright (end-to-end, Chrome + Firefox) |
| Runtime images | `node:24` (LTS) for web, `mcr.microsoft.com/dotnet/aspnet:10.0` for api, `postgres:18` |

### Pinned versions (approved 2026-11-02)
Pinned in `server/Directory.Packages.props`, `server/global.json`, `server/dotnet-tools.json` and `docker-compose.yml`.

| Dependency | Version | Use |
|---|---|---|
| .NET SDK | 10.0.402 | Build (`global.json`) |
| Npgsql.EntityFrameworkCore.PostgreSQL | 10.0.3 | EF Core provider for PostgreSQL |
| Microsoft.EntityFrameworkCore.Relational | 10.0.13 | Pinned so every project uses the same EF Core version (Npgsql alone resolves 10.0.4) |
| Microsoft.EntityFrameworkCore.Design | 10.0.13 | Migrations |
| dotnet-ef (local tool) | 10.0.13 | Migrations CLI |
| Microsoft.Extensions.Hosting | 10.0.13 | Config, logging, DI in the console app |
| Microsoft.Extensions.Http | 10.0.13 | Typed `HttpClient` |
| xunit.v3 | 4.0.2 | Tests, run with Microsoft.Testing.Platform (set in `global.json`, so `xunit.runner.visualstudio` and `Microsoft.NET.Test.Sdk` are not needed) |
| `postgres` image | 18.6 | Database |
| `mcr.microsoft.com/dotnet/sdk` image | 10.0.402 | Build stage |
| `mcr.microsoft.com/dotnet/runtime` image | 10.0.13 | Sync runtime |
| `mcr.microsoft.com/dotnet/aspnet` image | 10.0.13 | Api runtime |

Deliberately not used: a `.env` loader (Compose passes variables), Testcontainers (tests use the Compose database), a ready-made API-Football client, the Npgsql trigram plugin (search is one parameterized SQL query), `Microsoft.AspNetCore.Mvc.Testing` (api logic is tested as plain classes).

### Web pinned versions (approved 2026-11-02)
Pinned exactly in `web/package.json` and the web Dockerfile.

| Dependency | Version | Use |
|---|---|---|
| next, eslint-config-next | 16.4.2 | Framework, lint rules |
| react, react-dom | 19.3.1 | UI |
| typescript | 6.0.3 | Types (7.x no longer exposes the JS API Next.js uses) |
| @types/react, @types/react-dom | 19.3.0 | React types |
| @types/node | 24.19.2 | Node 24 types |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | Styling |
| next-intl | 4.14.9 | EN / FR routing and messages |
| lucide-react | 1.59.0 | Icons |
| eslint | 10.13.0 | Lint |
| vitest | 5.0.5 | Unit tests |
| @playwright/test | 1.64.1 | End-to-end tests |
| Plus Jakarta Sans | font files in `web/src/fonts/` (OFL) | Loaded with `next/font/local` |
| `node` image | 24.22.0-alpine | Web build and runtime |

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
**Sync (offline, run by hand; one run downloads everything on the Pro plan):**
1. `sync` reads its progress from the database and counts today's calls from its own log.
2. It fetches the next batch (leagues, teams, players per page, fixtures, per-match player stats) and upserts it into PostgreSQL.
3. It downloads new player photos and club logos into the images volume.
4. It stops at the configured daily budget and resumes on the next run where it left off.
5. Nothing is precomputed: season totals and percentiles per position are computed by `api` on each request from the stored lines (under 100 ms locally).

**A visitor opens a player page:**
1. Browser requests `/en/players/{id}-{slug}` from `web`.
2. `web` (server component) calls `api` `GET /players/{id}?season=2025`.
3. `api` reads PostgreSQL and returns JSON; `web` renders HTML and sends it.
4. Images load from `web` `/media/...`, a route handler that streams them from `api` `/media/...`, never from a third-party domain.

**Search:** the search bar calls `web` `/api/search` (a route handler), which calls `api` `GET /search?q=mbape`; PostgreSQL ranks players and clubs with trigram word similarity on unaccented names. The `api` address (`API_URL`) is read at runtime on the server and never reaches the browser.

**Production (spec 07):** Caddy (portfolio, HTTPS) → `web` over the external Docker network `edge` (alias `scorefoot-web`); `api` and `db` stay on the project network and nothing is published on the host. Next.js sends a Content-Security-Policy with a per-request nonce, so every page is rendered per request. The search is rate limited in `web` (in memory, per visitor).

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
