import { apiUrl, validQuery } from "@/lib/api";
import { createRateLimiter, visitorKey } from "@/lib/rate-limit";

// 10 searches per second per visitor, bursts of 20 (typing fast stays well below). In memory only.
const limiter = createRateLimiter({ rate: 10, burst: 20, idleMs: 60_000 });

export async function GET(request: Request) {
  // In production only the reverse proxy reaches web, and it sets X-Forwarded-For itself.
  const turn = limiter.take(visitorKey(request.headers.get("x-forwarded-for")));
  if (!turn.ok) {
    return Response.json({ error: "too many searches" }, { status: 429, headers: { "Retry-After": String(turn.retryAfter) } });
  }

  const q = validQuery(new URL(request.url).searchParams.get("q"));
  if (!q) return Response.json({ error: "q must be 2 to 50 characters long" }, { status: 400 });

  try {
    const res = await fetch(`${apiUrl()}/search?q=${encodeURIComponent(q)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return Response.json({ error: "search failed" }, { status: 502 });
    return Response.json(await res.json(), { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return Response.json({ error: "search unavailable" }, { status: 502 });
  }
}
