# Deployment Checklist

What must be done before ScoreFoot.gg goes on a public server. Each item links to the reason it exists. Tick them in the branch that does the work.

## Security
- [ ] Put a reverse proxy with HTTPS (TLS certificate) in front of `web`. Only `web` is exposed; `api` and `db` stay on the internal Docker network.
- [ ] Remove the `api` port mapping (`127.0.0.1:5080`) from `docker-compose.yml` on the server: only `web` needs to reach it.
- [ ] Keep the `db` port bound to `127.0.0.1` (or remove it). Never `0.0.0.0`.
- [ ] Strong `POSTGRES_PASSWORD` in the server `.env`, stored in the password manager, never in git.
- [ ] The API-Football key is only needed by `sync`. Do not copy it to the server unless `sync` runs there.
- [ ] Add security headers on `web` (Content-Security-Policy with `'self'` only, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`).

## Load
- [ ] Rate limiting on `/api/search` (per IP, e.g. 10 requests per second), at the reverse proxy or in `web`. Spec 02 left it out.
- [ ] Cache `/api/search` answers briefly (the data only changes after a sync).
- [ ] Check that `/media` images are cached by the browser and the proxy (`Cache-Control: public, max-age=604800` is already sent).
- [ ] A club page loads about 60 images, each streamed through `web` then `api`. Let the reverse proxy serve and cache `/media` directly from the images volume so they do not compete with page rendering.

## Data and legal
- [ ] Player photos and club logos belong to third parties (clubs, leagues, API-Football). Fine for a non-commercial portfolio; review the rights before any commercial use or wide publicity (ARCHITECTURE.md §05).
- [ ] Legal notice page (publisher name and host), required in France for a public site.
- [ ] No cookies, analytics or third-party requests: check the browser network tab on the live site.

## Operations
- [ ] Back up the PostgreSQL volume (`pg_dump`) and the images volume before and after each sync.
- [ ] `restart: unless-stopped` is set on `db`, `api` and `web`; check the containers come back after a server reboot.
- [ ] `NEXT_TELEMETRY_DISABLED=1` is set in the web image; keep it.
- [ ] Upgrade the pinned images and packages for security fixes (each version at least 2 weeks old).
