import { useTranslations } from "next-intl";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { AGES, POSITIONS, type Leaderboard } from "@/lib/leaderboard";
import { seasonLabel } from "@/lib/player";

export const select =
  "h-9 rounded-sm border border-border bg-raised px-3 text-body font-semibold text-text focus-visible:outline-2 focus-visible:outline-accent";

/** League, season, position and age; a change applies at once (Apply button without JavaScript). */
export function FiltersForm({ board }: { board: Leaderboard }) {
  const t = useTranslations("Leaderboards");
  return (
    <AutoSubmitForm label={t("filters")} apply={t("apply")} className="flex flex-wrap gap-2">
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
    </AutoSubmitForm>
  );
}
