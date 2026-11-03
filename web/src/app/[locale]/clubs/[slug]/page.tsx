import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ClubFormCard } from "@/components/club/ClubFormCard";
import { ClubHeader } from "@/components/club/ClubHeader";
import { ClubStatCards } from "@/components/club/ClubStatCards";
import { KeyPlayersCard } from "@/components/club/KeyPlayersCard";
import { LeagueTableCard } from "@/components/club/LeagueTableCard";
import { ResultsCard } from "@/components/club/ResultsCard";
import { SquadCard } from "@/components/club/SquadCard";
import { permanentRedirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { fetchPage } from "@/lib/api";
import type { Club } from "@/lib/club";
import { parseId, parseSeason, seasonLabel } from "@/lib/player";
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
  return (await fetchPage<Club>("clubs", id, season)) ?? notFound();
});

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const club = await load(slug, (await searchParams).season);
  const t = await getTranslations({ locale, namespace: "Club" });
  return {
    title: t("title", { name: club.name }),
    description: t("description", { name: club.name, league: club.league.name, season: seasonLabel(club.season) }),
  };
}

export default async function ClubRoute({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const rawSeason = (await searchParams).season;
  const club = await load(slug, rawSeason);
  const t = await getTranslations({ locale, namespace: "Club" });

  // Wrong or missing name in the URL: send to the right one, keeping the chosen season.
  const path = entityPath("clubs", club.id, club.name);
  if (`/clubs/${slug}` !== path) {
    const href = rawSeason === undefined ? path : { pathname: path, query: { season: club.season } };
    permanentRedirect({ href, locale });
  }

  return (
    <div data-pending-scope className="flex flex-col gap-3 py-4 sm:gap-4 sm:py-6">
      <ClubHeader club={club} />
      {/* Fades while a season tab loads (globals.css, LinkPending). */}
      <div data-pending-dim className="flex flex-col gap-3 sm:gap-4">
        <ClubStatCards club={club} />
        <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
          <ClubFormCard form={club.form} />
          <KeyPlayersCard keyPlayers={club.keyPlayers} />
        </div>
        <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
          <LeagueTableCard
            title={t("table", { league: club.league.name, season: seasonLabel(club.season) })}
            table={club.table}
            clubId={club.id}
          />
          <ResultsCard results={club.results} />
        </div>
        <SquadCard squad={club.squad} />
      </div>
    </div>
  );
}
