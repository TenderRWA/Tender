import { createFileRoute } from "@tanstack/react-router";
import Work from "@/pages/Work";

export const Route = createFileRoute("/work")({
  component: Work,
  head: () => ({
    meta: [
      { title: "Work | TENDER" },
      { name: "description", content: "Case studies and shipped settlement rails built on TENDER." },
      { property: "og:title", content: "Work | TENDER" },
      { property: "og:description", content: "Case studies and shipped settlement rails built on TENDER." },
    ],
  }),
});
