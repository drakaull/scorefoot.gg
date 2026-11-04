import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { Card } from "@/components/Card";
import { select } from "@/components/leaderboard/FiltersForm";
import { RatingBadge } from "@/components/RatingBadge";
import { SearchBox } from "@/components/SearchBox";
import { Link } from "@/i18n/navigation";
import type { ComparePick } from "@/lib/compare";
import { ageOn, formatNumber, seasonLabel, type Player } from "@/lib/player";
import { entityPath, initials } from "@/lib/slug";

// Player 1 Accent, player 2 blue (DESIGN_SYSTEM.md, comparator colours). Full class names so Tailwind keeps them.
export const SLOT_STYLE = [
  { bar: "shadow-[inset_0_3px_0_var(--color-player-1)]", ring: "border-player-1", text: "text-player-1" },
  { bar: "shadow-[inset_0_3px_0_var(--color-player-2)]", ring: "border-player-2", text: "text-player-2" },
] as const;

type SlotProps = { slot: 0 | 1; picks: [ComparePick, ComparePick] };

/** A chosen player: identity, season select, search to swap him, and his 4 key numbers. */
export function CompareCard({ player, slot, picks }: SlotProps & { player: Player }) {
  const t = useTranslations("Compare");
  const tPos = useTranslations("Position");
  const locale = useLocale();
  const age = ageOn(player.birthDate, new Date());
  const other = picks[slot === 0 ? 1 : 0];
  const sub = [player.clubs[0]?.name, player.position && (tPos.has(player.position) ? tPos(player.position) : player.position), age !== null && t("age", { age })]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className={`p-4 sm:p-5 ${SLOT_STYLE[slot].bar}`}>
      <div className="flex items-center gap-4">
        {player.photo ? (
          <Image
            src={player.photo}
            alt=""
            width={64}
            height={64}
            unoptimized
            className={`size-12 shrink-0 rounded-full border-2 bg-raised object-cover sm:size-16 ${SLOT_STYLE[slot].ring}`}
          />
        ) : (
          <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-full border-2 bg-raised font-bold text-muted sm:size-16 ${SLOT_STYLE[slot].ring}`}>
            {initials(player.name)}
          </span>
        )}
        <div className="min-w-0">
          <Link href={entityPath("players", player.id, player.name)} className="block truncate text-h3 font-bold hover:text-accent sm:text-h2">
            {player.name}
          </Link>
          <p className="truncate text-caption text-muted">{sub}</p>
        </div>
      </div>
      <div className="my-3.5 flex gap-2">
        <AutoSubmitForm label={t("season")} apply={t("apply")} className="flex shrink-0 gap-2">
          <select name={`s${slot + 1}`} aria-label={t("season")} defaultValue={player.season} className={select}>
            {player.seasons.map((s) => (
              <option key={s} value={s}>
                {seasonLabel(s)}
              </option>
            ))}
          </select>
          {other?.season !== undefined && <input type="hidden" name={`s${slot === 0 ? 2 : 1}`} value={other.season} />}
        </AutoSubmitForm>
        <div className="min-w-0 flex-1">
          <SearchBox compact compare={{ slot, picks }} />
        </div>
      </div>
      <dl className="grid grid-cols-4 gap-2 border-t border-border pt-3.5">
        {[
          [t("goals"), formatNumber(player.summary.goals, 0, locale)],
          [t("assists"), formatNumber(player.summary.assists, 0, locale)],
          [t("rating"), <RatingBadge key="r" rating={player.summary.rating} />],
          [t("minutes"), formatNumber(player.summary.minutes, 0, locale)],
        ].map(([label, value]) => (
          <div key={String(label)} className="min-w-0">
            <dt className="truncate text-caption font-semibold tracking-[0.04em] text-muted uppercase">{label}</dt>
            <dd className="text-h3 font-bold tabular-nums sm:text-h2">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** An empty slot: just the player search. */
export function EmptySlot({ slot, picks }: SlotProps) {
  const t = useTranslations("Compare");
  return (
    <Card className={`p-4 sm:p-5 ${SLOT_STYLE[slot].bar}`}>
      <p className="mb-3 font-semibold">{t("pick")}</p>
      <SearchBox compact compare={{ slot, picks }} />
    </Card>
  );
}
