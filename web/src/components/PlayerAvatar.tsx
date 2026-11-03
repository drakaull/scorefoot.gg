import Image from "next/image";
import { initials } from "@/lib/slug";

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
