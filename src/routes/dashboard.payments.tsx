import { createFileRoute } from "@tanstack/react-router";
import Payments from "@/components/dashboard/Payments";

export const Route = createFileRoute("/dashboard/payments")({ component: Payments });
