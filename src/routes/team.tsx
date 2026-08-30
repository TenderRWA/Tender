import { createFileRoute } from "@tanstack/react-router";
import Team from "@/pages/Team";

export const Route = createFileRoute("/team")({
  component: Team,
  head: () => ({
    meta: [
      { title: "The Team | TENDER" },
      { name: "description", content: "Senders, receivers, stakers and the DAO that run the TENDER network." },
      { property: "og:title", content: "The Team | TENDER" },
      { property: "og:description", content: "Senders, receivers, stakers and the DAO that run the TENDER network." },
    ],
  }),
});
