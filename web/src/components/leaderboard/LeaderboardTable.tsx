import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { ClubName } from "@/components/ClubName";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Link } from "@/i18n/navigation";
import type { Leaderboard } from "@/lib/leaderboard";
import { formatNumber } from "@/lib/player";
import { entityPath } from "@/lib/slug";
import { LeaderboardValue } from "./LeaderboardValue";

const cell = "px-2 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";
const th = `${cell} py-2 text-caption font-semibold tracking-[0.04em] text-muted uppercase`;
const td = `${cell} h-13 border-t border-border`;
const wide = "hidden sm:table-cell";

/** Ranks after the podium (4 to 50, or all rows when there is no podium). */
export function LeaderboardTable({ board, from }: { board: Leaderboard; from: number }) {
  const t = useTranslations("Leaderboards");
  const tPos = useTranslations("Position");
  const locale = useLocale();
  const rows = board.rows.slice(from);
  const showPer90 = board.mode === "total" && board.rows.some((r) => r.per90 !== null);

  return (
    <Card>
      {rows.length > 0 && (
        <table className="w-full tabular-nums">
          <thead>
            <tr>
              <th scope="col" className={`${th} text-center`}>{t("rank")}</th>
              <th scope="col" className={`${th} text-left`}>{t("player")}</th>
              <th scope="col" className={`${th} ${wide} text-right`}>{t("apps")}</th>
              <th scope="col" className={`${th} ${wide} text-right`}>{t("min")}</th>
              {showPer90 && <th scope="col" className={`${th} ${wide} text-right whitespace-nowrap`}>{t("per90")}</th>}
              <th scope="col" className={`${th} text-right`}>{t(`Chip.${board.stat}`)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player.id} className="hover:bg-raised">
                <td className={`${td} w-12 text-center font-semibold text-muted`}>{r.rank}</td>
                <td className={`${td} w-full max-w-0`}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <PlayerAvatar name={r.player.name} photo={r.player.photo} />
                    <div className="min-w-0">
                      <Link prefetch={false} href={entityPath("players", r.player.id, r.player.name)} className="block truncate leading-tight font-semibold hover:text-accent">
                        {r.player.name}
                      </Link>
                      <p className="truncate text-caption text-muted">
                        <ClubName club={r.club} />
                        {r.position && ` · ${tPos.has(r.position) ? tPos(r.position) : r.position}`}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={`${td} ${wide} text-right`}>{r.appearances}</td>
                <td className={`${td} ${wide} text-right`}>{formatNumber(r.minutes, 0, locale)}</td>
                {showPer90 && <td className={`${td} ${wide} text-right`}>{r.per90 === null ? "" : formatNumber(r.per90, 2, locale)}</td>}
                <td className={`${td} text-right font-bold text-accent`}>
                  <LeaderboardValue board={board} value={r.value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {board.minMinutes !== null && (
        <p className="border-t border-border px-4 py-3 text-caption text-muted first:border-t-0 sm:px-5">{t("minNote", { min: board.minMinutes })}</p>
      )}
    </Card>
  );
}
