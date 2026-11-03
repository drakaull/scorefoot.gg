import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { better, LOWER_WINS } from "@/lib/compare";
import { formatNumber, type Player, type StatRow } from "@/lib/player";
import { SLOT_STYLE } from "./CompareCard";

const isPct = (row: StatRow) => row.per90 === null;

/** Per-90 values side by side (totals below); the better value takes its player's colour. */
export function CompareStats({ players: [a, b] }: { players: [Player, Player] }) {
  const t = useTranslations("Compare");
  const tStat = useTranslations("Player");
  const locale = useLocale();
  const find = (p: Player, key: string) => p.stats.flatMap((g) => g.rows).find((r) => r.key === key) ?? null;
  const value = (row: StatRow | null) => (row === null ? null : isPct(row) ? row.total : row.per90);

  const cell = (row: StatRow | null, win: boolean, slot: 0 | 1) => (
    <td className={`h-13 w-[30%] border-t border-border px-2 py-1 text-center leading-tight ${win ? `font-extrabold ${SLOT_STYLE[slot].text}` : "font-semibold"}`}>
      {row === null || value(row) === null ? "–" : isPct(row) ? `${formatNumber(value(row)!, 0, locale)}%` : formatNumber(value(row)!, 2, locale)}
      {row !== null && !isPct(row) && row.total !== null && (
        <span className="block text-caption font-normal text-muted">{formatNumber(row.total, 0, locale)}</span>
      )}
    </td>
  );

  return (
    <Card title={t("statsTitle")}>
      <table className="w-full tabular-nums">
        <thead>
          <tr>
            <th scope="col" className={`px-2 py-3 font-semibold ${SLOT_STYLE[0].text}`}>{a.name}</th>
            <th scope="col" className="px-2 py-3 text-caption font-semibold tracking-[0.04em] text-muted uppercase">{t("per90Total")}</th>
            <th scope="col" className={`px-2 py-3 font-semibold ${SLOT_STYLE[1].text}`}>{b.name}</th>
          </tr>
        </thead>
        {a.stats.map((group) => (
          <tbody key={group.group}>
            <tr>
              <th scope="colgroup" colSpan={3} className="px-2 pt-4 pb-2 text-caption font-semibold tracking-[0.04em] uppercase">
                {tStat(`Group.${group.group}`)}
              </th>
            </tr>
            {group.rows.map((row) => {
              const other = find(b, row.key);
              const winner = better(value(row), value(other), LOWER_WINS.has(row.key));
              return (
                <tr key={row.key}>
                  {cell(row, winner === 1, 0)}
                  <th scope="row" className="h-13 w-[40%] border-t border-border px-2 text-center font-normal text-muted">
                    {tStat(`Stat.${row.key}`)}
                  </th>
                  {cell(other, winner === 2, 1)}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </Card>
  );
}
