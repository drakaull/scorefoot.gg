import { describe, expect, it } from "vitest";
import { isMediaPath, validQuery } from "./api";

describe("validQuery", () => {
  it.each([
    [null, null],
    [" a ", null],
    ["  mb ", "mb"],
    ["x".repeat(50), "x".repeat(50)],
    ["x".repeat(51), null],
  ])("%j → %j", (q, expected) => expect(validQuery(q)).toBe(expected));
});

describe("isMediaPath", () => {
  it("accepts sync image paths", () => {
    expect(isMediaPath("players/278.png")).toBe(true);
    expect(isMediaPath("teams/85.png")).toBe(true);
  });

  it.each(["../health", "players/../search", "players/278.svg", "other/1.png", "players/1.png/x", "players/1.png\n"])(
    "refuses %j",
    (p) => expect(isMediaPath(p)).toBe(false),
  );
});
