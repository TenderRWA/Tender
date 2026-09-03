import type { ReactNode } from "react";

interface DashTableProps {
  caption?: string;
  columns?: string[];
  headers?: string[];
  children: ReactNode;
  minWidth?: string;
  count?: number;
}

/** Card-wrapped table with mono caption; scrolls horizontally on small screens. */
export default function DashTable({
  caption,
  columns,
  headers,
  children,
  minWidth = "min-w-[640px]",
}: DashTableProps) {
  const cols = columns ?? headers ?? [];

  return (
    <div className="glass glass-interactive rounded-2xl min-w-0 overflow-hidden">
      {caption && (
        <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 border-b border-hairline/60">
          <span className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
            {caption}
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={`w-full ${minWidth} text-left border-collapse`}>
          <thead>
            <tr className="border-b border-hairline/60">
              {cols.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="px-5 md:px-6 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-muted2 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function DashRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-hairline/60 last:border-b-0 hover:bg-raised/50 transition-colors">{children}</tr>;
}

export function DashCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <td className={`px-5 md:px-6 py-3.5 font-body text-sm text-secondary2 whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
}

type PillTone = "success" | "warning" | "red" | "muted";

const PILL_STYLES: Record<PillTone, string> = {
  success: "text-success border-success/40",
  warning: "text-warning border-warning/40",
  red: "text-red border-red/40",
  muted: "text-muted2 border-hairline",
};

const DOT_STYLES: Record<PillTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  red: "bg-red",
  muted: "bg-muted2",
};

export function StatusPill(props: {
  tone?: PillTone;
  label?: string;
  status?: string;
}) {
  let tone: PillTone = props.tone ?? "muted";
  let label: string = props.label ?? "";

  if (props.status) {
    const s = props.status.toLowerCase();
    if (s === "completed" || s === "paid" || s === "settled") {
      tone = "success";
      label = props.label || "SETTLED";
    } else if (s === "pending" || s === "open") {
      tone = "warning";
      label = props.label || "PENDING";
    } else if (s === "expired" || s === "cancelled" || s === "failed") {
      tone = "muted";
      label = props.label || s.toUpperCase();
    } else {
      label = props.label || props.status.toUpperCase();
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-2 border rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] whitespace-nowrap shrink-0 ${PILL_STYLES[tone]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_STYLES[tone]}`} aria-hidden />
      {label}
    </span>
  );
}

export const RECEIPT_TONE: Record<string, PillTone> = {
  optimal: "success",
  stable: "warning",
  issue: "red",
  open: "success",
  paid: "muted",
  expired: "red",
  eligible: "success",
  suspended: "warning",
};
