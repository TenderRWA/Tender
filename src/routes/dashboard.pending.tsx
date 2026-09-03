import { createFileRoute } from "@tanstack/react-router";
import Pending from "@/components/dashboard/Pending";

export const Route = createFileRoute("/dashboard/pending")({ component: Pending });
