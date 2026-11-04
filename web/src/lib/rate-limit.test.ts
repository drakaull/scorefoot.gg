import { describe, expect, it } from "vitest";
import { createRateLimiter, visitorKey } from "./rate-limit";

describe("createRateLimiter", () => {
  const setup = () => {
    let now = 0;
    const limiter = createRateLimiter({ rate: 10, burst: 20, idleMs: 60_000, now: () => now });
    return { limiter, tick: (ms: number) => (now += ms) };
  };

  it("lets a burst of 20 through, then refuses with Retry-After", () => {
    const { limiter } = setup();
    for (let i = 0; i < 20; i++) expect(limiter.take("a")).toEqual({ ok: true });
    expect(limiter.take("a")).toEqual({ ok: false, retryAfter: 1 });
  });

  it("refills 10 tokens per second", () => {
    const { limiter, tick } = setup();
    for (let i = 0; i < 20; i++) limiter.take("a");
    tick(500); // 5 tokens back
    for (let i = 0; i < 5; i++) expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(false);
  });

  it("each visitor has his own bucket", () => {
    const { limiter } = setup();
    for (let i = 0; i < 21; i++) limiter.take("a");
    expect(limiter.take("b").ok).toBe(true);
  });

  it("forgets visitors idle for a minute (memory stays bounded)", () => {
    const { limiter, tick } = setup();
    limiter.take("a");
    limiter.take("b");
    expect(limiter.size()).toBe(2);
    tick(61_000);
    limiter.take("c");
    expect(limiter.size()).toBe(1);
  });
});

describe("visitorKey", () => {
  it.each([
    ["203.0.113.7", "203.0.113.7"],
    [" 203.0.113.7 ", "203.0.113.7"],
    ["2001:db8:1:2:3:4:5:6", "2001:db8:1:2::/64"],
    ["2001:db8:1:2::9", "2001:db8:1:2::/64"], // same /64 as above
    ["2001:DB8:0001:0002:aaaa::1", "2001:db8:1:2::/64"],
    ["2001:db8::1", "2001:db8:0:0::/64"],
    ["fe80::1%eth0", "fe80:0:0:0::/64"],
    ["::ffff:203.0.113.7", "203.0.113.7"], // IPv4 written as IPv6
    ["203.0.113.7, 10.0.0.1", "203.0.113.7"], // first address is the visitor
    [null, "unknown"],
    ["", "unknown"],
    ["not an address", "unknown"],
  ])("%s → %s", (header, key) => expect(visitorKey(header)).toBe(key));
});
