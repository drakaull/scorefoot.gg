import { expect, test } from "@playwright/test";

// Runs against the real synced data (see playwright.config.ts).

test("search, Enter, then the player page with its 4 cards", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("combobox").fill("mbap");
  await expect(page.getByRole("option").first()).toContainText("Kylian Mbappé");
  await page.getByRole("combobox").press("Enter");

  await expect(page).toHaveURL(/\/en\/players\/278-kylian-mbappe$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kylian Mbappé" })).toBeVisible();
  for (const label of ["Goals", "Assists", "Avg rating", "Minutes"]) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /^Percentiles: Goals \d+/ })).toBeVisible();
});

test("a season tab switches the season in the URL and the cards", async ({ page }) => {
  await page.goto("/en/players/278-kylian-mbappe");
  const seasons = page.getByRole("navigation", { name: "Seasons" });
  await expect(seasons.getByRole("link", { name: "2025-26" })).toHaveAttribute("aria-current", "page");

  await seasons.getByRole("link", { name: "2022-23" }).click();
  await expect(page).toHaveURL(/\/en\/players\/278-kylian-mbappe\?season=2022$/);
  await expect(seasons.getByRole("link", { name: "2022-23" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 }).locator("..").getByRole("link", { name: "Paris Saint Germain" })).toBeVisible();
});

test("a slow season tab shows the click at once and fades the cards", async ({ page }) => {
  await page.goto("/en/players/278-kylian-mbappe");
  // Hold the next page for a second so the in-between state can be checked.
  await page.route(/season=2023/, async (route) => {
    await new Promise((r) => setTimeout(r, 1000));
    await route.continue();
  });
  const tab = page.getByRole("navigation", { name: "Seasons" }).getByRole("link", { name: "2023-24" });
  await tab.click();

  await expect(tab.locator("[data-link-pending]")).toBeAttached();
  await expect(page.locator("[data-pending-dim]")).toHaveCSS("opacity", "0.5");
  await expect(page).toHaveURL(/season=2023$/);
  await expect(page.locator("[data-pending-dim]")).toHaveCSS("opacity", "1");
});

test("the search spinner stays on until the player page arrives", async ({ page }) => {
  await page.goto("/en");
  await page.route(/\/players\/278-kylian-mbappe/, async (route) => {
    await new Promise((r) => setTimeout(r, 1000));
    await route.continue();
  });
  const box = page.getByRole("combobox");
  await box.fill("mbap");
  await expect(page.getByRole("option").first()).toContainText("Kylian Mbappé");
  await box.press("Enter");

  await expect(page.locator(".animate-spin")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/players\/278-kylian-mbappe$/);
});

test("a wrong name in the URL redirects, keeping the season", async ({ page }) => {
  const res = await page.goto("/en/players/278-x?season=2022");
  expect(res?.request().redirectedFrom()?.url()).toContain("/en/players/278-x");
  await expect(page).toHaveURL(/\/en\/players\/278-kylian-mbappe\?season=2022$/);
});

test("players who never played and unknown seasons are 404 pages", async ({ page }) => {
  for (const url of ["/en/players/2931-tom-heaton", "/en/players/278-kylian-mbappe?season=2019"]) {
    const res = await page.goto(url);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  }
});

test("mid-season transfer and the 900-minute rule", async ({ page }) => {
  await page.goto("/en/players/19281-antoine-semenyo?season=2025");
  const history = page.getByRole("table").last();
  await expect(history.getByRole("row", { name: /Bournemouth/ }).first()).toBeVisible();
  await expect(history.getByRole("row", { name: /Manchester City/ }).first()).toBeVisible();

  await page.goto("/en/players/18-jadon-sancho?season=2025");
  await expect(page.getByText("Not enough minutes for a fair comparison (900 min needed).")).toBeVisible();
});

test("French labels and numbers on /fr", async ({ page }) => {
  await page.goto("/fr/players/278-kylian-mbappe");
  await expect(page.getByRole("heading", { name: "Percentiles face aux attaquants" })).toBeVisible();
  await expect(page.getByText("Note moyenne")).toBeVisible();
  await expect(page.getByText("7,5").first()).toBeVisible();
});

test("the player page only talks to our own server", async ({ page, baseURL }) => {
  const hosts = new Set<string>();
  page.on("request", (r) => {
    const host = new URL(r.url()).host;
    // Kaspersky on the dev machine injects its own script into Firefox pages; it is not ours.
    if (!host.endsWith(".kaspersky-labs.com")) hosts.add(host);
  });
  await page.goto("/en/players/278-kylian-mbappe");
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  expect([...hosts]).toEqual([new URL(baseURL!).host]);
});
