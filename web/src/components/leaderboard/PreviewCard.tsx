import { useTranslations } from "next-intl";
import { ClubName } from "@/components/ClubName";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Link } from "@/i18n/navigation";
import type { Leaderboard } from "@/lib/leaderboard";
import { entityPath } from "@/lib/slug";
import { LeaderboardValue } from "./LeaderboardValue";

const SHOWN = 5;

/** Home preview of a leaderboard: top 5 and a link to the full ranking (Card with the 3px Accent bottom bar). */
export function PreviewCard({ title, board }: { title: string; board: Leaderboard }) {
  const t = useTranslations("Leaderboards");
  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface text-left shadow-[inset_0_-3px_0_var(--color-accent)]">
      <h2 className="border-b border-border p-3.5 text-center text-h3 font-semibold">{title}</h2>
      <ol>
        {board.rows.slice(0, SHOWN).map((r) => (
          <li key={r.player.id} className="flex min-h-13 items-center gap-3 border-t border-border px-4 py-2 first:border-t-0">
            <span className={`w-5 shrink-0 font-semibold ${r.rank === 1 ? "text-gold" : "text-muted"}`}>{r.rank}</span>
            <PlayerAvatar name={r.player.name} photo={r.player.photo} />
            <div className="min-w-0">
              <Link prefetch={false} href={entityPath("players", r.player.id, r.player.name)} className="block truncate leading-tight font-semibold hover:text-accent">
                {r.player.name}
              </Link>
              <ClubName club={r.club} className="block truncate text-caption text-muted" />
            </div>
            <span className="ml-auto shrink-0 font-bold text-accent tabular-nums">
              <LeaderboardValue board={board} value={r.value} />
            </span>
          </li>
        ))}
      </ol>
      <Link
        href={`/leaderboards/${board.stat}`}
        className="block border-t border-border p-3 pb-4 text-center font-semibold text-accent hover:text-accent-hover"
      >
        {t("seeAll")}
      </Link>
    </section>
  );
}
