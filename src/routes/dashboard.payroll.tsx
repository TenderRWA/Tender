import { createFileRoute } from "@tanstack/react-router";
import Payroll from "@/components/dashboard/Payroll";

export const Route = createFileRoute("/dashboard/payroll")({ component: Payroll });
