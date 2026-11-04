import Image from "next/image";
import { useTranslations } from "next-intl";
import { chip, PageHeader } from "@/components/PageHeader";
import type { Club } from "@/lib/club";
import { entityPath, initials } from "@/lib/slug";

export function ClubHeader({ club }: { club: Club }) {
  const t = useTranslations("Club");
  const image = club.logo ? (
    <Image src={club.logo} alt="" width={96} height={96} unoptimized priority className="size-16 shrink-0 object-contain sm:size-24" />
  ) : (
    <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center bg-raised text-h2 font-bold text-muted sm:size-24">
      {initials(club.name)}
    </span>
  );

  return (
    <PageHeader
      image={image}
      name={club.name}
      chips={
        <>
          <li className={chip}>
            {club.league.logo && <Image src={club.league.logo} alt="" width={16} height={16} unoptimized className="size-4 object-contain" />}
            {club.league.name}
          </li>
          {club.country && <li className={chip}>{club.country}</li>}
        </>
      }
      path={entityPath("clubs", club.id, club.name)}
      seasons={club.seasons}
      season={club.season}
      seasonsLabel={t("seasons")}
    />
  );
}
