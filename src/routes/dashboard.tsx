import { createFileRoute, Outlet } from "@tanstack/react-router";
import DashSidebar from "@/components/dashboard/DashSidebar";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  head: () => ({
    meta: [
      { title: "Terminal | TENDER" },
      {
        name: "description",
        content: "The TENDER terminal: payments, elections, invoices, payroll, universe and staking.",
      },
      { property: "og:title", content: "Terminal | TENDER" },
      { property: "og:description", content: "Live settlement modules on the TENDER rail." },
    ],
  }),
});

function DashboardLayout() {
  return (
    <div className="dash-aurora">
      <div className="mx-auto max-w-container px-5 md:px-10 py-10 md:py-16">
        <div className="glass rounded-2xl px-4 py-4 sm:px-6 sm:py-5 mb-6 md:mb-10 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6">
          <span className="flex min-w-0 items-center gap-2.5 font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
            <span className="truncate">TENDER TERMINAL</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2 truncate">
            @mira.sol · SOLANA MAINNET-BETA
          </span>
          <span className="sm:ml-auto justify-self-start inline-flex items-center gap-2 glass-soft rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden />
            ALL SYSTEMS OPTIMAL
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
          <DashSidebar />
          <div className="flex-1 min-w-0 w-full">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
