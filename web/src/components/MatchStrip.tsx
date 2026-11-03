import type { ReactNode } from "react";
import { Card } from "@/components/Card";

export type StripMatch = { key: number; badge: ReactNode; label: string; lines: string[]; title: string };

/** Last 5 matches as small tiles, most recent on the left. */
export function MatchStrip({ title, empty, matches }: { title: string; empty: string; matches: StripMatch[] }) {
  return (
    <Card title={title}>
      {matches.length === 0 ? (
        <p className="p-4 text-muted sm:p-5">{empty}</p>
      ) : (
        <ol className="flex gap-1.5 p-3 sm:gap-2 sm:p-4">
          {matches.map((m) => (
            <li key={m.key} title={m.title} className="min-w-0 flex-1 rounded-sm bg-raised px-0.5 py-2.5 text-center">
              {m.badge}
              <p className="mt-1.5 truncate text-caption font-semibold">{m.label}</p>
              {m.lines.map((line, i) => (
                <p key={i} className="text-caption text-muted tabular-nums">
                  {line}
                </p>
              ))}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
