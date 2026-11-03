import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FiltersForm } from "@/components/leaderboard/FiltersForm";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { ModeSwitch } from "@/components/leaderboard/ModeSwitch";
import { Podium } from "@/components/leaderboard/Podium";
import { StatChips } from "@/components/leaderboard/StatChips";
import { Card } from "@/components/Card";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { fetchLeaderboard, isStat, parseFilters, type Filters, type Leaderboard } from "@/lib/leaderboard";
import { seasonLabel } from "@/lib/player";

type Props = {
  params: Promise<{ locale: string; stat: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// The page and its metadata need the same answer: one api call per request.
const load = cache(async (stat: string, params: Record<string, string | string[] | undefined>) => {
  const filters = parseFilters(params);
  if (!isStat(stat) || filters === "invalid") notFound();
  const board = (await fetchLeaderboard(stat, filters)) ?? notFound();
  return { board, filters };
});

async function summary(locale: string, board: Leaderboard) {
  const t = await getTranslations({ locale, namespace: "Leaderboards" });
  return [
    board.leagues.find((l) => l.id === board.league)?.name ?? t("allLeagues"),
    seasonLabel(board.season),
    board.position ? t(`Positions.${board.position}`) : t("allPositions"),
    board.age ? t(`Ages.${board.age}`) : t("allAges"),
  ].join(" · ");
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, stat } = await params;
  const { board } = await load(stat, await searchParams);
  const t = await getTranslations({ locale, namespace: "Leaderboards" });
  const name = t(`Title.${board.stat}`);
  return { title: t("title", { stat: name }), description: t("description", { stat: name, filters: await summary(locale, board) }) };
}

export default async function LeaderboardRoute({ params, searchParams }: Props) {
  const { locale, stat } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { board, filters } = await load(stat, await searchParams);
  const t = await getTranslations({ locale, namespace: "Leaderboards" });
  // Filters as the api applied them, so links keep the season it chose by default.
  const active: Filters = { ...filters, season: board.season };
  const hasPodium = board.rows.length >= 3;

  return (
    <div data-pending-scope className="flex flex-col gap-3 py-4 sm:gap-4 sm:py-6">
      <div>
        <h1 className="text-h1-mobile font-bold sm:text-h1">{t(`Title.${board.stat}`)}</h1>
        <p className="text-muted">{await summary(locale, board)}</p>
      </div>
      <StatChips current={board.stat} filters={active} />
      <div className="flex flex-wrap items-center gap-2">
        <FiltersForm key={`${board.season}-${board.league}-${board.position}-${board.age}-${board.mode}`} board={board} />
        <ModeSwitch stat={board.stat} filters={active} />
      </div>
      {/* Fades while another stat or filter loads (globals.css, LinkPending). */}
      <div data-pending-dim className="flex flex-col gap-3 sm:gap-4">
        {board.rows.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted">{t("empty")}</p>
            <Link href={`/leaderboards/${board.stat}`} className="mt-3 inline-block font-semibold text-accent hover:text-accent-hover">
              {t("reset")}
            </Link>
          </Card>
        ) : (
          <>
            {hasPodium && <Podium board={board} />}
            <LeaderboardTable board={board} from={hasPodium ? 3 : 0} />
          </>
        )}
      </div>
    </div>
  );
}
