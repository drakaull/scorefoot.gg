import { expect, test } from "@playwright/test";

test("typing shows results and Enter opens the first player", async ({ page }) => {
  await page.goto("/en");
  const box = page.getByRole("combobox", { name: "Search a player or a club" });
  await box.fill("mbap");

  const first = page.getByRole("option").first();
  await expect(first).toContainText("Kylian Mbappé");
  await expect(first).toHaveAttribute("aria-selected", "true");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/en\/players\/278-kylian-mbappe$/);
});

test("arrows move the highlight, Escape closes the list", async ({ page }) => {
  await page.goto("/en");
  const box = page.getByRole("combobox");
  await box.fill("psg");
  await expect(page.getByRole("group", { name: "Clubs" }).getByRole("option", { name: /Paris Saint Germain/ })).toBeVisible();

  await box.fill("mbap");
  await expect(page.getByRole("option").nth(1)).toBeVisible();
  await box.press("ArrowDown");
  await expect(page.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
  await box.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(box).toHaveAttribute("aria-expanded", "false");
});

test("Ctrl+K focuses the search bar", async ({ page }) => {
  await page.goto("/en");
  await page.locator("body").click();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("combobox")).toBeFocused();
});

test("typos, accents and empty results", async ({ page }) => {
  await page.goto("/en");
  const box = page.getByRole("combobox");
  await box.fill("odegaard");
  await expect(page.getByRole("option").first()).toContainText("Martin Ødegaard");
  await box.fill("haland");
  await expect(page.getByRole("option").first()).toContainText("Erling Haaland");
  await box.fill("zzqxw");
  await expect(page.getByText("No player or club found for “zzqxw”")).toBeVisible();
});

test("language switch keeps the page and translates it", async ({ page }) => {
  await page.goto("/en/players/278-kylian-mbappe");
  await page.getByRole("navigation", { name: "Language" }).getByRole("link", { name: "fr" }).click();
  await expect(page).toHaveURL(/\/fr\/players\/278-kylian-mbappe$/);
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();

  await page.goto("/fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.getByRole("combobox", { name: "Rechercher un joueur ou un club" }).fill("mbap");
  await expect(page.getByRole("option").first()).toContainText("Real Madrid · Attaquant");
});

test("the browser only talks to our own server", async ({ page, baseURL }) => {
  const hosts = new Set<string>();
  page.on("request", (r) => {
    const host = new URL(r.url()).host;
    // Kaspersky on the dev machine injects its own script into Firefox pages; it is not ours.
    if (!host.endsWith(".kaspersky-labs.com")) hosts.add(host);
  });
  await page.goto("/en");
  await page.getByRole("combobox").fill("mbap");
  await expect(page.getByRole("option").first().locator("img")).toHaveJSProperty("complete", true);
  expect([...hosts]).toEqual([new URL(baseURL!).host]);
});
