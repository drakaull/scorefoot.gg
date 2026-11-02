import Image from "next/image";
import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { LinkPending } from "@/components/LinkPending";
import { Link } from "@/i18n/navigation";
import { ageOn, seasonLabel, type Player } from "@/lib/player";
import { entityPath, initials } from "@/lib/slug";

const chip = "flex items-center gap-1.5 rounded-sm border border-border bg-raised px-2.5 py-0.5 text-caption font-semibold text-muted";

export function PlayerHeader({ player }: { player: Player }) {
  const t = useTranslations("Player");
  const tPos = useTranslations("Position");
  const age = ageOn(player.birthDate, new Date());
  const path = entityPath("players", player.id, player.name);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:gap-6 sm:p-6">
        {player.photo ? (
          <Image
            src={player.photo}
            alt=""
            width={96}
            height={96}
            unoptimized
            priority
            className="size-16 shrink-0 rounded-full border border-border bg-raised object-cover sm:size-24"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-full border border-border bg-raised text-h2 font-bold text-muted sm:size-24"
          >
            {initials(player.name)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-h1-mobile leading-tight font-bold sm:text-h1">{player.name}</h1>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {player.clubs.map((club) => (
              <li key={club.id} className={chip}>
                {club.logo && <Image src={club.logo} alt="" width={16} height={16} unoptimized className="size-4 object-contain" />}
                <Link href={entityPath("clubs", club.id, club.name)} className="text-text hover:text-accent">
                  {club.name}
                </Link>
              </li>
            ))}
            {player.position && <li className={chip}>{tPos.has(player.position) ? tPos(player.position) : player.position}</li>}
            {player.nationality && <li className={chip}>{player.nationality}</li>}
            {age !== null && <li className={chip}>{t("age", { age })}</li>}
            {player.heightCm && <li className={chip}>{t("height", { cm: player.heightCm })}</li>}
          </ul>
        </div>
      </div>
      <nav aria-label={t("seasons")} className="flex gap-6 overflow-x-auto border-t border-border px-4 sm:px-6">
        {player.seasons.map((season) => (
          <Link
            key={season}
            href={{ pathname: path, query: { season } }}
            aria-current={season === player.season ? "page" : undefined}
            className={`py-3 text-body font-semibold whitespace-nowrap tabular-nums ${
              season === player.season
                ? "text-text shadow-[inset_0_-2px_0_var(--color-accent)]"
                : "text-muted hover:text-accent has-[[data-link-pending]]:text-text has-[[data-link-pending]]:shadow-[inset_0_-2px_0_var(--color-accent)]"
            }`}
          >
            {seasonLabel(season)}
            <LinkPending />
          </Link>
        ))}
      </nav>
    </Card>
  );
}
