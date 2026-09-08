import { FlaskConical } from "lucide-react";

/**
 * Marks a surface whose numbers are placeholders rather than rail data.
 *
 * Five reads have no `/api/v2` route yet (see for-nzube.md). The screens that
 * depend on them stay up so their shape can be reviewed, which is only
 * defensible if nobody can mistake the rows for on-chain records — so this
 * badge is not optional decoration: every demo-backed surface carries one.
 */
export default function DemoBadge({
  reason,
  className = "",
}: {
  reason?: string;
  className?: string;
}) {
  return (
    <span
      title={reason ?? "Placeholder data — this rail has no endpoint for it yet."}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-warning ${className}`}
    >
      <FlaskConical className="h-3 w-3" aria-hidden />
      Demo data
    </span>
  );
}

/** Full-width variant for the top of a panel whose whole body is placeholder. */
export function DemoNotice({ reason, what }: { reason?: string; what: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3">
      <DemoBadge reason={reason} />
      <p className="min-w-0 flex-1 font-body text-xs leading-relaxed text-secondary2">
        {what} is not served by Robinhood Chain yet. These rows are placeholders so the layout
        stays reviewable — nothing here is an on-chain record.
      </p>
    </div>
  );
}
