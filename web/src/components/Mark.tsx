/** Brand mark: accent rounded square with a dark dot, as in the approved mockup. */
export function Mark({ className = "size-[22px] rounded-sm" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative inline-block shrink-0 bg-accent ${className}`}>
      <span className="absolute inset-[27%] rounded-full bg-bg" />
    </span>
  );
}
