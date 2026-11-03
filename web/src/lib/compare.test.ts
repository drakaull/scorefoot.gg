import { describe, expect, it } from "vitest";
import { better, compareHref, parseCompare } from "./compare";

describe("parseCompare", () => {
  it("0, 1 or 2 players with their seasons", () => {
    expect(parseCompare(undefined, {})).toEqual([]);
    expect(parseCompare(["278-kylian-mbappe"], { s1: "2024" })).toEqual([{ id: 278, slug: "278-kylian-mbappe", season: 2024 }]);
    expect(parseCompare(["278-kylian-mbappe", "1100-erling-haaland"], { s2: "2025" })).toEqual([
      { id: 278, slug: "278-kylian-mbappe", season: undefined },
      { id: 1100, slug: "1100-erling-haaland", season: 2025 },
    ]);
  });
  it.each<[string[], Record<string, string | string[]>]>([
    [["a", "b", "c"], {}],
    [["abc"], {}],
    [["278-x"], { s1: "24" }],
    [["278-x"], { s1: ["2024", "2025"] }],
    [["278-x", "1100-y"], { s2: "abc" }],
  ])("invalid %o %o", (slugs, params) => expect(parseCompare(slugs, params)).toBe("invalid"));
});

describe("compareHref", () => {
  const mbappe = { id: 278, name: "Kylian Mbappé", season: 2022 };
  const haaland = { id: 1100, name: "Erling Haaland" };
  it("both players, seasons as s1 / s2", () => {
    expect(compareHref([mbappe, haaland])).toEqual({
      pathname: "/compare/278-kylian-mbappe/1100-erling-haaland",
      query: { s1: 2022 },
    });
  });
  it("an empty first slot lets the second player move up", () => {
    expect(compareHref([null, haaland])).toEqual({ pathname: "/compare/1100-erling-haaland", query: {} });
    expect(compareHref([null, null])).toEqual({ pathname: "/compare", query: {} });
  });
});

describe("better", () => {
  it.each([
    [2.25, 0.76, false, 1],
    [0.14, 0.06, true, 2],
    [0.5, 0.5, false, 0],
    [null, 1, false, 0],
    [1, null, true, 0],
  ] as const)("%s vs %s (lower wins: %s) → %s", (a, b, lowerWins, winner) => expect(better(a, b, lowerWins)).toBe(winner));
});
