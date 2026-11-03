import { describe, expect, it } from "vitest";
import { matchday } from "./club";
import { delta } from "./player";

describe("matchday", () => {
  it.each([
    ["Regular Season - 38", 38],
    ["Regular Season - 1", 1],
    ["Relegation Round", null],
    ["Final", null],
  ])("%s → %s", (round, day) => expect(matchday(round)).toBe(day));
});

describe("rank change", () => {
  // A lower rank is better: pass (previous, current) so going from 3rd to 2nd reads +1.
  it("better rank is positive", () => {
    expect(delta(3, 2, 0, "en")).toEqual({ text: "+1", sign: 1 });
    expect(delta(2, 5, 0, "en")).toEqual({ text: "−3", sign: -1 });
  });
});
