import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { ClubName } from "@/components/ClubName";
import { ResultChip } from "@/components/ResultChip";
import { matchday, result, type ClubMatch } from "@/lib/club";

const SHOWN = 10;
const td = "h-11 border-t border-border px-2 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";

/** Every league match of the season, most recent first: 10 shown, the rest behind a native <details>. */
export function ResultsCard({ results }: { results: ClubMatch[] }) {
  const t = useTranslations("Club");
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });

  const rows = (matches: ClubMatch[]) => (
    <table className="w-full tabular-nums">
      <tbody>
        {matches.map((m) => {
          const day = matchday(m.round);
          return (
            <tr key={m.fixtureId} className="hover:bg-raised">
              <td className={`${td} leading-tight whitespace-nowrap`}>
                {date.format(new Date(m.kickoffUtc))}
                <span className="block text-caption text-muted">{day === null ? m.round : t("matchday", { n: day })}</span>
              </td>
              <td className={`${td} w-full max-w-0`}>
                <div className="flex min-w-0 items-center gap-2">
                  {m.opponent.logo ? (
                    <Image src={m.opponent.logo} alt="" width={24} height={24} unoptimized className="size-6 shrink-0 object-contain" />
                  ) : (
                    <span aria-hidden="true" className="size-6 shrink-0" />
                  )}
                  <span className="shrink-0 text-caption text-muted">{t(m.home ? "homeShort" : "awayShort")}</span>
                  <ClubName club={{ ...m.opponent, hasPage: true }} className="truncate font-semibold" />
                </div>
              </td>
              <td className={`${td} text-right font-bold whitespace-nowrap`}>
                {m.goalsFor}-{m.goalsAgainst}
              </td>
              <td className={`${td} text-right`}>
                <ResultChip result={result(m)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <Card title={t("results")}>
      {results.length === 0 ? (
        <p className="p-4 text-muted sm:p-5">{t("noMatch")}</p>
      ) : (
        <>
          {rows(results.slice(0, SHOWN))}
          {results.length > SHOWN && (
            <details className="group">
              <summary className="cursor-pointer list-none border-t border-border p-3 text-center font-semibold text-accent hover:text-accent-hover group-open:hidden">
                {t("showAll", { count: results.length })}
              </summary>
              {rows(results.slice(SHOWN))}
            </details>
          )}
        </>
      )}
    </Card>
  );
}
