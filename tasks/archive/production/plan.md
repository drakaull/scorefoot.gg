# Plan — Spec 07 Production

Branch: `feature/production` from `develop`, merged back with `--no-ff` after review and approval, then release **v1.0.2**. The branch stays local.
Each task: build, test, verify, commit. ✋ = checkpoint where Léonard validates before going on.
No new dependency.

**T1. CSP with nonce** — `proxy.ts` composes next-intl and the CSP; the locale layout calls `connection()`. Done when every page loads in Chrome and Firefox with no CSP violation (end-to-end test listening to the console) and each response has a fresh nonce.

**T2. Redirects behind the proxy** — fix the trailing `?` on the compare redirect; end-to-end check that every redirect `Location` is relative.

**T3. Search rate limit (tests first)** — token bucket in the `/api/search` route handler (10/s, burst 20, 429 + `Retry-After`), IPv4 / IPv6 /64 keys from `X-Forwarded-For`, idle entries dropped, `Cache-Control: public, max-age=60`. Vitest for the bucket and keys.

**T4. Legal notice link** — footer link to the portfolio's privacy page by language.

**T5. Production compose** — `docker-compose.prod.yml`, `.env.example` line; `docker compose config` check; local run with a test `edge` network (reachable from `edge`, ports closed on the host).

**T6. No request logs** — browse and search, then check `docker compose logs api web` holds no IP.

**T7. Acceptance, docs, review, release** ✋ — checklist and architecture docs, spec criteria ticked, review, merge into `develop`, release v1.0.2 after Léonard's yes, hand-over facts for the portfolio assistant.
