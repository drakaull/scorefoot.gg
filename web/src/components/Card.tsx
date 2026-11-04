import type { ReactNode } from "react";

/** Card from the design system: Surface, 1px Border, 10px radius, optional H3 title bar. */
export function Card({ title, className = "", children }: { title?: string; className?: string; children: ReactNode }) {
  return (
    <section className={`overflow-hidden rounded-card border border-border bg-surface ${className}`}>
      {title && <h2 className="border-b border-border px-4 py-3 text-h3 font-semibold sm:px-5">{title}</h2>}
      {children}
    </section>
  );
}
