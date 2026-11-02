# Plan — Spec 01 Data sync

Branch: `feature/data-sync` from `develop`, merged back with `--no-ff` after review and approval.
Each task: build, test, verify, commit. ✋ = checkpoint where Léonard validates before going on.

## Phase 1 — Verify and set up
**T1. Verify the API facts** ✋
- Léonard creates `.env` from `.env.example` and pastes the key himself (never in chat).
- Done 2026-11-02: free plan refuses `ids`, Pro accepts it; facts recorded in the spec.

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
- Typed HTTP client, key from environment, configurable min delay (300 ms Pro / 7 s free), every call logged in `ApiCall`, never more than the budget.
- Tests: budget reached → no call; key never in logs.

**T7. Task planner**
- Creates tasks per league-season in order; detail tasks in batches of the configured size (20 Pro, 1 free), finished matches only; player pages from `paging.total`.
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
- Done when: the run completes on the Pro plan (~1,450 calls) or stops cleanly at the budget, and `status` matches the database.

**T13. Acceptance** ✋
- Must happen before the Pro plan ends on 2026-12-02. Check every acceptance criterion of the spec.
- Done when: all criteria are ticked; review, then merge into `develop` after approval.
