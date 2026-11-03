"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { AGES, POSITIONS, type Leaderboard } from "@/lib/leaderboard";
import { seasonLabel } from "@/lib/player";

const select =
  "h-9 rounded-sm border border-border bg-raised px-3 text-body font-semibold text-text focus-visible:outline-2 focus-visible:outline-accent";

/**
 * League, season, position and age as a plain GET form: a change applies at once (with the page fading while it loads);
 * without JavaScript the Apply button submits it.
 */
export function FiltersForm({ board }: { board: Leaderboard }) {
  const t = useTranslations("Leaderboards");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const apply = (form: HTMLFormElement) => {
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(form)) if (typeof value === "string" && value) query.set(key, value);
    startTransition(() => router.push(`${pathname}${query.size ? `?${query}` : ""}`));
  };

  return (
    <form method="get" action={pathname} aria-label={t("filters")} onChange={(e) => apply(e.currentTarget)} className="flex flex-wrap gap-2">
      <select name="league" aria-label={t("league")} defaultValue={board.league ?? ""} className={select}>
        <option value="">{t("allLeagues")}</option>
        {board.leagues.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select name="season" aria-label={t("season")} defaultValue={board.season} className={select}>
        {board.seasons.map((s) => (
          <option key={s} value={s}>
            {seasonLabel(s)}
          </option>
        ))}
      </select>
      <select name="position" aria-label={t("position")} defaultValue={board.position ?? ""} className={select}>
        <option value="">{t("allPositions")}</option>
        {POSITIONS.map((p) => (
          <option key={p} value={p}>
            {t(`Positions.${p}`)}
          </option>
        ))}
      </select>
      <select name="age" aria-label={t("age")} defaultValue={board.age ?? ""} className={select}>
        <option value="">{t("allAges")}</option>
        {AGES.map((a) => (
          <option key={a} value={a}>
            {t(`Ages.${a}`)}
          </option>
        ))}
      </select>
      {board.mode === "per90" && <input type="hidden" name="mode" value="per90" />}
      <noscript>
        <button type="submit" className={`${select} text-accent`}>
          {t("apply")}
        </button>
      </noscript>
      {/* Read by the fade rule in globals.css, like a pending link. */}
      {pending && <span data-link-pending hidden />}
    </form>
  );
}
