import { describe, expect, it } from "vitest";
import { entityPath, slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Kylian Mbappé", "kylian-mbappe"],
    ["Martin Ødegaard", "martin-odegaard"],
    ["Paris Saint Germain", "paris-saint-germain"],
    ["Bayern München", "bayern-munchen"],
    ["M'Bala Nzola", "m-bala-nzola"],
    ["  Łukasz  Skorupski ", "lukasz-skorupski"],
  ])("%s → %s", (name, slug) => expect(slugify(name)).toBe(slug));
});

describe("entityPath", () => {
  it("puts the id before the slug", () => {
    expect(entityPath("players", 278, "Kylian Mbappé")).toBe("/players/278-kylian-mbappe");
    expect(entityPath("clubs", 85, "Paris Saint Germain")).toBe("/clubs/85-paris-saint-germain");
  });
});
