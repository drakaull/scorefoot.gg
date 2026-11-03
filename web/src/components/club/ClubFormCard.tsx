import { useTranslations } from "next-intl";
import { MatchStrip } from "@/components/MatchStrip";
import { ResultChip } from "@/components/ResultChip";
import { result, type ClubMatch } from "@/lib/club";

/** Last 5 league matches of the club, score from its side. */
export function ClubFormCard({ form }: { form: ClubMatch[] }) {
  const t = useTranslations("Club");
  return (
    <MatchStrip
      title={t("lastMatches")}
      empty={t("noMatch")}
      matches={form.map((m) => ({
        key: m.fixtureId,
        title: m.opponent.name,
        badge: <ResultChip result={result(m)} />,
        label: t(m.home ? "home" : "away", { code: m.opponent.code ?? m.opponent.name.slice(0, 3).toUpperCase() }),
        lines: [`${m.goalsFor}-${m.goalsAgainst}`],
      }))}
    />
  );
}
