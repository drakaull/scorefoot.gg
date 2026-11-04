import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Card } from "@/components/Card";
import { CompareCard, EmptySlot } from "@/components/compare/CompareCard";
import { CompareRadar } from "@/components/compare/CompareRadar";
import { CompareStats } from "@/components/compare/CompareStats";
import { permanentRedirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { fetchPage } from "@/lib/api";
import { compareHref, parseCompare, type ComparePick } from "@/lib/compare";
import type { Player } from "@/lib/player";
import { slugify } from "@/lib/slug";

type Props = {
  params: Promise<{ locale: string; players?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// The page and its metadata need the same answers. Player 2 is ranked on player 1's position radar.
const load = cache(async (slugs: string[] | undefined, query: Record<string, string | string[] | undefined>) => {
  const slots = parseCompare(slugs, query);
  if (slots === "invalid") notFound();
  const [s1, s2] = slots;
  const first = s1 ? ((await fetchPage<Player>("players", s1.id, s1.season)) ?? notFound()) : null;
  const radarPosition = first?.position ? { radarPosition: first.position } : undefined;
  const second = s2 ? ((await fetchPage<Player>("players", s2.id, s2.season, radarPosition)) ?? notFound()) : null;
  return { slots, players: [first, second] as const };
});

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, players: slugs } = await params;
  const { players } = await load(slugs, await searchParams);
  const t = await getTranslations({ locale, namespace: "Compare" });
  const [a, b] = players;
  return { title: a && b ? t("titleVs", { a: a.name, b: b.name }) : t("title"), description: t("description") };
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { locale, players: slugs } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { slots, players } = await load(slugs, await searchParams);
  const t = await getTranslations({ locale, namespace: "Compare" });
  const [a, b] = players;

  // Seasons as asked in the URL (not the defaults), so links keep "latest" when nothing was chosen.
  const picks: [ComparePick, ComparePick] = [
    a && { id: a.id, name: a.name, season: slots[0]?.season },
    b && { id: b.id, name: b.name, season: slots[1]?.season },
  ];

  // Wrong or missing names in the URL: send to the right ones, keeping the seasons.
  if (players.some((p, i) => p && slots[i]?.slug !== `${p.id}-${slugify(p.name)}`)) {
    const href = compareHref(picks);
    // A plain path when there is no season, or the Location would end with an empty "?".
    permanentRedirect({ href: Object.keys(href.query).length ? href : href.pathname, locale });
  }

  return (
    <div data-pending-scope className="flex flex-col gap-3 py-4 sm:gap-4 sm:py-6">
      <h1 className="text-h1-mobile font-bold sm:text-h1">{t("heading")}</h1>
      <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
        {a ? <CompareCard player={a} slot={0} picks={picks} /> : <EmptySlot slot={0} picks={picks} />}
        {b ? <CompareCard player={b} slot={1} picks={picks} /> : <EmptySlot slot={1} picks={picks} />}
      </div>
      {/* Fades while another season or player loads (globals.css, LinkPending). */}
      <div data-pending-dim className="flex flex-col gap-3 sm:gap-4">
        {a && b ? (
          <>
            <CompareRadar players={[a, b]} />
            <CompareStats players={[a, b]} />
          </>
        ) : (
          <Card className="p-6 text-center text-muted">{a ? t("pickSecond") : t("pick")}</Card>
        )}
      </div>
    </div>
  );
}
