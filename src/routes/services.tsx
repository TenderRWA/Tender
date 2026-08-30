import { createFileRoute } from "@tanstack/react-router";
import Services from "@/pages/Services";

export const Route = createFileRoute("/services")({
  component: Services,
  head: () => ({
    meta: [
      { title: "Services | TENDER" },
      { name: "description", content: "Settlement, payroll, invoicing and registry services on the TENDER rail." },
      { property: "og:title", content: "Services | TENDER" },
      { property: "og:description", content: "Settlement, payroll, invoicing and registry services on the TENDER rail." },
    ],
  }),
});
