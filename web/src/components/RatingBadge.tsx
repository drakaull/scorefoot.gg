import { useLocale } from "next-intl";
import { formatRating, ratingBand, type RatingBand } from "@/lib/player";

// Full class names so Tailwind keeps them.
const BG: Record<RatingBand, string> = {
  bad: "bg-rating-bad",
  poor: "bg-rating-poor",
  ok: "bg-rating-ok",
  good: "bg-rating-good",
  great: "bg-rating-great",
};

export const RATING_TEXT: Record<RatingBand, string> = {
  bad: "text-rating-bad",
  poor: "text-rating-poor",
  ok: "text-rating-ok",
  good: "text-rating-good",
  great: "text-rating-great",
};

/** Rating on its colour band, one decimal; a Muted "–" chip when there is no rating. */
export function RatingBadge({ rating }: { rating: number | null }) {
  const locale = useLocale();
  const band = ratingBand(rating);
  return (
    <span
      className={`inline-block min-w-9 rounded-sm px-1.5 py-0.5 text-center text-caption font-bold tabular-nums ${
        band ? `${BG[band]} text-ink` : "border border-border text-muted"
      }`}
    >
      {formatRating(rating, locale)}
    </span>
  );
}
