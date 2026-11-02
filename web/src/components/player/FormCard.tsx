import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { RatingBadge } from "@/components/RatingBadge";
import type { FormMatch } from "@/lib/player";

const result = (m: FormMatch) =>
  m.goalsFor === null || m.goalsAgainst === null ? null : m.goalsFor > m.goalsAgainst ? "W" : m.goalsFor < m.goalsAgainst ? "L" : "D";

/** Last 5 matches of the season, most recent on the left. */
export function FormCard({ form }: { form: FormMatch[] }) {
  const t = useTranslations("Player");
  return (
    <Card title={t("lastMatches")}>
      {form.length === 0 ? (
        <p className="p-4 text-muted sm:p-5">{t("noMatch")}</p>
      ) : (
        <ol className="flex gap-1.5 p-3 sm:gap-2 sm:p-4">
          {form.map((m) => {
            const code = m.opponent.code ?? m.opponent.name.slice(0, 3).toUpperCase();
            const r = result(m);
            return (
              <li key={m.fixtureId} title={m.opponent.name} className="min-w-0 flex-1 rounded-sm bg-raised px-0.5 py-2.5 text-center">
                <RatingBadge rating={m.rating} />
                <p className="mt-1.5 truncate text-caption font-semibold">{t(m.home ? "home" : "away", { code })}</p>
                <p className="text-caption text-muted tabular-nums">
                  {r && t("result", { result: r, score: `${m.goalsFor}-${m.goalsAgainst}` })}
                </p>
                <p className="text-caption text-muted tabular-nums">{t("minutesPlayed", { minutes: m.minutes })}</p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
