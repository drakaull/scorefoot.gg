"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";

// Shown when the api cannot be reached; retry fetches the page again.
export default function PlayerError({ retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("Player");
  return (
    <div className="py-6">
      <Card className="p-6 text-center">
        <p className="text-error">{t("error")}</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-4 h-10 rounded-button border border-border bg-raised px-4 font-semibold hover:border-accent"
        >
          {t("retry")}
        </button>
      </Card>
    </div>
  );
}
