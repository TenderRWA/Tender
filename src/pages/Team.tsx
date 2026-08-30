import PageHero from "@/components/pricing/PageHero";
import CtaStrip from "@/components/pricing/CtaStrip";
import RoleCards from "@/components/team/RoleCards";
import RoleMatrix from "@/components/team/RoleMatrix";
import InvariantBand from "@/components/team/InvariantBand";

export default function Team() {
  return (
    <>
      <PageHero
        index="007"
        label="THE TEAM"
        line1="A role for everyone."
        line2="Pick your side of the transaction."
        sub="TENDER isn't a company you join - it's a rail you use. Four roles touch every payment; each one gets exactly what it came for."
      />
      <RoleCards />
      <RoleMatrix />
      <InvariantBand />
      <CtaStrip heading="Everyone gets what they came for." />
    </>
  );
}
