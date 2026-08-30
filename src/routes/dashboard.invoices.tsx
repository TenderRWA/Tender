import { createFileRoute } from "@tanstack/react-router";
import Invoices from "@/components/dashboard/Invoices";

export const Route = createFileRoute("/dashboard/invoices")({ component: Invoices });
