import { createFileRoute } from "@tanstack/react-router";
import Whitepaper from "@/pages/Whitepaper";

const DESCRIPTION =
  "The TENDER whitepaper: design laws, architecture, settlement lifecycle, fee model, and the T1-T4 roadmap for the receive-side RWA settlement rail on Solana.";

export const Route = createFileRoute("/whitepaper")({
  component: Whitepaper,
  head: () => ({
    meta: [
      { title: "Whitepaper & Roadmap | TENDER" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Whitepaper & Roadmap | TENDER" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
});
