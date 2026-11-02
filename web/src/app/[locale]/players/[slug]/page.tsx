import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FormCard } from "@/components/player/FormCard";
import { HistoryCard } from "@/components/player/HistoryCard";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { RadarCard } from "@/components/player/RadarCard";
import { StatCards } from "@/components/player/StatCards";
import { StatsCard } from "@/components/player/StatsCard";
import { permanentRedirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { fetchPlayer, parseId, parseSeason, seasonLabel } from "@/lib/player";
import { entityPath } from "@/lib/slug";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// The page and its metadata need the same answer: one api call per request.
const load = cache(async (slug: string, rawSeason: string | string[] | undefined) => {
  const id = parseId(slug);
  const season = parseSeason(rawSeason);
  if (id === null || season === "invalid") notFound();
  return (await fetchPlayer(id, season)) ?? notFound();
});

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const player = await load(slug, (await searchParams).season);
  const t = await getTranslations({ locale, namespace: "Player" });
  return {
    title: t("title", { name: player.name }),
    description: t("description", { name: player.name, season: seasonLabel(player.season) }),
  };
}

export default async function PlayerRoute({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const rawSeason = (await searchParams).season;
  const player = await load(slug, rawSeason);

  // Wrong or missing name in the URL: send to the right one, keeping the chosen season.
  const path = entityPath("players", player.id, player.name);
  if (`/players/${slug}` !== path) {
    const href = rawSeason === undefined ? path : { pathname: path, query: { season: player.season } };
    permanentRedirect({ href, locale });
  }

  return (
    <div className="flex flex-col gap-3 py-4 sm:gap-4 sm:py-6">
      <PlayerHeader player={player} />
      <StatCards player={player} />
      <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
        <FormCard form={player.form} />
        <RadarCard player={player} />
      </div>
      <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
        <StatsCard stats={player.stats} />
        <HistoryCard history={player.history} />
      </div>
    </div>
  );
}
