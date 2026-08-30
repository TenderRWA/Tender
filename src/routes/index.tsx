import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "TENDER: Get paid in the assets you'd rather hold" },
      { name: "description", content: "TENDER is the receive-side RWA settlement rail on Solana. Elect the assets you receive, settle instantly, and hold what you want." },
      { property: "og:title", content: "TENDER: Get paid in the assets you'd rather hold" },
      { property: "og:description", content: "The receive-side RWA settlement rail on Solana." },
    ],
  }),
});
