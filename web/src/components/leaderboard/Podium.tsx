import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { ClubName } from "@/components/ClubName";
import { Link } from "@/i18n/navigation";
import type { Leaderboard, LeaderboardRow } from "@/lib/leaderboard";
import { formatNumber } from "@/lib/player";
import { entityPath, initials } from "@/lib/slug";
import { LeaderboardValue } from "./LeaderboardValue";

/** Top 3 as cards: 1st in the middle, taller, in Gold; 2nd left, 3rd right. */
export function Podium({ board }: { board: Leaderboard }) {
  const t = useTranslations("Leaderboards");
  const locale = useLocale();
  const [first, second, third] = board.rows;
  if (!first || !second || !third) return null;

  const card = (row: LeaderboardRow, place: "first" | "side") => (
    <Card
      key={row.player.id}
      className={`min-w-0 px-1.5 text-center sm:px-4 ${place === "first" ? "py-4 shadow-[inset_0_-3px_0_var(--color-gold)] sm:py-6" : "py-3 sm:py-4"}`}
    >
      <p className={`text-h2 font-bold ${place === "first" ? "text-gold" : ""}`}>{row.rank}</p>
      {row.player.photo ? (
        <Image
          src={row.player.photo}
          alt=""
          width={72}
          height={72}
          unoptimized
          className="mx-auto my-2 size-12 rounded-full border border-border bg-raised object-cover sm:size-18"
        />
      ) : (
        <span aria-hidden="true" className="mx-auto my-2 grid size-12 place-items-center rounded-full border border-border bg-raised font-bold text-muted sm:size-18">
          {initials(row.player.name)}
        </span>
      )}
      <Link prefetch={false} href={entityPath("players", row.player.id, row.player.name)} className="block truncate text-caption font-semibold hover:text-accent sm:text-body">
        {row.player.name}
      </Link>
      <ClubName club={row.club} className="block truncate text-caption text-muted" />
      <p className={`mt-1 text-h1-mobile leading-tight font-bold tabular-nums sm:text-stat ${place === "first" ? "text-gold" : ""}`}>
        <LeaderboardValue board={board} value={row.value} />
      </p>
      {row.per90 !== null && board.mode === "total" && (
        <p className="text-caption text-muted">{t("perNinety", { value: formatNumber(row.per90, 2, locale) })}</p>
      )}
    </Card>
  );

  return (
    <section aria-label={t("podium")} className="grid grid-cols-[1fr_1.15fr_1fr] items-end gap-2 sm:gap-4">
      {card(second, "side")}
      {card(first, "first")}
      {card(third, "side")}
    </section>
  );
}
