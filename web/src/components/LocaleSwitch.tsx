"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** "EN · FR": keeps the current page, only the language changes. */
export function LocaleSwitch() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("language")} className="ml-auto flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-[13px] font-semibold">
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true" className="text-muted">·</span>}
          <Link
            href={pathname}
            locale={l}
            aria-current={l === locale ? "true" : undefined}
            className={`uppercase transition-colors ${l === locale ? "text-text" : "text-muted hover:text-accent"}`}
          >
            {l}
          </Link>
        </span>
      ))}
    </nav>
  );
}
