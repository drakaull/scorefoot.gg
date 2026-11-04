import { useLocale, useTranslations } from "next-intl";

// Same publisher and host as the portfolio, whose page covers ScoreFoot too.
const LEGAL_URL = "https://leonard-fontaine.com";

export function Footer() {
  const t = useTranslations("Footer");
  const locale = useLocale();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-x-6 gap-y-2 px-4 py-6 text-caption text-muted lg:px-6">
        <p>{t("data")}</p>
        {/* A plain link: same tab, no prefetch, no referrer sent. */}
        <a href={`${LEGAL_URL}/${locale}/privacy`} rel="noreferrer" className="hover:text-accent">
          {t("legal")}
        </a>
      </div>
    </footer>
  );
}
