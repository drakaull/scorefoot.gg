# Plan — Spec 01 Data sync

Branch: `feature/data-sync` from `develop`, merged back with `--no-ff` after review and approval.
Each task: build, test, verify, commit. ✋ = checkpoint where Léonard validates before going on.

## Phase 1 — Verify and set up
**T1. Verify the API facts** ✋
- Léonard creates `.env` from `.env.example` and pastes the key himself (never in chat).
- 3 calls: `/fixtures?ids=` (20 finished 2024 Ligue 1 matches), `/players?league=61&season=2024&page=1`, then `/status` before and after to see what counts.
- Save the two JSON answers as test fixtures (they contain no key or personal data). `/status` is not saved (it holds Léonard's email).
- Done when: the spec is updated with confirmed facts, or with a new budget if something differs.

**T2. Choose and approve dependencies** ✋
- List exact versions (published ≥ 2 weeks ago, checked on NuGet / Docker Hub): Npgsql EF Core provider 10, EF Core Design + `dotnet-ef` tool, Microsoft.Extensions.Hosting, xUnit + test SDK, `postgres:18` image, `dotnet/sdk:10.0` and `dotnet/runtime:10.0` images.
- Done when: Léonard approves the list; ARCHITECTURE.md updated if anything changes.

**T3. Scaffold the solution**
- `server/ScoreFoot.sln` with `ScoreFoot.Data`, `ScoreFoot.Sync`, `ScoreFoot.Tests`; nullable on, warnings as errors.
- Done when: `dotnet build` and `dotnet test` pass with zero warnings.

**T4. PostgreSQL in Docker**
- `docker-compose.yml` with `db` (port on 127.0.0.1, named volume), `.env.example`.
- Done when: `docker compose up -d db` is healthy and `psql` connects.

## Phase 2 — Data model
**T5. Entities and first migration**
- All tables from the spec, unique keys on api ids, `pg_trgm` and `unaccent` extensions.
- Done when: migration applies on an empty database; tables listed with `\dt`.

## Phase 3 — Sync engine (tests first)
**T6. API client and budget guard**
- Typed HTTP client, key from environment, 7 s min delay, every call logged in `ApiCall`, never more than the budget.
- Tests: budget reached → no call; key never in logs.

**T7. Task planner**
- Creates tasks per league-season in order; detail tasks in batches of 20 finished matches; player pages from `paging.total`.
- Tests: counts and order from the saved fixtures.

**T8. Parsers and upserts**
- One parser per endpoint, `RawResponse` saved, upsert by api id, all in one transaction per task.
- Tests: each fixture maps to the expected rows; parsing twice gives the same counts.

**T9. `run` command and error handling**
- Main loop, stop on quota/rate errors, mark failed on plan errors, 3 retries on network/5xx, `--retry-failed`.
- Tests: the error cases of the spec.

**T10. Image download**
- Missing logos and photos only, max 2 per second, into the images volume.
- Tests: an existing file is not downloaded again.

**T11. `status` command**
- Progress per league-season, today's usage, row counts, days left. No API call.

## Phase 4 — Real run
**T12. `sync` in Docker Compose + first real run** ✋
- Dockerfile for Sync, `docker compose run --rm sync run`.
- Done when: the first day's run stops at 95 calls, `status` matches, the database has 2024-25 teams, standings and fixtures.

**T13. Daily runs until complete + acceptance** ✋
- Léonard runs it once a day (~9 days). Then check every acceptance criterion of the spec.
- Done when: all criteria are ticked; review, then merge into `develop` after approval.
