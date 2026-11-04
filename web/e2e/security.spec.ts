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
