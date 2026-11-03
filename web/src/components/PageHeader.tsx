import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import { LinkPending } from "@/components/LinkPending";
import { Link } from "@/i18n/navigation";
import { seasonLabel } from "@/lib/player";

export const chip = "flex items-center gap-1.5 rounded-sm border border-border bg-raised px-2.5 py-0.5 text-caption font-semibold text-muted";

type Props = {
  image: ReactNode;
  name: string;
  chips: ReactNode;
  /** Page path without locale, e.g. "/players/278-kylian-mbappe". */
  path: string;
  seasons: number[];
  season: number;
  seasonsLabel: string;
};

/** Header card of player and club pages: picture, name, chips, then season tabs (links, with instant feedback). */
export function PageHeader({ image, name, chips, path, seasons, season: current, seasonsLabel }: Props) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:gap-6 sm:p-6">
        {image}
        <div className="min-w-0">
          <h1 className="text-h1-mobile leading-tight font-bold sm:text-h1">{name}</h1>
          <ul className="mt-2.5 flex flex-wrap gap-2">{chips}</ul>
        </div>
      </div>
      <nav aria-label={seasonsLabel} className="flex gap-6 overflow-x-auto border-t border-border px-4 sm:px-6">
        {seasons.map((season) => (
          <Link
            key={season}
            href={{ pathname: path, query: { season } }}
            aria-current={season === current ? "page" : undefined}
            className={`py-3 text-body font-semibold whitespace-nowrap tabular-nums ${
              season === current
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
