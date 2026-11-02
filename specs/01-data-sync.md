# Spec 01 — Data sync

Status: approved (2026-11-02).

## Goal
Fill our PostgreSQL database with everything the v1 pages need (PRD §05) for the top 5 leagues over seasons 2022-23, 2023-24 and 2024-25, using the API-Football free plan, without ever exceeding its quota.

## Scope
- Database schema (EF Core entities + first migration) in `ScoreFoot.Data`.
- A .NET console app `ScoreFoot.Sync` with two commands: `run` and `status`.
- Docker Compose services `db` (PostgreSQL 18) and `sync` (one-off).
- Download of player photos and club logos into the images volume.

## Out of Scope
- Derived values (percentiles, rankings): computed by the specs that need them (player page, leaderboards).
- Live or current-season data, other competitions.
- Automatic scheduling: `run` is launched by hand once a day (Windows Task Scheduler can come later).
- The `api` and `web` projects.

## Configuration
| Setting | Where | Value |
|---|---|---|
| `API_FOOTBALL_KEY` | `.env` (git-ignored) | the key, never logged |
| `DATABASE_URL` / connection string | `.env` | local PostgreSQL |
| Leagues | `appsettings.json` | 39 Premier League, 140 La Liga, 135 Serie A, 78 Bundesliga, 61 Ligue 1 |
| Seasons | `appsettings.json` | 2024, 2023, 2022 (processed in this order) |
| Daily budget | `appsettings.json` | 95 requests (5 kept for manual tests) |
| Min delay between API calls | `appsettings.json` | 7 s (free plan is reported at 10 requests/minute) |

`.env.example` lists the variable names with empty values.

## API-Football endpoints used
Facts from API-Football guides; items marked (verify) are checked in the first task with a real call.
| Data | Endpoint | Calls per league-season |
|---|---|---|
| Quota left | `GET /status` | not counted (verify) |
| Clubs + logos | `GET /teams?league&season` | 1 |
| Table | `GET /standings?league&season` | 1 |
| Match list | `GET /fixtures?league&season` | 1 |
| Match details (events, lineups, team stats, player stats with ratings) | `GET /fixtures?ids=a-b-c…` up to 20 ids (verify) | 16–19 |
| Players (profile, photo, season stats per club) | `GET /players?league&season&page=N`, 20 per page | ~30–35 |

**Budget estimate:** ~55 calls per league-season → ~280 per season → ~840 for 3 seasons → **about 9 days** at 95 a day. Season 2024-25 is complete after about 3 days.

Images (`media.api-sports.io`) are reported as not counted in the quota but rate limited: download at most 2 per second, and only images we do not have yet.

## Data model
- `League` (api id, name, country, logo)
- `Team` (api id, name, short code, country, logo path)
- `Player` (api id, name, first/last name, birth date, nationality, height, weight, photo path)
- `PlayerSeasonStat` (player, team, league, season, position, appearances, minutes, rating, goals, assists, shots, shots on target, passes, key passes, pass accuracy, dribbles attempted/success, tackles, interceptions, duels won/total, fouls, yellow, red). One row per player **per club** per season, so club history comes from our own data.
- `Fixture` (api id, league, season, round, kickoff UTC, home team, away team, score, status)
- `FixturePlayerStat` (fixture, player, team, minutes, position, rating, goals, assists, shots, passes, dribbles, tackles…)
- `Standing` (league, season, team, rank, points, played, won, drawn, lost, goals for/against, form)
- `RawResponse` (endpoint, parameters, fetched at, JSON body as `jsonb`): every API answer is kept, so we can re-parse later without spending quota.
- `SyncTask` (type, league, season, page or fixture ids, status pending/done/failed, attempts, last error)
- `ApiCall` (UTC timestamp, endpoint, HTTP status): used to count today's requests.

Names stored as returned by the API; a lower-case unaccented copy is stored for search.

## How `run` works
1. Read today's count from `ApiCall` (and `/status` if it is free). Stop if the budget is reached.
2. If no tasks exist for a league-season, create them in order: teams → standings → fixtures → players page 1. Fixture-detail tasks are created after the match list arrives (finished matches only, in batches of 20). Further player pages are created after page 1 gives `paging.total`.
3. Take the next pending task (season order 2024 → 2023 → 2022, then league order), call the API, wait the min delay.
4. In one database transaction: save the `RawResponse`, upsert the parsed rows, mark the task done.
5. Download missing images for the rows just saved.
6. Loop until the budget is reached or no task is left. Print a summary.

## How `status` works
Prints, without calling the API: requests used today / budget, tasks done / total per league-season, row counts (players, fixtures, fixture player stats), estimated days left.

## Errors
- Response with a non-empty `errors` object about quota or rate limit → stop the run cleanly, task stays pending.
- Other `errors` (e.g. plan restriction) → task marked failed with the message, run continues with the next task.
- Network error or HTTP 5xx → retry up to 3 times (10 s, 30 s, 60 s), then mark failed.
- Crash mid-task → the transaction rolls back, the task is still pending and is retried on the next run.
- Players returned twice across pages (reported API bug) → upsert by api id, so no duplicates.
- `run --retry-failed` puts failed tasks back to pending.

## Acceptance criteria
- [ ] `docker compose up -d db` starts PostgreSQL 18, reachable only on 127.0.0.1.
- [ ] `docker compose run --rm sync run` never makes more than the daily budget, even when run twice the same day.
- [ ] Killing the run mid-way and restarting it loses nothing and duplicates nothing.
- [ ] After the 3 seasons are synced: 5 leagues × 3 seasons of teams, standings and finished fixtures exist; every finished fixture has player stats; each league-season has at least 450 players.
- [ ] Every team has a logo file and at least 95% of players have a photo file in the images volume.
- [ ] The API key never appears in logs, the database or git.
- [ ] `status` shows progress without spending quota.

## Tests (xUnit)
- Budget guard: with 95 calls logged today, no call is made.
- Task planning: fixtures list → correct number of detail tasks of max 20 ids, finished matches only.
- Parsing: a saved sample of each endpoint's JSON maps to the expected rows (fixtures in `ScoreFoot.Tests/Fixtures/`, real responses with no key inside).
- Upsert: the same response parsed twice gives the same row counts.
- Error handling: quota error stops the run; plan error marks one task failed and continues.

## First task: verify the API facts
With 3 real calls (out of 100): `/status` (counts or not?), `/fixtures?ids=` with 20 ids from 2024 (allowed on free plan? contains players and ratings?), `/players?league=61&season=2024&page=1` (20 per page, `paging.total`, stats fields). Answers are saved as test fixtures and this spec is updated if something differs.
