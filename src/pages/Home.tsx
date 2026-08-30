import Hero from "@/components/home/Hero";
import Work from "@/components/home/Work";
import Services from "@/components/home/Services";
import Analytics from "@/components/home/Analytics";
import Process from "@/components/home/Process";
import Pricing from "@/components/home/Pricing";
import Faq from "@/components/home/Faq";
import Team from "@/components/home/Team";
import Laws from "@/components/home/Laws";
import Labs from "@/components/home/Labs";
import Marquee from "@/components/home/Marquee";
import SectionGrid from "@/components/home/SectionGrid";

export default function Home() {
  return (
    <>
      <Hero />
      <div className="relative">
        <SectionGrid />
        <Work />
        <Services />
        <Analytics />
        <Process />
        <Pricing />
        <Faq />
        <Team />
        <Laws />
        <Labs />
        <Marquee />
      </div>
    </>
  );
}
