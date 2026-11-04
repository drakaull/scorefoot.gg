import { Card } from "@/components/Card";

const DELTA_COLOUR = { 1: "text-accent", 0: "text-muted", [-1]: "text-error" } as const;

export type StatCardData = {
  label: string;
  value: string;
  /** Text colour class of the value (rating band, gold for a title). */
  colour?: string;
  /** Change vs the previous season, already worded ("+2 vs 24-25"). */
  change?: { text: string; sign: -1 | 0 | 1 } | null;
  /** Muted line under the change line. */
  sub?: string;
};

/** The 4 big numbers under a page header: 2 × 2 on mobile, 4 across from 640px. */
export function StatCardGrid({ cards }: { cards: StatCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-caption font-semibold tracking-[0.04em] text-muted uppercase">{card.label}</p>
          <p className={`text-h1-mobile leading-tight font-bold whitespace-nowrap tabular-nums sm:text-stat ${card.colour ?? ""}`}>{card.value}</p>
          {card.change && <p className={`text-caption ${DELTA_COLOUR[card.change.sign]}`}>{card.change.text}</p>}
          {card.sub && <p className="text-caption text-muted">{card.sub}</p>}
        </Card>
      ))}
    </div>
  );
}
