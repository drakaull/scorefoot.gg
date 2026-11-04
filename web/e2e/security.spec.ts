import { expect, test } from "@playwright/test";

// Production behaviour: Content-Security-Policy, redirects behind a proxy (spec 07).

const PAGES = [
  "/en",
  "/fr",
  "/en/players/278-kylian-mbappe",
  "/fr/players/278-kylian-mbappe",
  "/en/clubs/541-real-madrid",
  "/fr/clubs/541-real-madrid",
  "/en/leaderboards/goals",
  "/fr/leaderboards/rating?age=u21",
  "/en/compare/278-kylian-mbappe/1100-erling-haaland",
  "/fr/compare",
  "/en/players/2931-tom-heaton", // 404 page
];

for (const url of PAGES) {
  test(`no Content-Security-Policy violation on ${url}`, async ({ page }) => {
    // Collect the browser's own violation reports (works the same in Chrome and Firefox).
    await page.addInitScript(() => {
      const seen: string[] = [];
      Object.assign(window, { __cspViolations: seen });
      document.addEventListener("securitypolicyviolation", (e) => seen.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    // load, not networkidle: on the dev machine Kaspersky keeps a request open in Firefox pages.
    const response = await page.goto(url, { waitUntil: "load" });
    expect(response?.headers()["content-security-policy"], url).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations), url).toEqual([]);
  });
}

test("each page view gets a fresh nonce; no X-Powered-By", async ({ request }) => {
  const nonce = async () => (await request.get("/en")).headers()["content-security-policy"]?.match(/'nonce-([^']+)'/)?.[1];
  const [a, b] = [await nonce(), await nonce()];
  expect(a).toBeTruthy();
  expect(a).not.toBe(b);
  expect((await request.get("/en")).headers()["x-powered-by"]).toBeUndefined();
});

test("redirects stay relative, so they keep https and the public host behind the proxy", async ({ request }) => {
  const cases = {
    "/": "/en",
    "/en/players/278-x": "/en/players/278-kylian-mbappe",
    "/en/players/278-x?season=2022": "/en/players/278-kylian-mbappe?season=2022",
    "/en/clubs/541-x": "/en/clubs/541-real-madrid",
    "/en/leaderboards": "/en/leaderboards/goals",
    "/en/compare/278-x": "/en/compare/278-kylian-mbappe",
    "/en/compare/278-x/1100-y?s1=2022": "/en/compare/278-kylian-mbappe/1100-erling-haaland?s1=2022",
  };
  for (const [from, to] of Object.entries(cases)) {
    const res = await request.get(from, {
      maxRedirects: 0,
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "scorefoot.leonard-fontaine.com" },
    });
    expect(res.status(), from).toBeGreaterThanOrEqual(300);
    expect(res.headers()["location"], from).toBe(to);
  }
});

test("search is rate limited per visitor, IPv6 grouped by /64", async ({ request }) => {
  const burst = (ip: (i: number) => string) =>
    Promise.all(Array.from({ length: 40 }, (_, i) => request.get("/api/search?q=mbap", { headers: { "x-forwarded-for": ip(i) } })));
  // Addresses from the documentation ranges, unique to this test so other tests keep their own buckets.
  const v4 = await burst(() => "198.51.100.42");
  const refused = v4.filter((r) => r.status() === 429);
  expect(refused.length).toBeGreaterThan(10);
  expect(refused[0]?.headers()["retry-after"]).toBe("1");
  expect(v4.find((r) => r.ok())?.headers()["cache-control"]).toBe("public, max-age=60");
  expect((await request.get("/api/search?q=mbap", { headers: { "x-forwarded-for": "198.51.100.43" } })).status()).toBe(200);

  const v6 = await burst((i) => `2001:db8:42:42::${(i + 1).toString(16)}`);
  expect(v6.filter((r) => r.status() === 429).length).toBeGreaterThan(10);
});
