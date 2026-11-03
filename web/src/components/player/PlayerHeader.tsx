import Image from "next/image";
import { useTranslations } from "next-intl";
import { ClubName } from "@/components/ClubName";
import { chip, PageHeader } from "@/components/PageHeader";
import { ageOn, type Player } from "@/lib/player";
import { entityPath, initials } from "@/lib/slug";

export function PlayerHeader({ player }: { player: Player }) {
  const t = useTranslations("Player");
  const tPos = useTranslations("Position");
  const age = ageOn(player.birthDate, new Date());

  const image = player.photo ? (
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
  );

  const chips = (
    <>
      {player.clubs.map((club) => (
        <li key={club.id} className={chip}>
          {club.logo && <Image src={club.logo} alt="" width={16} height={16} unoptimized className="size-4 object-contain" />}
          <ClubName club={club} className="text-text" />
        </li>
      ))}
      {player.position && <li className={chip}>{tPos.has(player.position) ? tPos(player.position) : player.position}</li>}
      {player.nationality && <li className={chip}>{player.nationality}</li>}
      {age !== null && <li className={chip}>{t("age", { age })}</li>}
      {player.heightCm && <li className={chip}>{t("height", { cm: player.heightCm })}</li>}
    </>
  );

  return (
    <PageHeader
      image={image}
      name={player.name}
      chips={chips}
      path={entityPath("players", player.id, player.name)}
      seasons={player.seasons}
      season={player.season}
      seasonsLabel={t("seasons")}
    />
  );
}
