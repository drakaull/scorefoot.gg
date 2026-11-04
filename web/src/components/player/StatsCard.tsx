import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { formatNumber, type StatGroup, type StatRow } from "@/lib/player";

const th = "px-4 py-2 text-caption font-semibold tracking-[0.04em] text-muted uppercase sm:px-5";
const td = "h-11 border-t border-border px-4 sm:px-5";

/** Season totals and per-90 values, grouped as the api sends them. */
export function StatsCard({ stats }: { stats: StatGroup[] }) {
  const t = useTranslations("Player");
  const locale = useLocale();
  const pct = (v: number) => `${formatNumber(v, 0, locale)}%`;

  const total = (row: StatRow) => {
    if (row.total === null) return "–";
    if (row.key.endsWith("Pct") || row.key.endsWith("Accuracy")) return pct(row.total);
    const n = formatNumber(row.total, 0, locale);
    if (row.outOf !== null) return `${n} / ${formatNumber(row.outOf, 0, locale)}`;
    if (row.pct !== null) return `${n} (${pct(row.pct)})`;
    return n;
  };

  return (
    <Card title={t("seasonStats")}>
      <table className="w-full tabular-nums">
        <thead>
          <tr>
            <td />
            <th scope="col" className={`${th} text-right`}>{t("total")}</th>
            <th scope="col" className={`${th} text-right`}>{t("per90")}</th>
          </tr>
        </thead>
        {stats.map((group) => (
          <tbody key={group.group}>
            <tr>
              <th scope="colgroup" colSpan={3} className={`${th} pt-4 text-left text-text`}>
                {t(`Group.${group.group}`)}
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.key} className="hover:bg-raised">
                <th scope="row" className={`${td} text-left font-normal`}>{t(`Stat.${row.key}`)}</th>
                <td className={`${td} text-right`}>{total(row)}</td>
                <td className={`${td} text-right`}>{row.per90 === null ? "" : formatNumber(row.per90, 2, locale)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </Card>
  );
}
