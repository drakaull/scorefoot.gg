import { expect, test } from "@playwright/test";

// Runs against the real synced data (see playwright.config.ts).

test("header link opens the top scorers with the podium", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "Leaderboards" }).click();
  await expect(page).toHaveURL(/\/en\/leaderboards\/goals$/);
  await expect(page.getByRole("heading", { level: 1, name: "Top scorers" })).toBeVisible();
  const podium = page.getByRole("region", { name: "Top 3" });
  await expect(podium).toContainText("Harry Kane");
  await expect(podium).toContainText("36");
  await expect(page.getByRole("link", { name: "Leaderboards" })).toHaveAttribute("aria-current", "page");
});

test("a stat chip keeps the filters; rating has no per 90 switch", async ({ page }) => {
  await page.goto("/en/leaderboards/goals?season=2024");
  await page.getByRole("navigation", { name: "Stats" }).getByRole("link", { name: "Rating" }).click();
  await expect(page).toHaveURL(/\/en\/leaderboards\/rating\?season=2024$/);
  await expect(page.getByRole("navigation", { name: "Values" })).toHaveCount(0);
  await expect(page.getByText("Players with 900+ minutes.")).toBeVisible();
});

test("changing a filter updates the URL and the ranking", async ({ page }) => {
  await page.goto("/en/leaderboards/goals");
  await page.waitForLoadState("networkidle");
  await page.getByRole("combobox", { name: "League" }).selectOption({ label: "Premier League" });
  await expect(page).toHaveURL(/league=39/);
  await expect(page.getByRole("region", { name: "Top 3" })).toContainText("Erling Haaland");
  await expect(page.getByRole("region", { name: "Top 3" })).not.toContainText("Harry Kane");
});

test("per 90 switch re-ranks with 900+ minutes", async ({ page }) => {
  await page.goto("/en/leaderboards/goals");
  await page.getByRole("navigation", { name: "Values" }).getByRole("link", { name: "Per 90" }).click();
  await expect(page).toHaveURL(/mode=per90/);
  await expect(page.getByRole("region", { name: "Top 3" })).toContainText("1.36");
});

test("filters work without JavaScript (Apply button)", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/en/leaderboards/rating");
  await page.getByRole("combobox", { name: "Age" }).selectOption("u21");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/age=u21/);
  await expect(page.getByRole("region", { name: "Top 3" })).toContainText("Lamine Yamal");
  await context.close();
});

test("redirect, 404 and the empty state", async ({ page }) => {
  await page.goto("/en/leaderboards");
  await expect(page).toHaveURL(/\/en\/leaderboards\/goals$/);
  for (const url of ["/en/leaderboards/xyz", "/en/leaderboards/goals?season=1990", "/en/leaderboards/rating?mode=per90"]) {
    expect((await page.goto(url))?.status()).toBe(404);
  }
  await page.goto("/en/leaderboards/goals?position=Goalkeeper&age=u21");
  await expect(page.getByText("No player matches these filters.")).toBeVisible();
});

test("home preview card leads to the full leaderboard", async ({ page }) => {
  await page.goto("/en");
  const card = page.getByRole("heading", { name: /^Best rated/ }).locator("..");
  await expect(card).toContainText("Lamine Yamal");
  await card.getByRole("link", { name: "See the full leaderboard →" }).click();
  await expect(page).toHaveURL(/\/en\/leaderboards\/rating$/);
});

test("French labels", async ({ page }) => {
  await page.goto("/fr/leaderboards/saves?position=Goalkeeper");
  await expect(page.getByRole("heading", { level: 1, name: "Arrêts" })).toBeVisible();
  await expect(page.getByText("5 grands championnats · 2025-26 · Gardiens · Tous âges")).toBeVisible();
});

test("the leaderboard only talks to our own server", async ({ page, baseURL }) => {
  const hosts = new Set<string>();
  page.on("request", (r) => {
    const host = new URL(r.url()).host;
    // Kaspersky on the dev machine injects its own script into Firefox pages; it is not ours.
    if (!host.endsWith(".kaspersky-labs.com")) hosts.add(host);
  });
  await page.goto("/en/leaderboards/goals");
  await page.waitForLoadState("networkidle");
  expect([...hosts]).toEqual([new URL(baseURL!).host]);
});
