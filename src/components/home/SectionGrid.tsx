/**
 * Site rule-grid backdrop — the same 8-column black hairline grid used in the
 * hero, stretched behind every section below it on the landing page so the
 * whole page reads as one continuous white field with black rules.
 */
const INNER_RULES = ["12.5%", "25%", "37.5%", "50%", "62.5%", "75%", "87.5%"] as const;

export default function SectionGrid() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 max-md:opacity-60">
      {/* Outer rules */}
      <span className="absolute inset-y-0 left-0 w-px bg-black/20" />
      <span className="absolute inset-y-0 right-0 w-px bg-black/20" />
      {/* Inner rules */}
      {INNER_RULES.map((x) => (
        <span key={x} className="absolute inset-y-0 w-px bg-black/12" style={{ left: x }} />
      ))}
    </div>
  );
}
