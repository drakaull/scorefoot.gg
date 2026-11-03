import { useLocale, useTranslations } from "next-intl";
import { StatCardGrid } from "@/components/StatCardGrid";
import type { Club } from "@/lib/club";
import { delta, formatNumber, seasonLabel } from "@/lib/player";

const signed = (n: number, locale: string) => (n > 0 ? "+" : n < 0 ? "−" : "") + formatNumber(Math.abs(n), 0, locale);

export function ClubStatCards({ club }: { club: Club }) {
  const t = useTranslations("Club");
  const locale = useLocale();
  const { standing: now, previous: before } = club;
  const vs = seasonLabel(club.season - 1, "short");
  const change = (d: ReturnType<typeof delta>) => d && { text: t("vsSeason", { delta: d.text, season: vs }), sign: d.sign };
  const goalDiff = (s: typeof now) => s.goalsFor - s.goalsAgainst;

  return (
    <StatCardGrid
      cards={[
        {
          label: t("rank"),
          value: t("rankValue", { rank: now.rank }),
          colour: now.rank === 1 ? "text-gold" : undefined,
          // A lower rank is better: (previous, current) makes 3rd → 2nd read +1.
          change: change(delta(before?.rank ?? null, now.rank, 0, locale)),
        },
        { label: t("points"), value: formatNumber(now.points, 0, locale), change: change(delta(now.points, before?.points ?? null, 0, locale)) },
        { label: t("record"), value: `${now.won}-${now.drawn}-${now.lost}`, sub: t("played", { count: now.played }) },
        {
          label: t("goalDiff"),
          value: signed(goalDiff(now), locale),
          change: change(delta(goalDiff(now), before ? goalDiff(before) : null, 0, locale)),
          sub: t("goalsForAgainst", { for: now.goalsFor, against: now.goalsAgainst }),
        },
      ]}
    />
  );
}
