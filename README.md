# ScoreFoot.gg

Football stats for the 5 big European leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1), seasons 2022 to 2025. Search any player or club in English or French.

## Features
- **Search** every player and club, typo- and accent-tolerant.
- **Player page:** season numbers, last 5 matches, percentile radar against his position, per-90 stats, club history.
- **Club page:** league position, form, key players, full league table with zones, season results, squad.
- **Leaderboards:** 12 stats, total or per 90, filtered by league, season, position and age; previews on the home page.
- **Compare** two players, each on any season: overlaid radars and per-90 stats.

A portfolio project. Data comes from [API-Football](https://www.api-football.com/), downloaded once into a local database: the site never calls API-Football while you browse.

## Stack
- **web**: Next.js 16, TypeScript, Tailwind CSS 4, next-intl
- **api**: ASP.NET Core 10 Minimal API, read-only
- **sync**: .NET 10 console app that downloads the data and images
- **db**: PostgreSQL 18
- Everything runs with Docker Compose.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Run it locally
Requirements: Docker Desktop, and an API-Football key for the first data download.

```
cp .env.example .env               # then fill in the values
docker compose up -d db
docker compose run --rm sync run   # downloads the data (stops at the daily budget, run again to resume)
docker compose up -d --build       # db, api and web
```
Open http://localhost:3000.

## Tests
```
cd server && dotnet test --solution ScoreFoot.sln   # C# (needs the db)
cd web && npm test                                   # Vitest
cd web && npx playwright test                        # end-to-end, Chrome + Firefox
```

## Docs
- [docs/PRD.md](docs/PRD.md): what the product is and is not
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md): colours, type, components
- [docs/deployment-checklist.md](docs/deployment-checklist.md): before a public launch
- [specs/](specs/): one spec per feature
