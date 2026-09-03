import { createFileRoute } from "@tanstack/react-router";
import Roadmap from "@/pages/Roadmap";

const DESCRIPTION =
  "The TENDER roadmap: four phases from live atomic settlement (T1) through splits and invoices, payroll vaults and token genesis, to cross-chain pay-in routes.";

export const Route = createFileRoute("/roadmap")({
  component: Roadmap,
  head: () => ({
    meta: [
      { title: "Roadmap | TENDER" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Roadmap | TENDER" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
});
