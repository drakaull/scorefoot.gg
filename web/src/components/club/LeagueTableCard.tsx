import Image from "next/image";
import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { ClubName } from "@/components/ClubName";
import type { TableRow, Zone } from "@/lib/club";

// Zone colours from docs/DESIGN_SYSTEM.md (same hex as Accent, the rating blue, Gold, the rating orange and Error).
const ZONE_BG: Record<Zone, string> = {
  ucl: "bg-accent",
  uel: "bg-rating-great",
  uecl: "bg-gold",
  playoff: "bg-rating-poor",
  relegation: "bg-error",
};
const ZONE_ORDER: Zone[] = ["ucl", "uel", "uecl", "playoff", "relegation"];

const cell = "px-2 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";
const th = `${cell} py-2 text-caption font-semibold tracking-[0.04em] text-muted uppercase`;
const td = `${cell} h-11 border-t border-border`;
const wide = "hidden sm:table-cell";

/** The league's standings with zone bars; the page's club is highlighted. */
export function LeagueTableCard({ title, table, clubId }: { title: string; table: TableRow[]; clubId: number }) {
  const t = useTranslations("Club");
  const zones = ZONE_ORDER.filter((z) => table.some((r) => r.zone === z));
  const gd = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

  return (
    <Card title={title}>
      <table className="w-full tabular-nums">
        <thead>
          <tr>
            <th scope="col" className={`${th} text-left`}>#</th>
            <th scope="col" className={`${th} text-left`}>{t("club")}</th>
            <th scope="col" className={`${th} ${wide} text-right`}>{t("colPlayed")}</th>
            <th scope="col" className={`${th} ${wide} text-right`}>{t("colWon")}</th>
            <th scope="col" className={`${th} ${wide} text-right`}>{t("colDrawn")}</th>
            <th scope="col" className={`${th} ${wide} text-right`}>{t("colLost")}</th>
            <th scope="col" className={`${th} text-right`}>{t("colGoalDiff")}</th>
            <th scope="col" className={`${th} text-right`}>{t("colPoints")}</th>
          </tr>
        </thead>
        <tbody>
          {table.map((r) => {
            const me = r.club.id === clubId;
            return (
              <tr key={r.club.id} aria-current={me ? "true" : undefined} className={me ? "bg-raised" : "hover:bg-raised"}>
                <td className={`${td} relative text-left`}>
                  {r.zone && (
                    <span aria-hidden="true" className={`absolute top-2 bottom-2 left-0 w-[3px] rounded-r-sm ${ZONE_BG[r.zone]}`} />
                  )}
                  <span className={`font-semibold ${me ? "text-accent" : "text-muted"}`}>{r.rank}</span>
                  {r.zone && <span className="sr-only"> ({t(`Zone.${r.zone}`)})</span>}
                </td>
                <td className={`${td} w-full max-w-0 text-left`}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {r.club.logo ? (
                      <Image src={r.club.logo} alt="" width={24} height={24} unoptimized className="size-6 shrink-0 object-contain" />
                    ) : (
                      <span aria-hidden="true" className="size-6 shrink-0" />
                    )}
                    <ClubName club={r.club} className={`truncate font-semibold ${me ? "text-accent" : ""}`} />
                  </div>
                </td>
                <td className={`${td} ${wide} text-right`}>{r.played}</td>
                <td className={`${td} ${wide} text-right`}>{r.won}</td>
                <td className={`${td} ${wide} text-right`}>{r.drawn}</td>
                <td className={`${td} ${wide} text-right`}>{r.lost}</td>
                <td className={`${td} text-right`}>{gd(r.goalDiff)}</td>
                <td className={`${td} text-right font-bold`}>{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {zones.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-caption text-muted sm:px-5">
          {zones.map((z) => (
            <li key={z} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-2.5 rounded-xs ${ZONE_BG[z]}`} />
              {t(`Zone.${z}`)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
