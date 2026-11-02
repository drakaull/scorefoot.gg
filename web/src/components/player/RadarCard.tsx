import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { seasonLabel, type Player } from "@/lib/player";
import { polygon, vertex } from "@/lib/radar";

const R = 95; // radius of the 100th percentile, in SVG units
const LABEL_R = R + 12;

/** Percentile radar against players of the same position (hand-written SVG). */
export function RadarCard({ player }: { player: Player }) {
  const t = useTranslations("Player");
  const tPlural = useTranslations("PositionPlural");
  const { radar, position } = player;
  const group = position && tPlural.has(position) ? tPlural(position) : (position ?? "");
  const axes = radar.axes;
  const n = axes.length;
  const name = (key: string) => (t.has(`Axis.${key}`) ? t(`Axis.${key}`) : key);
  const shown = (p: number | null) => (p === null ? "–" : String(p));

  return (
    <Card title={t("radarTitle", { group })}>
      {!radar.eligible || n < 3 ? (
        <p className="p-4 text-muted sm:p-5">{t("radarNotEnough", { min: radar.minMinutes })}</p>
      ) : (
        <>
          <svg
            viewBox="-235 -125 470 252"
            role="img"
            aria-label={t("radarLabel", { list: axes.map((a) => `${name(a.key)} ${shown(a.percentile)}`).join(", ") })}
            className="mx-auto mt-2 block w-full max-w-[440px]"
          >
            <g fill="none" stroke="var(--color-border)">
              <polygon points={polygon(Array(n).fill(100), R)} />
              <polygon points={polygon(Array(n).fill(50), R)} />
              {axes.map((a, i) => {
                const end = vertex(i, n, R);
                return <line key={a.key} x1={0} y1={0} x2={end.x} y2={end.y} />;
              })}
            </g>
            <polygon
              points={polygon(axes.map((a) => a.percentile), R)}
              fill="var(--color-accent)"
              fillOpacity={0.25}
              stroke="var(--color-accent)"
              strokeWidth={2}
            />
            {axes.map((a, i) => {
              const { x, y } = vertex(i, n, LABEL_R);
              const anchor = Math.abs(x) < 1 ? "middle" : x > 0 ? "start" : "end";
              const dy = y < -1 ? -2 : y > 1 ? 10 : 4;
              return (
                <text key={a.key} x={x} y={y + dy} textAnchor={anchor} className="fill-muted text-caption font-semibold">
                  {name(a.key)} <tspan className="fill-text font-bold">{shown(a.percentile)}</tspan>
                </text>
              );
            })}
          </svg>
          <p className="px-4 pt-1 pb-3 text-caption text-muted sm:px-5">
            {t("radarNote", { count: radar.groupSize, group, min: radar.minMinutes, season: seasonLabel(player.season) })}
          </p>
        </>
      )}
    </Card>
  );
}
