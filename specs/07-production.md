# Spec 07 — Production

Status: approved 2026-11-04.

## Goal
Make ScoreFoot ready to be served on https://scorefoot.leonard-fontaine.com from Léonard's VPS (OVH, Ubuntu 24.04, 2 vCores, 4 GB RAM), behind the portfolio's existing Caddy (Docker, project `portfolio-site`, automatic HTTPS, no access log). Caddy joins an external Docker network `edge` and forwards every request to `scorefoot-web:3000`. The repository is cloned in `~/scorefoot` (compose project `scorefoot`); `sync` never runs in production. Requested by the portfolio's deployment assistant; released as **v1.0.2**.

## Scope
1. `docker-compose.prod.yml`, used on top of `docker-compose.yml`.
2. A Content-Security-Policy with a per-request nonce, sent by Next.js.
3. Checks that redirects and generated URLs stay relative behind the proxy.
4. A rate limit on the search.
5. No request logs anywhere.
6. A "Legal notice & privacy" link to the portfolio's page.
7. Docs, release, and the facts the portfolio assistant needs.

## Out of Scope
- Database schema and the `images` volume format: unchanged (both are restored from the PC exports).
- Headers Caddy already sets: `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, removal of `Server`.
- Serving `/media` from Caddy (later; this spec only documents the URL → file mapping).
- A legal page inside ScoreFoot (the portfolio's covers the same publisher and host).

## 1. `docker-compose.prod.yml`
- `ports: !reset []` on `db`, `api` and `web`: nothing published on the host. Needs Docker Compose **2.24** or newer.
- `web` joins the external network `edge` with the alias `scorefoot-web`, and keeps `default` to reach `api`. `db` and `api` stay on `default` only.
- `logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }` on `db`, `api` and `web`.
- `restart: unless-stopped` stays (it comes from `docker-compose.yml`).
- `.env.example` gets a commented `COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml` line (server only).
- Check: `docker compose config` with both files shows no `ports`, `web` on `default` + `edge` with the alias, the logging options.

## 2. Content-Security-Policy (Next.js)
- `src/proxy.ts` creates a nonce per request, runs the next-intl middleware, and sends the policy on the response and on the request (Next.js reads it there to put the nonce on its scripts):
  `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'nonce-…'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.
- **Expected exception:** `style-src-attr 'unsafe-inline'` if needed. `next/image` writes a `style` attribute on every image, and a nonce cannot cover attributes. This allows style *attributes* only; `<style>` elements still need the nonce. Kept only if the browser reports a violation without it.
- `'unsafe-eval'` in development only (React needs it for its error overlay), never in production.
- A nonce needs per-request rendering: the locale layout calls `connection()`, so no page is pre-rendered. Every page already fetches the api per request except the 404, so the cost is nil.
- `poweredByHeader: false` is already set (no `X-Powered-By`).
- Paths without a page (`/api/...`, `/media/...`, `/_next/...`, files) get no CSP from Next.js; they are JSON, images and static files.

## 3. Behind the proxy
- Measured on 2026-11-04 with the headers Caddy will send: every redirect already has a **relative** `Location` (`/en`, `/en/players/278-kylian-mbappe`, `/en/leaderboards/goals`). There are no absolute URLs (no canonical, Open Graph or sitemap).
- Fix: the compare redirect ends with an empty `?` (`/en/compare/278-kylian-mbappe?`).
- Test: an end-to-end check that the `Location` of each redirect starts with `/`.

## 4. Search rate limit
- In `web`, in the `/api/search` route handler (no new dependency): the browser only reaches `web`, which receives `X-Forwarded-For` straight from Caddy (Caddy replaces any value the visitor sends), and `web` has no published port in production. So there is no trust chain to build towards `api`, which stays unreachable from outside.
- Token bucket per visitor: **10 requests per second, bursts of 20**. Over the limit: **429** with `Retry-After` (seconds).
- Visitor key: the `X-Forwarded-For` address; **IPv6 grouped by its /64 prefix**; no header (local development) → one shared key.
- Addresses live **in memory only** (a `Map` in the server process), are never logged nor written; idle entries are dropped after a minute, so memory stays bounded.
- Search answers: `Cache-Control: public, max-age=60` (was 300).
- Tests: Vitest for the bucket (burst, refill, 429 delay), the IPv6 /64 and IPv4 keys, the expiry of idle entries.

## 5. No request logs
- `api`: `Microsoft.AspNetCore` is already at `Warning` in `appsettings.json` (no line per request) and nothing logs an address. Kept as is.
- `web`: the Next.js standalone server logs no requests; nothing is added.
- Check: after a few searches and page views, `docker compose logs api web` contains no IP address.

## 6. Legal notice link
- Footer link "Legal notice & privacy" / "Mentions légales et vie privée" → `https://leonard-fontaine.com/en/privacy` or `/fr/privacy` by page language; same tab; a plain link (no prefetch, no data sent).

## 7. Docs and release
- `docs/deployment-checklist.md`: tick what is done, move what Caddy does into a "handled by the portfolio's Caddy" note.
- `docs/ARCHITECTURE.md`: production layout (Caddy → `web` over `edge`).
- Release **v1.0.2** (annotated tag, pushed) after Léonard's yes.
- Hand over to Léonard for the portfolio assistant: the headers Next.js sends, the minimum Docker Compose version, and the `/media` mapping (`/media/{leagues|teams|players}/{id}.png` → `{leagues|teams|players}/{id}.png` at the root of the `images` volume; numeric id only, anything else is a 404).

## Acceptance criteria
- [ ] `docker compose config` (both files) shows no published port, `web` on `default` and `edge` with the alias `scorefoot-web`, logs capped at 3 × 10 MB.
- [ ] Locally, with a test `edge` network: the stack starts with both files; a container on `edge` reaches `http://scorefoot-web:3000/en`; ports 3000, 5080 and 5432 are closed on the host.
- [ ] Every page (home, player, club, leaderboards, compare, 404; `/en` and `/fr`) loads in Chrome and Firefox with **no CSP violation** in the console, and the response has the CSP header with a fresh nonce on each request.
- [ ] No `X-Powered-By` header.
- [ ] Every redirect has a relative `Location`; the compare redirect has no trailing `?`.
- [ ] The 21st search request in the same second from one address gets a 429 with `Retry-After`; another address is not affected; two IPv6 addresses of the same /64 share a bucket.
- [ ] Search answers carry `Cache-Control: public, max-age=60`.
- [ ] `docker compose logs api web` holds no IP address after browsing.
- [ ] The footer link goes to `https://leonard-fontaine.com/en/privacy` on `/en` and `/fr/privacy` on `/fr`.
- [ ] All existing tests still pass.

## Decisions (to approve)
1. Rate limit in `web` rather than `api`: `web` is the only service reachable and gets the real address from Caddy directly.
2. `style-src-attr 'unsafe-inline'` only if the browser needs it for `next/image`; `<style>` elements stay nonce-only.
3. Every page rendered per request (needed for the nonce).
4. No new dependency.
