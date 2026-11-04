import { isIP } from "node:net";

type Bucket = { tokens: number; at: number };

/**
 * Token bucket per visitor: `burst` requests at once, refilled at `rate` per second. Visitors live in memory only
 * (never logged nor written) and are forgotten after `idleMs` without a request, so memory stays bounded.
 */
export function createRateLimiter({ rate, burst, idleMs, now = Date.now }: { rate: number; burst: number; idleMs: number; now?: () => number }) {
  const buckets = new Map<string, Bucket>();
  let lastSweep = now();

  return {
    take(key: string): { ok: true } | { ok: false; retryAfter: number } {
      const t = now();
      if (t - lastSweep >= idleMs) {
        for (const [k, b] of buckets) if (t - b.at >= idleMs) buckets.delete(k);
        lastSweep = t;
      }
      const bucket = buckets.get(key) ?? { tokens: burst, at: t };
      bucket.tokens = Math.min(burst, bucket.tokens + ((t - bucket.at) / 1000) * rate);
      bucket.at = t;
      buckets.set(key, bucket);
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { ok: true };
      }
      return { ok: false, retryAfter: Math.max(1, Math.ceil((1 - bucket.tokens) / rate)) };
    },
    size: () => buckets.size,
  };
}

/**
 * Who a request comes from, from the X-Forwarded-For set by the reverse proxy (its first address is the visitor).
 * IPv6 visitors get a whole /64, so they are grouped by that prefix.
 */
export function visitorKey(forwardedFor: string | null): string {
  const address = (forwardedFor?.split(",")[0] ?? "").trim().split("%")[0] ?? "";
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped?.[1]) return mapped[1];
  const version = isIP(address);
  if (version === 4) return address;
  if (version !== 6) return "unknown";
  const [head = "", tail = ""] = address.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = address.includes("::") ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right] : left;
  return `${groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(":")}::/64`;
}
