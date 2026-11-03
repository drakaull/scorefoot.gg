"use client";

import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";

/** Header link, underlined in Accent on its section's pages. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-full items-center font-semibold ${active ? "text-text shadow-[inset_0_-2px_0_var(--color-accent)]" : "text-muted hover:text-accent"}`}
    >
      {children}
    </Link>
  );
}
