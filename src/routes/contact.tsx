import { createFileRoute } from "@tanstack/react-router";
import Contact from "@/pages/Contact";

export const Route = createFileRoute("/contact")({
  component: Contact,
  head: () => ({
    meta: [
      { title: "Contact | TENDER" },
      { name: "description", content: "Reach the TENDER team and read the settlement terms." },
      { property: "og:title", content: "Contact | TENDER" },
      { property: "og:description", content: "Reach the TENDER team and read the settlement terms." },
    ],
  }),
});
