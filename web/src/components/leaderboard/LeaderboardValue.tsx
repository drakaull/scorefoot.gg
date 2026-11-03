import { useLocale } from "next-intl";
import { RatingBadge } from "@/components/RatingBadge";
import type { Leaderboard } from "@/lib/leaderboard";
import { formatNumber } from "@/lib/player";

/** The ranked number: a rating badge, a per-90 value (2 decimals) or a count. */
export function LeaderboardValue({ board, value }: { board: Pick<Leaderboard, "stat" | "mode">; value: number }) {
  const locale = useLocale();
  if (board.stat === "rating") return <RatingBadge rating={value} />;
  return <>{formatNumber(value, board.mode === "per90" ? 2 : 0, locale)}</>;
}
