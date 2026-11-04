import { getTranslations, setRequestLocale } from "next-intl/server";
import { PreviewCard } from "@/components/leaderboard/PreviewCard";
import { Mark } from "@/components/Mark";
import { SearchBox } from "@/components/SearchBox";
import { fetchLeaderboard, type Leaderboard } from "@/lib/leaderboard";
import { seasonLabel } from "@/lib/player";

// Preview cards are a bonus: if the api cannot answer, the home page still shows the search.
const preview = (stat: "goals" | "rating" | "assists") => fetchLeaderboard(stat, {}).catch((): Leaderboard | null => null);

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Home" });
  const tLb = await getTranslations({ locale, namespace: "Leaderboards" });
  const [scorers, rated, assists] = await Promise.all([preview("goals"), preview("rating"), preview("assists")]);
  const cards = [
    { key: "cardTopScorers", board: scorers },
    { key: "cardBestRated", board: rated },
    { key: "cardTopAssists", board: assists },
  ] as const;

  return (
    <>
      <section className="pt-10 pb-6 text-center sm:pt-16 sm:pb-10">
        <h1 className="flex items-center justify-center gap-3.5 text-display-mobile font-extrabold tracking-[-0.02em] sm:text-display">
          <Mark className="size-8 rounded-button sm:size-12 sm:rounded-[12px]" />
          <span>
            ScoreFoot<span className="text-accent">.gg</span>
          </span>
        </h1>
        <p className="mt-2 text-muted">{t("tagline")}</p>
        <SearchBox />
      </section>
      <div className="grid gap-3 pb-10 sm:gap-4 lg:grid-cols-3">
        {cards.map(
          ({ key, board }) =>
            board &&
            board.rows.length > 0 && <PreviewCard key={key} title={tLb(key, { season: seasonLabel(board.season) })} board={board} />,
        )}
      </div>
    </>
  );
}
