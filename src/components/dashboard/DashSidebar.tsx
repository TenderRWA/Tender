import { NavLink } from "@/lib/router-compat";

export const DASH_MODULES = [
  { index: "01", label: "Overview", to: "/dashboard", end: true },
  { index: "02", label: "Payments", to: "/dashboard/payments", end: false },
  { index: "03", label: "Elections", to: "/dashboard/elections", end: false },
  { index: "04", label: "Invoices", to: "/dashboard/invoices", end: false },
  { index: "05", label: "Payroll", to: "/dashboard/payroll", end: false },
  { index: "06", label: "Universe", to: "/dashboard/universe", end: false },
  { index: "07", label: "Staking", to: "/dashboard/staking", end: false },
  { index: "08", label: "Claim", to: "/dashboard/claim", end: false },
];

/**
 * Internal dashboard nav. Desktop: left sidebar with mono indices that sits in
 * normal document flow and scrolls with the page; active item gets a red left
 * border + red label. Mobile: horizontal scrollable tab bar.
 */
export default function DashSidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      {/* Desktop sidebar: part of normal document flow, scrolls with the page */}
      <nav aria-label="Dashboard modules" className="hidden lg:block w-60 shrink-0 self-start sticky top-24 max-h-[calc(100svh-7rem)] overflow-y-auto">
        <div className="glass rounded-2xl overflow-hidden">
          <p className="px-5 pt-5 pb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2 border-b border-hairline/60">
            MODULES 01-08
          </p>
          <ul className="p-2">
            {DASH_MODULES.map((m) => (
              <li key={m.to}>
                <NavLink
                  to={m.to}
                  end={m.end}
                  className={({ isActive }) =>
                    `group relative flex items-baseline gap-3 rounded-xl border-l-2 px-4 py-3 transition-all duration-200 ${
                      isActive
                        ? "glass-soft border-red text-red shadow-xs"
                        : "border-transparent text-secondary2 hover:text-foreground hover:bg-raised/60 hover:translate-x-0.5 hover:border-red/30"
                    }`
                  }
                >
                  <span className="font-mono text-[10px] tracking-[0.12em] text-muted2">{m.index}</span>
                  <span className="font-body font-medium text-sm">{m.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <p className="px-5 py-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2 border-t border-hairline/60">
            SOLANA · MAINNET-BETA
          </p>
        </div>
      </nav>

      {/* Mobile tab bar */}
      <nav
        aria-label="Dashboard modules"
        className="lg:hidden w-full max-w-full min-w-0 self-stretch overflow-x-auto glass rounded-2xl p-1.5"
      >
        <ul className="flex gap-1 min-w-max">
          {DASH_MODULES.map((m) => (
            <li key={m.to}>
              <NavLink
                to={m.to}
                end={m.end}
                className={({ isActive }) =>
                  `flex items-baseline gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 transition-colors duration-150 ${
                    isActive
                      ? "glass-soft text-red"
                      : "text-secondary2 hover:text-foreground"
                  }`
                }
              >
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted2">{m.index}</span>
                <span className="font-body font-medium text-sm">{m.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
