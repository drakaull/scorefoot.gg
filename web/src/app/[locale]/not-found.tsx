import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <section className="py-16 text-center">
      <p className="text-stat font-bold text-accent">404</p>
      <h1 className="mt-2 text-h1-mobile font-bold sm:text-h1">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("text")}</p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-button bg-gold px-4 font-semibold text-ink hover:brightness-108"
      >
        {t("back")}
      </Link>
    </section>
  );
}
