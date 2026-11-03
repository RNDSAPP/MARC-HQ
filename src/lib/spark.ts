// Small decorative sparkline of the home cards, same shape as in the mockup.

/** Returns the points of the line and of the filled area under it, for an SVG of size width x height. */
export function sparkline(width: number, height: number, seed: number): { line: string; area: string } {
  const shape = [3, 4, 3.5, 5, 4.6, 6, 5.8, 7, 6.6, 8, 8.6, 10];
  const values = shape.map((v, i) => v + ((i * (seed + 3)) % 4) * 0.45);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((v, i) => [
    Math.round((i * (width - 4)) / (values.length - 1) + 2),
    Math.round(height - 3 - ((v - min) / (max - min)) * (height - 8)),
  ]);
  const line = points.map(([x, y]) => `${x},${y}`).join(' ');
  return { line, area: `2,${height} ${line} ${width - 2},${height}` };
}
