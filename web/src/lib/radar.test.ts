import { describe, expect, it } from "vitest";
import { polygon, vertex } from "./radar";

describe("radar geometry", () => {
  it("first axis points up, then clockwise", () => {
    expect(vertex(0, 6, 100)).toEqual({ x: 0, y: -100 });
    const second = vertex(1, 6, 100);
    expect(second.x).toBeCloseTo(86.6, 1);
    expect(second.y).toBeCloseTo(-50, 1);
    expect(vertex(3, 6, 100).y).toBeCloseTo(100, 6);
  });

  it("percentiles scale the radius; a missing one sits at the centre", () => {
    const points = polygon([100, 50, null, 0], 80).split(" ");
    expect(points).toEqual(["0,-80", "40,0", "0,0", "0,0"]);
  });
});
