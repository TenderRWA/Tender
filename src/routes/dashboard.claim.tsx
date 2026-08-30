import { createFileRoute } from "@tanstack/react-router";
import ModulePage from "@/components/dashboard/ModulePage";
import ClaimForm from "@/components/contact/ClaimForm";

export const Route = createFileRoute("/dashboard/claim")({ component: ClaimModule });

function ClaimModule() {
  return (
    <ModulePage
      index="08"
      label="CLAIM"
      title="Claim your handle."
      blurb="Reserve a name in the election registry and pin your receive mix before mainnet-beta opens."
    >
      <ClaimForm embedded />
    </ModulePage>
  );
}
