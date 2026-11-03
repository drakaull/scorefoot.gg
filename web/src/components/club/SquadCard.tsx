import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { RatingBadge } from "@/components/RatingBadge";
import { Link } from "@/i18n/navigation";
import type { SquadPlayer } from "@/lib/club";
import { formatNumber } from "@/lib/player";
import { entityPath } from "@/lib/slug";
import { PlayerAvatar } from "./KeyPlayersCard";

const cell = "px-2 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";
const th = `${cell} py-2 text-caption font-semibold tracking-[0.04em] text-muted uppercase`;
const td = `${cell} h-11 border-t border-border`;
const wide = "hidden sm:table-cell";

/** Players who played for the club this season, grouped by position (the api sends them in that order). */
export function SquadCard({ squad }: { squad: SquadPlayer[] }) {
  const t = useTranslations("Club");
  const tPlural = useTranslations("PositionPlural");
  const locale = useLocale();
  const groups = Map.groupBy(squad, (p) => p.position ?? "");

  return (
    <Card title={t("squad", { count: squad.length })}>
      <table className="w-full tabular-nums">
        <thead>
          <tr>
            <th scope="col" className={`${th} text-left`}>{t("player")}</th>
            <th scope="col" className={`${th} text-right`}>{t("apps")}</th>
            <th scope="col" className={`${th} ${wide} text-right`}>{t("min")}</th>
            <th scope="col" className={`${th} text-right`}>{t("goals")}</th>
            <th scope="col" className={`${th} ${wide} text-right`}>{t("assists")}</th>
            <th scope="col" className={`${th} text-right`}>{t("rating")}</th>
          </tr>
        </thead>
        {[...groups].map(([position, players]) => (
          <tbody key={position}>
            {position && (
              <tr>
                <th scope="colgroup" colSpan={6} className={`${th} pt-4 text-left text-text`}>
                  {tPlural.has(position) ? tPlural(position) : position}
                </th>
              </tr>
            )}
            {players.map((p) => (
              <tr key={p.id} className="hover:bg-raised">
                <td className={`${td} w-full max-w-0 text-left`}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <PlayerAvatar name={p.name} photo={p.photo} />
                    <Link prefetch={false} href={entityPath("players", p.id, p.name)} className="truncate font-semibold hover:text-accent">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className={`${td} text-right`}>{p.appearances}</td>
                <td className={`${td} ${wide} text-right`}>{formatNumber(p.minutes, 0, locale)}</td>
                <td className={`${td} text-right`}>{p.goals}</td>
                <td className={`${td} ${wide} text-right`}>{p.assists}</td>
                <td className={`${td} text-right`}>
                  <RatingBadge rating={p.rating} />
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </Card>
  );
}
