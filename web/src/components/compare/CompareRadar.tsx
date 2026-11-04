import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { seasonLabel, type Player } from "@/lib/player";
import { polygon, vertex } from "@/lib/radar";

const R = 95;
const LABEL_R = R + 12;
const SHAPE = [
  { fill: "var(--color-player-1)", text: "fill-player-1", dot: "bg-player-1" },
  { fill: "var(--color-player-2)", text: "fill-player-2", dot: "bg-player-2" },
] as const;

/** Both players on player 1's position axes (player 2 was ranked against that position by the api). */
export function CompareRadar({ players }: { players: [Player, Player] }) {
  const t = useTranslations("Compare");
  const tAxis = useTranslations("Player.Axis");
  const tPlural = useTranslations("PositionPlural");
  const position = players[0].position;
  const group = position && tPlural.has(position) ? tPlural(position) : (position ?? "");
  const axes = (players.find((p) => p.radar.eligible) ?? players[0]).radar.axes.map((a) => a.key);
  const n = axes.length;
  const percentile = (p: Player, key: string) => (p.radar.eligible ? (p.radar.axes.find((a) => a.key === key)?.percentile ?? null) : null);
  const shown = (v: number | null) => (v === null ? "–" : String(v));
  const name = (key: string) => (tAxis.has(key) ? tAxis(key) : key);
  const minMinutes = players[0].radar.minMinutes;

  return (
    <Card title={t("radarTitle", { group })}>
      {n >= 3 && (
        <svg
          viewBox="-250 -140 500 285"
          role="img"
          aria-label={players
            .map((p) => t("radarLabel", { name: p.name, list: axes.map((k) => `${name(k)} ${shown(percentile(p, k))}`).join(", ") }))
            .join(". ")}
          className="mx-auto mt-2 block w-full max-w-[560px]"
        >
          <g fill="none" stroke="var(--color-border)">
            <polygon points={polygon(Array(n).fill(100), R)} />
            <polygon points={polygon(Array(n).fill(50), R)} />
            {axes.map((key, i) => {
              const end = vertex(i, n, R);
              return <line key={key} x1={0} y1={0} x2={end.x} y2={end.y} />;
            })}
          </g>
          {players.map(
            (p, i) =>
              p.radar.eligible && (
                <polygon
                  key={p.id + "-" + i}
                  points={polygon(axes.map((k) => percentile(p, k)), R)}
                  fill={SHAPE[i]!.fill}
                  fillOpacity={0.25}
                  stroke={SHAPE[i]!.fill}
                  strokeWidth={2}
                />
              ),
          )}
          {axes.map((key, i) => {
            const { x, y } = vertex(i, n, LABEL_R);
            const anchor = Math.abs(x) < 1 ? "middle" : x > 0 ? "start" : "end";
            const dy = y < -1 ? -14 : y > 1 ? 10 : -4;
            return (
              <text key={key} x={x} y={y + dy} textAnchor={anchor} className="fill-muted text-caption font-semibold">
                {name(key)}
                <tspan x={x} dy={14} className="fill-player-1 font-extrabold">
                  {shown(percentile(players[0], key))}
                </tspan>
                <tspan> · </tspan>
                <tspan className="fill-player-2 font-extrabold">{shown(percentile(players[1], key))}</tspan>
              </text>
            );
          })}
        </svg>
      )}
      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 px-4 text-caption font-semibold">
        {players.map((p, i) => (
          <li key={p.id + "-" + i} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2.5 rounded-xs ${SHAPE[i]!.dot}`} />
            {p.name} · {seasonLabel(p.season)}
          </li>
        ))}
      </ul>
      <p className="px-4 pt-2 pb-3.5 text-center text-caption text-muted sm:px-5">
        {t("radarNote", { group, min: minMinutes })}
        {players
          .filter((p) => !p.radar.eligible)
          .map((p) => (
            <span key={p.id} className="block">
              {t("notEnough", { name: p.name, min: minMinutes, season: seasonLabel(p.season) })}
            </span>
          ))}
      </p>
    </Card>
  );
}
