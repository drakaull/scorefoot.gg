import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { RATING_TEXT } from "@/components/RatingBadge";
import { delta, formatNumber, formatRating, ratingBand, seasonLabel, type Player } from "@/lib/player";

const DELTA_COLOUR = { 1: "text-accent", 0: "text-muted", [-1]: "text-error" } as const;

export function StatCards({ player }: { player: Player }) {
  const t = useTranslations("Player");
  const locale = useLocale();
  const { summary: now, previous: before } = player;
  const band = ratingBand(now.rating);

  const cards = [
    { label: t("goals"), value: formatNumber(now.goals, 0, locale), change: delta(now.goals, before?.goals ?? null, 0, locale) },
    { label: t("assists"), value: formatNumber(now.assists, 0, locale), change: delta(now.assists, before?.assists ?? null, 0, locale) },
    {
      label: t("avgRating"),
      value: formatRating(now.rating, locale),
      colour: band ? RATING_TEXT[band] : "text-muted",
      change: delta(now.rating, before?.rating ?? null, 1, locale),
    },
    { label: t("minutes"), value: formatNumber(now.minutes, 0, locale), sub: t("apps", { count: now.appearances }) },
  ];
  const vs = seasonLabel(player.season - 1, "short");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-caption font-semibold tracking-[0.04em] text-muted uppercase">{card.label}</p>
          <p className={`text-stat leading-tight font-bold tabular-nums ${card.colour ?? ""}`}>{card.value}</p>
          {card.change ? (
            <p className={`text-caption ${DELTA_COLOUR[card.change.sign]}`}>{t("vsSeason", { delta: card.change.text, season: vs })}</p>
          ) : (
            card.sub && <p className="text-caption text-muted">{card.sub}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
