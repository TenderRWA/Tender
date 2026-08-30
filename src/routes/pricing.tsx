import { createFileRoute } from "@tanstack/react-router";
import Pricing from "@/pages/Pricing";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
  head: () => ({
    meta: [
      { title: "Pricing | TENDER" },
      { name: "description", content: "Transparent fee flow and plans for teams settling on TENDER." },
      { property: "og:title", content: "Pricing | TENDER" },
      { property: "og:description", content: "Transparent fee flow and plans for teams settling on TENDER." },
    ],
  }),
});
