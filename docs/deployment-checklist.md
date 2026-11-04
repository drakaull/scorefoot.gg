# Deployment Checklist

What must be done before ScoreFoot.gg goes on a public server. Target (spec 07): https://scorefoot.leonard-fontaine.com, on Léonard's VPS behind the portfolio's Caddy. Tick items in the branch that does the work.

## Handled by the portfolio's Caddy (not in this repository)
- HTTPS with an automatic certificate, HTTP redirected to HTTPS.
- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy`; the `Server` header removed.
- No access log.
- It sets `X-Forwarded-For` itself (the visitor's address, replacing any value the visitor sends), `X-Forwarded-Proto` and `X-Forwarded-Host`.

## Security
- [x] Only `web` is reachable, through Caddy on the external network `edge`; nothing is published on the host (`docker-compose.prod.yml`, `ports: !reset []`).
- [x] `api` and `db` stay on the internal Docker network (`api` is not even on `edge`).
- [ ] Strong `POSTGRES_PASSWORD` in the server `.env`, stored in the password manager, never in git.
- [x] The API-Football key is only needed by `sync`, which never runs in production: leave `API_FOOTBALL_KEY` empty on the server.
- [x] Content-Security-Policy with a per-request nonce, sent by Next.js (`src/proxy.ts`); no `X-Powered-By`.
- [x] Redirects use relative `Location` headers, so they keep https and the public host behind the proxy.

## Load
- [x] Rate limit on `/api/search` in `web`: 10 requests per second per visitor, bursts of 20, then 429 with `Retry-After`; IPv6 grouped by /64; addresses in memory only.
- [x] Search answers cached briefly (`Cache-Control: public, max-age=60`).
- [x] `/media` images are sent with `Cache-Control: public, max-age=604800`.
- [ ] A club page loads about 60 images, each streamed through `web` then `api`. Later: let Caddy serve and cache `/media` from the images volume (`/media/{leagues|teams|players}/{id}.png` → `{leagues|teams|players}/{id}.png` at the volume root; numeric ids only).
- [ ] Every page sends all translations to the browser (about 10 KB). Pass only the namespaces client components use (Search, Leaderboards, Compare) to `NextIntlClientProvider`.

## Data and legal
- [ ] Player photos and club logos belong to third parties (clubs, leagues, API-Football). Fine for a non-commercial portfolio; review the rights before any commercial use or wide publicity (ARCHITECTURE.md §05).
- [x] Legal notice: the footer links to the portfolio's page (`https://leonard-fontaine.com/{en|fr}/privacy`), same publisher and host.
- [x] No request logs: `api` logs only warnings, `web` logs no requests; no visitor address is ever written.
- [ ] No cookies, analytics or third-party requests: check the browser network tab on the live site.

## Operations
- [ ] Back up the PostgreSQL volume (`pg_dump`) and the images volume; restore them on the server from the PC exports.
- [x] Container logs capped at 3 × 10 MB (`docker-compose.prod.yml`).
- [ ] `restart: unless-stopped` is set on `db`, `api` and `web`; check the containers come back after a server reboot.
- [x] `NEXT_TELEMETRY_DISABLED=1` is set in the web image; keep it.
- [ ] Docker Compose 2.24 or newer on the server (`!reset` in `docker-compose.prod.yml`).
- [ ] Upgrade the pinned images and packages for security fixes (each version at least 2 weeks old).
