import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { RatingBadge } from "@/components/RatingBadge";
import { Link } from "@/i18n/navigation";
import { formatNumber, seasonLabel, type HistoryRow } from "@/lib/player";
import { entityPath } from "@/lib/slug";

// Tight columns so the club name keeps room; first and last columns line up with the card padding.
const cell = "px-2 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";
const th = `${cell} py-2 text-caption font-semibold tracking-[0.04em] text-muted uppercase`;
const td = `${cell} h-12 border-t border-border`;
const num = "text-right";
const wide = "hidden sm:table-cell"; // columns dropped under 640px

/** One row per club and season the player played in. Under 640px the season moves under the club name. */
export function HistoryCard({ history }: { history: HistoryRow[] }) {
  const t = useTranslations("Player");
  const locale = useLocale();
  const n = (v: number) => formatNumber(v, 0, locale);

  return (
    <Card title={t("clubHistory")}>
      <table className="w-full tabular-nums">
        <thead>
          <tr>
            <th scope="col" className={`${th} ${wide} text-left`}>{t("season")}</th>
            <th scope="col" className={`${th} text-left max-sm:pl-4`}>{t("club")}</th>
            <th scope="col" className={`${th} ${num}`}>{t("appsShort")}</th>
            <th scope="col" className={`${th} ${wide} ${num}`}>{t("minShort")}</th>
            <th scope="col" className={`${th} ${num}`}>{t("goals")}</th>
            <th scope="col" className={`${th} ${wide} ${num}`}>{t("assists")}</th>
            <th scope="col" className={`${th} ${num}`}>{t("rating")}</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={`${h.season}-${h.club.id}`} className="hover:bg-raised">
              <td className={`${td} ${wide} text-left`}>{seasonLabel(h.season, "short")}</td>
              <td className={`${td} w-full max-w-0 text-left max-sm:pl-4`}>
                <div className="flex min-w-0 items-center gap-2.5">
                  {h.club.logo ? (
                    <Image src={h.club.logo} alt="" width={28} height={28} unoptimized className="size-7 shrink-0 object-contain" />
                  ) : (
                    <span aria-hidden="true" className="size-7 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <Link
                      href={entityPath("clubs", h.club.id, h.club.name)}
                      className="block truncate leading-tight font-semibold hover:text-accent"
                    >
                      {h.club.name}
                    </Link>
                    <p className="truncate text-caption text-muted">
                      <span className="sm:hidden">{seasonLabel(h.season, "short")} · </span>
                      {h.league}
                    </p>
                  </div>
                </div>
              </td>
              <td className={`${td} ${num}`}>{n(h.appearances)}</td>
              <td className={`${td} ${wide} ${num}`}>{n(h.minutes)}</td>
              <td className={`${td} ${num}`}>{n(h.goals)}</td>
              <td className={`${td} ${wide} ${num}`}>{n(h.assists)}</td>
              <td className={`${td} ${num}`}>
                <RatingBadge rating={h.rating} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
