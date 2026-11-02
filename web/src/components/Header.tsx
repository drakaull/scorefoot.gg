import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitch } from "./LocaleSwitch";
import { Mark } from "./Mark";

export function Header() {
  const t = useTranslations("Header");
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center gap-6 px-4 lg:px-6">
        <Link href="/" aria-label={t("home")} className="flex items-center gap-2 text-lg font-extrabold">
          <Mark />
          ScoreFoot.gg
        </Link>
        <LocaleSwitch />
      </div>
    </header>
  );
}
