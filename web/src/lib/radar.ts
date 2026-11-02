/** Point of axis `i` of `n` at distance `r` from the centre (0, 0): first axis up, then clockwise. */
export function vertex(i: number, n: number, r: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
  // + 0 turns -0 into 0, so the points print cleanly.
  return { x: Math.round(r * Math.cos(angle) * 100) / 100 + 0, y: Math.round(r * Math.sin(angle) * 100) / 100 + 0 };
}

/** SVG `points` of the shape for percentiles 0..100 (null sits at the centre). */
export const polygon = (percentiles: (number | null)[], r: number) =>
  percentiles
    .map((p, i) => vertex(i, percentiles.length, (r * (p ?? 0)) / 100))
    .map(({ x, y }) => `${x},${y}`)
    .join(" ");
