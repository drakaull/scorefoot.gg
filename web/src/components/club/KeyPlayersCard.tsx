import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { RatingBadge } from "@/components/RatingBadge";
import { Link } from "@/i18n/navigation";
import type { Club, KeyPlayer } from "@/lib/club";
import { formatNumber } from "@/lib/player";
import { entityPath, initials } from "@/lib/slug";

/** Photo or initials, 32px circle. */
export function PlayerAvatar({ name, photo }: { name: string; photo: string | null }) {
  return photo ? (
    <Image src={photo} alt="" width={32} height={32} unoptimized className="size-8 shrink-0 rounded-full border border-border bg-raised object-cover" />
  ) : (
    <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-raised text-caption font-bold text-muted">
      {initials(name)}
    </span>
  );
}

/** Top scorer, top assists, best rated (900+ min) and most used player of the season. */
export function KeyPlayersCard({ keyPlayers }: { keyPlayers: Club["keyPlayers"] }) {
  const t = useTranslations("Club");
  const locale = useLocale();
  const rows: { label: string; player: KeyPlayer | null; value: (p: KeyPlayer) => React.ReactNode }[] = [
    { label: t("topScorer"), player: keyPlayers.topScorer, value: (p) => t("goalsValue", { n: p.value }) },
    { label: t("topAssists"), player: keyPlayers.topAssists, value: (p) => t("assistsValue", { n: p.value }) },
    { label: t("bestRated"), player: keyPlayers.bestRated, value: (p) => <RatingBadge rating={p.value} /> },
    { label: t("mostMinutes"), player: keyPlayers.mostMinutes, value: (p) => t("minutesValue", { n: formatNumber(p.value, 0, locale) }) },
  ];

  return (
    <Card title={t("keyPlayers")}>
      <ul>
        {rows.map(({ label, player, value }) => (
          <li key={label} className="flex items-center gap-3 border-t border-border px-4 py-2.5 first:border-t-0 sm:px-5">
            {player ? <PlayerAvatar name={player.name} photo={player.photo} /> : <span className="size-8 shrink-0" />}
            <div className="min-w-0">
              <p className="text-caption font-semibold tracking-[0.04em] text-muted uppercase">{label}</p>
              {player ? (
                <Link href={entityPath("players", player.id, player.name)} className="block truncate font-semibold hover:text-accent">
                  {player.name}
                </Link>
              ) : (
                <p className="text-muted">–</p>
              )}
            </div>
            {player && <div className="ml-auto shrink-0 font-bold tabular-nums">{value(player)}</div>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
