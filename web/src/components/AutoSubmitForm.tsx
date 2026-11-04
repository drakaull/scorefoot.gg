"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

/**
 * A plain GET form whose fields apply at once: a change navigates to the same page with the form's values
 * (empty ones left out), the page fading meanwhile. Without JavaScript the Apply button submits it.
 */
export function AutoSubmitForm({ label, apply, className = "", children }: { label: string; apply: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const submit = (form: HTMLFormElement) => {
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(form)) if (typeof value === "string" && value) query.set(key, value);
    startTransition(() => router.push(`${pathname}${query.size ? `?${query}` : ""}`));
  };

  return (
    <form method="get" action={pathname} aria-label={label} onChange={(e) => submit(e.currentTarget)} className={className}>
      {children}
      <noscript>
        <button type="submit" className="h-9 rounded-sm border border-border bg-raised px-3 font-semibold text-accent">
          {apply}
        </button>
      </noscript>
      {/* Read by the fade rule in globals.css, like a pending link. */}
      {pending && <span data-link-pending hidden />}
    </form>
  );
}
