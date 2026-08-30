import { createFileRoute } from "@tanstack/react-router";
import Universe from "@/components/dashboard/Universe";

export const Route = createFileRoute("/dashboard/universe")({ component: Universe });
