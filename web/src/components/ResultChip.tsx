import { useTranslations } from "next-intl";

const STYLE = {
  W: "bg-accent text-ink",
  D: "border border-border bg-raised text-muted",
  L: "bg-error text-ink",
} as const;

/** Win / draw / loss chip (letter in the page's language, full word for screen readers). */
export function ResultChip({ result }: { result: "W" | "D" | "L" }) {
  const t = useTranslations("Club");
  return (
    <span
      title={t("wdlLong", { r: result })}
      className={`inline-grid size-6 place-items-center rounded-sm text-caption font-bold ${STYLE[result]}`}
    >
      <span aria-hidden="true">{t("wdl", { r: result })}</span>
      <span className="sr-only">{t("wdlLong", { r: result })}</span>
    </span>
  );
}
