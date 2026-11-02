import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Footer");
  return (
    <footer className="border-t border-border">
      <p className="mx-auto max-w-[1200px] px-4 py-6 text-caption text-muted lg:px-6">{t("data")}</p>
    </footer>
  );
}
