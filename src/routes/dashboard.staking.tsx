import { createFileRoute } from "@tanstack/react-router";
import Staking from "@/components/dashboard/Staking";

export const Route = createFileRoute("/dashboard/staking")({ component: Staking });
