import { createFileRoute } from "@tanstack/react-router";
import Whitepaper from "@/pages/Whitepaper";

const DESCRIPTION =
  "The TENDER whitepaper: the design laws, architecture, settlement lifecycle, risk controls and fee model behind the receive-side RWA settlement rail on Solana.";

export const Route = createFileRoute("/whitepaper")({
  component: Whitepaper,
  head: () => ({
    meta: [
      { title: "Whitepaper | TENDER" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Whitepaper | TENDER" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
});
