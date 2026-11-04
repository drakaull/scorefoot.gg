import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitch } from "./LocaleSwitch";
import { Mark } from "./Mark";
import { NavLink } from "./NavLink";

export function Header() {
  const t = useTranslations("Header");
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center gap-4 px-4 sm:gap-6 lg:px-6">
        <Link href="/" aria-label={t("home")} className="flex items-center gap-2 text-lg font-extrabold">
          <Mark />
          {/* Under 640px the mark alone leaves room for the two links and the language switch. */}
          <span className="max-sm:sr-only">ScoreFoot.gg</span>
        </Link>
        <nav className="flex h-full gap-4 sm:gap-6">
          <NavLink href="/leaderboards">{t("leaderboards")}</NavLink>
          <NavLink href="/compare">{t("compare")}</NavLink>
        </nav>
        <LocaleSwitch />
      </div>
    </header>
  );
}
