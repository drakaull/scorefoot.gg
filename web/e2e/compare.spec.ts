import { expect, test } from "@playwright/test";

// Runs against the real synced data (see playwright.config.ts).

test("Compare button, then pick the second player", async ({ page }) => {
  await page.goto("/en/players/278-kylian-mbappe");
  await page.getByRole("main").getByRole("link", { name: "Compare", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/compare\/278-kylian-mbappe\?s1=2025$/);
  await expect(page.getByText("Pick a second player to compare")).toBeVisible();

  await page.waitForLoadState("load");
  const box = page.getByRole("combobox", { name: "Pick a player…" }).nth(1);
  await box.fill("haaland");
  await expect(page.getByRole("option", { name: /Erling Haaland/ })).toBeVisible();
  await box.press("Enter");
  await expect(page).toHaveURL(/\/en\/compare\/278-kylian-mbappe\/1100-erling-haaland\?s1=2025$/);
  await expect(page.getByRole("heading", { name: "Percentiles vs attackers" })).toBeVisible();
  // Key passes per 90: Mbappé 2.25 is better than Haaland 0.76.
  await expect(page.getByRole("row", { name: /Key passes/ })).toContainText("2.25");
});

test("a season select changes one player's season", async ({ page }) => {
  await page.goto("/en/compare/278-kylian-mbappe/1100-erling-haaland");
  await page.waitForLoadState("load");
  await page.getByRole("combobox", { name: "Season" }).first().selectOption("2022");
  await expect(page).toHaveURL(/s1=2022/);
  await expect(page.getByText(/Paris Saint Germain · Attacker/)).toBeVisible();
});

test("a defender is drawn on the attacker axes; under 900 minutes has no shape", async ({ page }) => {
  await page.goto("/en/compare/278-kylian-mbappe/361497-dean-huijsen");
  await expect(page.getByRole("img", { name: /Dean Huijsen: Goals \d+/ })).toBeVisible();

  await page.goto("/en/compare/278-kylian-mbappe/18-jadon-sancho");
  await expect(page.getByText(/Jadon Sancho played fewer than 900 minutes in 2025-26/)).toBeVisible();
});

test("redirect and 404", async ({ page }) => {
  await page.goto("/en/compare/278-x/1100-y?s1=2022");
  await expect(page).toHaveURL(/\/en\/compare\/278-kylian-mbappe\/1100-erling-haaland\?s1=2022$/);
  for (const url of ["/en/compare/999999999-x", "/en/compare/278-kylian-mbappe?s1=1990", "/en/compare/a/b/c"]) {
    expect((await page.goto(url))?.status()).toBe(404);
  }
});

test("the header fits at 390px in both languages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  for (const url of ["/en/compare", "/fr/compare"]) {
    await page.goto(url);
    await expect(page.getByRole("link", { name: /^(Compare|Comparer)$/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
});

test("French labels and no third-party request", async ({ page, baseURL }) => {
  const hosts = new Set<string>();
  page.on("request", (r) => {
    const host = new URL(r.url()).host;
    // Kaspersky on the dev machine injects its own script into Firefox pages; it is not ours.
    if (!host.endsWith(".kaspersky-labs.com")) hosts.add(host);
  });
  await page.goto("/fr/compare/278-kylian-mbappe/1100-erling-haaland");
  await expect(page.getByRole("heading", { name: "Percentiles face aux attaquants" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Statistiques par 90 minutes" })).toBeVisible();
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  expect([...hosts]).toEqual([new URL(baseURL!).host]);
});
