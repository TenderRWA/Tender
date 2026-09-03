import { NavLink } from "@/lib/router-compat";
import { useWallet } from "@/lib/wallet/wallet-context";
import { useXAccount } from "@/hooks/useTender";

/**
 * `Claim` is the odd one out: the others operate on a handle you already own,
 * it is how you get one. A rule separates it rather than a second heading.
 */
export const DASH_MODULES: {
  label: string;
  to: string;
  end: boolean;
  standalone?: boolean;
}[] = [
  { label: "Overview", to: "/dashboard", end: true },
  { label: "Payments", to: "/dashboard/payments", end: false },
  { label: "Elections", to: "/dashboard/elections", end: false },
  { label: "Invoices", to: "/dashboard/invoices", end: false },
  { label: "Universe", to: "/dashboard/universe", end: false },
  { label: "Claim", to: "/dashboard/claim", end: false, standalone: true },
];

const ACTIVE_RULE =
  "before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[2px] " +
  "before:-translate-y-1/2 before:rounded-full before:bg-red before:content-['']";

const itemCls = ({ isActive }: { isActive: boolean }) =>
  `relative flex items-center rounded-lg px-3.5 py-2.5 font-body text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-red/40 ${
    isActive
      ? `bg-red/8 font-semibold text-red ${ACTIVE_RULE}`
      : "font-medium text-secondary2 hover:bg-ink/4 hover:text-foreground"
  }`;

/**
 * Terminal nav. Desktop: a compact list in normal document flow that sticks
 * under the navbar. Mobile: a horizontal tab strip.
 */
export default function DashSidebar() {
  const { address } = useWallet();
  const { data: xData } = useXAccount(address);

  return (
    <>
      <nav
        aria-label="Dashboard modules"
        className="sticky top-24 hidden max-h-[calc(100svh-7rem)] w-52 shrink-0 self-start overflow-y-auto lg:block"
      >
        <ul className="glass flex flex-col gap-0.5 rounded-2xl p-2">
          {DASH_MODULES.map((m) => (
            <li key={m.to} className={m.standalone ? "mt-1 border-t border-hairline/70 pt-1" : ""}>
              <NavLink to={m.to} end={m.end} className={itemCls}>
                {m.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {xData?.account && (
          <div className="mt-3 p-3 rounded-2xl glass glass-soft border border-hairline/80 flex items-center gap-2.5 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-base border border-hairline flex items-center justify-center font-black text-xs text-foreground shrink-0 shadow-2xs">
              𝕏
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono font-semibold text-foreground truncate">
                @{xData.account.xUsername}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-success flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Verified Identity
              </div>
            </div>
          </div>
        )}
      </nav>

      <nav
        aria-label="Dashboard modules"
        className="glass w-full min-w-0 max-w-full self-stretch overflow-x-auto rounded-2xl p-1.5 lg:hidden"
      >
        <ul className="flex min-w-max gap-1">
          {DASH_MODULES.map((m) => (
            <li key={m.to}>
              <NavLink
                to={m.to}
                end={m.end}
                className={({ isActive }: { isActive: boolean }) =>
                  `block whitespace-nowrap rounded-lg px-3.5 py-2.5 font-body text-sm transition-colors duration-150 ${
                    isActive
                      ? "bg-red/8 font-semibold text-red"
                      : "font-medium text-secondary2 hover:text-foreground"
                  }`
                }
              >
                {m.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {xData?.account && (
        <div className="lg:hidden w-full glass rounded-xl px-3 py-2 flex items-center justify-between border border-hairline/80">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-base border border-hairline flex items-center justify-center font-black text-[10px] text-foreground shrink-0 shadow-2xs">
              𝕏
            </div>
            <span className="text-xs font-mono font-semibold text-foreground truncate">
              @{xData.account.xUsername}
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-success flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Verified
          </span>
        </div>
      )}
    </>
  );
}
