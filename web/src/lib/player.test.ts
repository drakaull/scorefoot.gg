import { describe, expect, it } from "vitest";
import { ageOn, delta, formatRating, parseId, parseSeason, ratingBand, seasonLabel } from "./player";

describe("seasonLabel", () => {
  it("long and short forms", () => {
    expect(seasonLabel(2024)).toBe("2024-25");
    expect(seasonLabel(2024, "short")).toBe("24-25");
    expect(seasonLabel(2099)).toBe("2099-00");
  });
});

describe("ageOn", () => {
  const today = new Date("2026-11-02T12:00:00Z");
  it.each([
    ["1998-12-20", 27], // birthday later this year
    ["1998-11-02", 28], // birthday today
    ["2000-01-01", 26],
  ])("%s → %i", (birth, age) => expect(ageOn(birth, today)).toBe(age));
  it("unknown birth date", () => expect(ageOn(null, today)).toBeNull());
});

describe("delta", () => {
  it("counts", () => {
    expect(delta(25, 31, 0, "en")).toEqual({ text: "−6", sign: -1 });
    expect(delta(5, 3, 0, "en")).toEqual({ text: "+2", sign: 1 });
    expect(delta(4, 4, 0, "en")).toEqual({ text: "0", sign: 0 });
    expect(delta(3371, 2000, 0, "en")).toEqual({ text: "+1,371", sign: 1 });
  });
  it("ratings compare the shown values", () => {
    expect(delta(7.53, 7.72, 1, "en")).toEqual({ text: "−0.2", sign: -1 });
    expect(delta(7.53, 7.72, 1, "fr")).toEqual({ text: "−0,2", sign: -1 });
    expect(delta(7.53, 7.48, 1, "en")).toEqual({ text: "0.0", sign: 0 }); // both show 7.5
  });
  it("nothing to compare", () => {
    expect(delta(7.5, null, 1, "en")).toBeNull();
    expect(delta(null, 7.5, 1, "en")).toBeNull();
  });
});

describe("ratings", () => {
  it("always one decimal, in the page's language", () => {
    expect(formatRating(7.53, "en")).toBe("7.5");
    expect(formatRating(8, "en")).toBe("8.0");
    expect(formatRating(7.53, "fr")).toBe("7,5");
    expect(formatRating(null, "en")).toBe("–");
  });
  it.each([
    [5.9, "bad"],
    [6.0, "poor"],
    [6.44, "poor"],
    [6.5, "ok"],
    [6.94, "ok"],
    [7.0, "good"],
    [7.94, "good"],
    [8.0, "great"],
    [null, null],
  ])("%s → %s", (r, band) => expect(ratingBand(r)).toBe(band));
  it("bands use the rating shown, so 6.96 (shown 7.0) is good", () => expect(ratingBand(6.96)).toBe("good"));
});

describe("route parameters", () => {
  it.each([
    ["278-kylian-mbappe", 278],
    ["278", 278],
    ["278-", 278],
    ["abc", null],
    ["-278", null],
    ["12345678901", null],
  ])("id of %s → %s", (slug, id) => expect(parseId(slug)).toBe(id));

  it.each([
    [undefined, undefined],
    ["2024", 2024],
    ["abc", "invalid"],
    ["20245", "invalid"],
    [["2024", "2025"], "invalid"],
  ] as const)("season %s → %s", (raw, season) => expect(parseSeason(raw)).toBe(season));
});
