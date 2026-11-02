import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Mark } from "@/components/Mark";

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  const t = useTranslations("Home");

  return (
    <section className="pt-10 pb-6 text-center sm:pt-16 sm:pb-10">
      <h1 className="flex items-center justify-center gap-3.5 text-display-mobile font-extrabold tracking-[-0.02em] sm:text-display">
        <Mark className="size-8 rounded-button sm:size-12 sm:rounded-[12px]" />
        <span>
          ScoreFoot<span className="text-accent">.gg</span>
        </span>
      </h1>
      <p className="mt-2 text-muted">{t("tagline")}</p>
    </section>
  );
}
