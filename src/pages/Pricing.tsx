import PageHero from "@/components/pricing/PageHero";
import PlanRows from "@/components/pricing/PlanRows";
import FeeFlow from "@/components/pricing/FeeFlow";
import PricingFaq from "@/components/pricing/PricingFaq";
import CtaStrip from "@/components/pricing/CtaStrip";

export default function Pricing() {
  return (
    <>
      <PageHero
        index="005"
        label="PRICING"
        line1="Fees that behave like the rail."
        line2="Free where nothing converts."
        sub="No subscriptions, no custody, no rent. Fees exist only where value is added - and same-asset payments are free, forever."
      />
      <PlanRows />
      <FeeFlow />
      <PricingFaq />
      <CtaStrip
        heading="Set your election once."
        disclaimer="TENDER is settlement infrastructure - not payroll, tax, or investment software."
      />
    </>
  );
}
