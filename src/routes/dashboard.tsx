import { createFileRoute, Outlet } from "@tanstack/react-router";
import DashSidebar from "@/components/dashboard/DashSidebar";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  head: () => ({
    meta: [
      { title: "Terminal | TENDER" },
      {
        name: "description",
        content:
          "The TENDER terminal: payments, elections, invoices, payroll, universe and staking.",
      },
      { property: "og:title", content: "Terminal | TENDER" },
      { property: "og:description", content: "Live settlement modules on the TENDER rail." },
    ],
  }),
});

function DashboardLayout() {
  return (
    <div className="dash-aurora">
      <div className="mx-auto max-w-container px-5 md:px-10 pb-10 md:pb-16">
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
