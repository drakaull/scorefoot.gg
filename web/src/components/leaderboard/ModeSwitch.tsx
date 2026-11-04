import { useTranslations } from "next-intl";
import { LinkPending } from "@/components/LinkPending";
import { Link } from "@/i18n/navigation";
import { hasPer90, leaderboardHref, type Filters, type Stat } from "@/lib/leaderboard";

/** Total / Per 90 switch (links); hidden for stats without a per-90 value. */
export function ModeSwitch({ stat, filters }: { stat: Stat; filters: Filters }) {
  const t = useTranslations("Leaderboards");
  if (!hasPer90(stat)) return null;
  const current = filters.mode ?? "total";
  return (
    <nav aria-label={t("mode")} className="flex overflow-hidden rounded-sm border border-border sm:ml-auto">
      {(["total", "per90"] as const).map((mode) => (
        <Link
          key={mode}
          href={leaderboardHref(stat, { ...filters, mode })}
          aria-current={mode === current ? "page" : undefined}
          className={`px-3 py-1.5 text-body font-semibold ${mode === current ? "bg-raised text-text" : "text-muted hover:text-accent"}`}
        >
          {t(mode)}
          <LinkPending />
        </Link>
      ))}
    </nav>
  );
}
