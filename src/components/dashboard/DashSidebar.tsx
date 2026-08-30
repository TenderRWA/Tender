import { NavLink } from "@/lib/router-compat";

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
    </>
  );
}
