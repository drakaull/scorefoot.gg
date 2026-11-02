# Agent Instructions

Project-specific rules for AI coding agents. They add to the owner's global working rules; they never replace them. Keep this file short: every line is a rule the agent needs.

## 01 Before You Start
- Read docs/PRD.md to understand the product, its goal and what is out of scope
- Read docs/DESIGN_SYSTEM.md before building any UI
- Read docs/ARCHITECTURE.md before creating files or adding tools
- Read the spec in specs/ for the feature you work on
- Check existing code and components before creating new ones

## 02 General Rules
- Only build what the PRD and the approved spec describe. Ask before adding anything
- Follow the design system exactly. No new colours, fonts or sizes
- Reuse existing components. One component, one job
- Don't create unnecessary files
- TypeScript in strict mode in web/. No `any` without a one-line reason
- C# with nullable reference types enabled and warnings as errors in server/
- web/ never queries the database or API-Football: it only calls api/
- Only ScoreFoot.Sync calls API-Football, and it must never exceed the configured daily budget
- Never hard-code a season or a league id: they come from configuration or the database
- Every UI string goes through next-intl, with both en.json and fr.json filled
- Before choosing a library version or writing code against a library, check its current docs with Context7

## 03 Code Guidelines
- Clear, meaningful names
- Handle loading, error and empty states
- Every page works on mobile
- Code, names, comments, commits and docs in English
- Conventional Commits (feat, fix, docs, test, chore...)
- Numbers in tables use tabular figures; ratings always show one decimal
- Images (photos, logos) are always served by api/, never hotlinked
- Pages that can answer 404 or redirect (player, club) have no loading.tsx: it would send "200 OK" first. Show navigation feedback with LinkPending instead

## 04 Security
- No secrets in code: use untracked .env files
- Validate all user input at trust boundaries
- The API-Football key is read only by ScoreFoot.Sync from .env. It never appears in web/, api/, logs or the browser
- api/ is read-only: no endpoint writes to the database
- No cookies, analytics or third-party requests from the browser
- PostgreSQL port bound to 127.0.0.1 only

## 05 Useful Commands
```
docker compose up -d --build       # whole stack: db, api, web on http://localhost:3000
docker compose up -d db            # start PostgreSQL only
docker compose run --rm sync run   # download what is missing (stops at the daily budget), then images
docker compose run --rm sync status   # progress, no API call
docker compose run --rm sync run --retry-failed   # put failed tasks back in the queue first
docker compose run --rm sync reimport   # rebuild players and match rows from saved answers, no API call
cd server && dotnet run --project ScoreFoot.Api   # api on http://localhost:5080 (run .NET commands from server/ so global.json applies)
cd web && npm install && npm run dev        # web on http://localhost:3000, calls the api on http://localhost:5080 (API_URL)
cd server && dotnet test --solution ScoreFoot.sln   # C# tests (needs the db running)
cd web && npm test                 # Vitest
cd web && npm run lint && npm run typecheck
cd web && npx playwright test      # end-to-end, Chrome + Firefox, against the site on :3000 (needs synced data)
```
- `dotnet run` outside Docker reads the POSTGRES_* variables from the shell, not from `.env`: export them first. It has no images (the images volume only exists in Docker), so `/media` answers 404 locally.

## 06 When Unsure
- Check docs/ and specs/ first
- Look at how existing code does it
- Ask instead of guessing

## 07 Keep Docs Current
- A change to the stack, a feature or the design updates the matching file in docs/ in the same branch
- If the owner corrects the same thing twice, add a rule here
