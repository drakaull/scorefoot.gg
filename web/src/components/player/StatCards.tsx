import { useLocale, useTranslations } from "next-intl";
import { RATING_TEXT } from "@/components/RatingBadge";
import { StatCardGrid } from "@/components/StatCardGrid";
import { delta, formatNumber, formatRating, ratingBand, seasonLabel, type Player } from "@/lib/player";

export function StatCards({ player }: { player: Player }) {
  const t = useTranslations("Player");
  const locale = useLocale();
  const { summary: now, previous: before } = player;
  const band = ratingBand(now.rating);
  const vs = seasonLabel(player.season - 1, "short");
  const change = (d: ReturnType<typeof delta>) => d && { text: t("vsSeason", { delta: d.text, season: vs }), sign: d.sign };

  return (
    <StatCardGrid
      cards={[
        { label: t("goals"), value: formatNumber(now.goals, 0, locale), change: change(delta(now.goals, before?.goals ?? null, 0, locale)) },
        { label: t("assists"), value: formatNumber(now.assists, 0, locale), change: change(delta(now.assists, before?.assists ?? null, 0, locale)) },
        {
          label: t("avgRating"),
          value: formatRating(now.rating, locale),
          colour: band ? RATING_TEXT[band] : "text-muted",
          change: change(delta(now.rating, before?.rating ?? null, 1, locale)),
        },
        { label: t("minutes"), value: formatNumber(now.minutes, 0, locale), sub: t("apps", { count: now.appearances }) },
      ]}
    />
  );
}
