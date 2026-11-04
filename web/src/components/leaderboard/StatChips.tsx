import { useTranslations } from "next-intl";
import { LinkPending } from "@/components/LinkPending";
import { Link } from "@/i18n/navigation";
import { leaderboardHref, STATS, type Filters, type Stat } from "@/lib/leaderboard";

/** The 12 stats as chips; switching keeps the filters. Scrolls sideways on mobile. */
export function StatChips({ current, filters }: { current: Stat; filters: Filters }) {
  const t = useTranslations("Leaderboards");
  return (
    <nav aria-label={t("stats")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {STATS.map((stat) => (
        <Link
          key={stat}
          href={leaderboardHref(stat, filters)}
          aria-current={stat === current ? "page" : undefined}
          className={`shrink-0 rounded-sm border px-3 py-1.5 text-body font-semibold whitespace-nowrap ${
            stat === current
              ? "border-accent bg-accent text-ink"
              : "border-border bg-raised text-muted hover:border-accent has-[[data-link-pending]]:border-accent has-[[data-link-pending]]:text-text"
          }`}
        >
          {t(`Chip.${stat}`)}
          <LinkPending />
        </Link>
      ))}
    </nav>
  );
}
