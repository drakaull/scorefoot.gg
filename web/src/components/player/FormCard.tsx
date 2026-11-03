import { useTranslations } from "next-intl";
import { MatchStrip } from "@/components/MatchStrip";
import { RatingBadge } from "@/components/RatingBadge";
import type { FormMatch } from "@/lib/player";

const result = (m: FormMatch) =>
  m.goalsFor === null || m.goalsAgainst === null ? null : m.goalsFor > m.goalsAgainst ? "W" : m.goalsFor < m.goalsAgainst ? "L" : "D";

/** Last 5 matches of the player in the season: rating, opponent, result and minutes. */
export function FormCard({ form }: { form: FormMatch[] }) {
  const t = useTranslations("Player");
  return (
    <MatchStrip
      title={t("lastMatches")}
      empty={t("noMatch")}
      matches={form.map((m) => {
        const r = result(m);
        return {
          key: m.fixtureId,
          title: m.opponent.name,
          badge: <RatingBadge rating={m.rating} />,
          label: t(m.home ? "home" : "away", { code: m.opponent.code ?? m.opponent.name.slice(0, 3).toUpperCase() }),
          lines: [r ? t("result", { result: r, score: `${m.goalsFor}-${m.goalsAgainst}` }) : "", t("minutesPlayed", { minutes: m.minutes })],
        };
      })}
    />
  );
}
