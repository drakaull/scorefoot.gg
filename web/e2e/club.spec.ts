import { expect, test } from "@playwright/test";

// Runs against the real synced data (see playwright.config.ts).

test("search a club, Enter, then its page with standing and key players", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("combobox").fill("real madrid");
  await expect(page.getByRole("group", { name: "Clubs" }).getByRole("option").first()).toContainText("Real Madrid");
  await page.getByRole("group", { name: "Clubs" }).getByRole("option").first().click();

  await expect(page).toHaveURL(/\/en\/clubs\/541-real-madrid$/);
  await expect(page.getByRole("heading", { level: 1, name: "Real Madrid" })).toBeVisible();
  await expect(page.getByText("2nd", { exact: true })).toBeVisible();
  await expect(page.getByText("27-5-6", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Key players" }).locator("..").getByText("Kylian Mbappé").first()).toBeVisible();
  await expect(page.locator("tr[aria-current]")).toContainText("Real Madrid");
});

test("a season tab switches the season", async ({ page }) => {
  await page.goto("/en/clubs/541-real-madrid");
  // The club page is heavy: let it finish loading so the click is handled by the client router.
  await page.waitForLoadState("networkidle");
  await page.getByRole("navigation", { name: "Seasons" }).getByRole("link", { name: "2023-24" }).click();
  await expect(page).toHaveURL(/\/en\/clubs\/541-real-madrid\?season=2023$/);
  await expect(page.getByText("1st", { exact: true })).toBeVisible();
});

test("wrong name redirects, clubs outside the 5 leagues and unknown seasons are 404", async ({ page }) => {
  await page.goto("/en/clubs/541-x?season=2023");
  await expect(page).toHaveURL(/\/en\/clubs\/541-real-madrid\?season=2023$/);

  for (const url of ["/en/clubs/17000-crystal-palace-u21", "/en/clubs/718-oviedo?season=2024"]) {
    const res = await page.goto(url);
    expect(res?.status()).toBe(404);
  }
  await page.goto("/en/clubs/718-oviedo");
  await expect(page.getByRole("navigation", { name: "Seasons" }).getByRole("link")).toHaveCount(1);
});

test("zones, and all results behind Show all", async ({ page }) => {
  await page.goto("/en/clubs/541-real-madrid");
  await expect(page.getByRole("row", { name: /Getafe/ })).toContainText("Conference League");
  const legend = page.getByRole("list").filter({ hasText: "Relegation" });
  await expect(legend).toContainText("Champions League");

  const results = page.getByRole("heading", { name: "Season results" }).locator("..");
  await expect(results.getByRole("row").filter({ visible: true })).toHaveCount(10);
  await results.getByText("Show all 38 matches").click();
  await expect(results.getByRole("row").filter({ visible: true })).toHaveCount(38);
});

test("links between player and club pages; clubs without a page are plain text", async ({ page }) => {
  await page.goto("/en/players/278-kylian-mbappe");
  await page.getByRole("heading", { level: 1 }).locator("../..").getByRole("link", { name: "Real Madrid" }).click();
  await expect(page).toHaveURL(/\/en\/clubs\/541-real-madrid$/);

  await page.goto("/en/players/1254-g-poussin");
  await expect(page.getByText("RED Star FC 93").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "RED Star FC 93" })).toHaveCount(0);
});

test("relegation play-offs show the play-off label and colour", async ({ page }) => {
  await page.goto("/en/clubs/161-vfl-wolfsburg?season=2025");
  await expect(page.getByRole("row", { name: /VfL Wolfsburg/ })).toContainText("Relegation play-off");
  await expect(page.getByRole("heading", { name: "Season results" }).locator("..").getByText("Play-off").first()).toBeVisible();
});

test("French labels on /fr", async ({ page }) => {
  await page.goto("/fr/clubs/541-real-madrid");
  await expect(page.getByText("2e", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Joueurs clés" })).toBeVisible();
  await expect(page.getByText("Voir les 38 matchs")).toBeVisible();
});

test("the club page only talks to our own server", async ({ page, baseURL }) => {
  const hosts = new Set<string>();
  page.on("request", (r) => {
    const host = new URL(r.url()).host;
    // Kaspersky on the dev machine injects its own script into Firefox pages; it is not ours.
    if (!host.endsWith(".kaspersky-labs.com")) hosts.add(host);
  });
  await page.goto("/en/clubs/541-real-madrid");
  await page.waitForLoadState("networkidle");
  expect([...hosts]).toEqual([new URL(baseURL!).host]);
});
