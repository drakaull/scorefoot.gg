import { describe, expect, it } from "vitest";
import { hasPer90, leaderboardHref, parseFilters, STATS } from "./leaderboard";

describe("parseFilters", () => {
  it("reads the known filters", () => {
    expect(parseFilters({ season: "2024", league: "39", position: "Attacker", age: "u21", mode: "per90" })).toEqual({
      season: 2024,
      league: 39,
      position: "Attacker",
      age: "u21",
      mode: "per90",
    });
  });
  it("missing filters stay out, unknown keys are ignored", () => {
    expect(parseFilters({ utm: "x" })).toEqual({});
  });
  it("an empty value means no filter (the form sends league= for All leagues)", () => {
    expect(parseFilters({ league: "", season: "2024", age: "" })).toEqual({ season: 2024 });
  });
  it.each([
    { season: "25" },
    { season: "abc" },
    { league: "-1" },
    { position: "Winger" },
    { age: "u19" },
    { mode: "average" },
    { season: ["2024", "2025"] },
  ])("invalid %o", (params) => expect(parseFilters(params)).toBe("invalid"));
});

describe("leaderboardHref", () => {
  it("keeps the filters when the stat changes", () => {
    expect(leaderboardHref("assists", { season: 2024, league: 39 })).toEqual({
      pathname: "/leaderboards/assists",
      query: { season: 2024, league: 39 },
    });
  });
  it("drops per 90 for stats without it", () => {
    expect(leaderboardHref("rating", { mode: "per90", age: "u21" })).toEqual({ pathname: "/leaderboards/rating", query: { age: "u21" } });
  });
  it("leaves out the total mode, the default", () => {
    expect(leaderboardHref("goals", { mode: "total" })).toEqual({ pathname: "/leaderboards/goals", query: {} });
  });
});

describe("stats", () => {
  it("12 stats, rating and minutes without per 90", () => {
    expect(STATS).toHaveLength(12);
    expect(STATS.filter((s) => !hasPer90(s))).toEqual(["rating", "minutes"]);
  });
});
