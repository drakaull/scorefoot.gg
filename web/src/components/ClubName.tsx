import { Link } from "@/i18n/navigation";
import type { ClubRef } from "@/lib/player";
import { entityPath } from "@/lib/slug";

/**
 * Club name linking to its page; plain text for clubs outside the 5 leagues (no page).
 * No prefetch: tables list dozens of clubs, and prefetching each would render every page on the server.
 */
export function ClubName({ club, className = "" }: { club: Pick<ClubRef, "id" | "name" | "hasPage">; className?: string }) {
  return club.hasPage ? (
    <Link prefetch={false} href={entityPath("clubs", club.id, club.name)} className={`hover:text-accent ${className}`}>
      {club.name}
    </Link>
  ) : (
    <span className={className}>{club.name}</span>
  );
}
