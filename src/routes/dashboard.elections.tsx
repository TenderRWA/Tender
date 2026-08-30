import { createFileRoute } from "@tanstack/react-router";
import Elections from "@/components/dashboard/Elections";

export const Route = createFileRoute("/dashboard/elections")({ component: Elections });
