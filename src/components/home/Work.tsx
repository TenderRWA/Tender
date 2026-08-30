import { useNavigate } from "@/lib/router-compat";
import SectionMarker from "@/components/SectionMarker";
import { useSectionReveal } from "@/hooks/useSectionReveal";

const ROW_TWO = [
  {
    name: "Election Registry",
    img: "/work-registry.png",
  },
  {
    name: "Invoice Book",
    img: "/work-invoice.png",
  },
  {
    name: "Payroll Vault",
    img: "/work-payroll.png",
  },
];

/** 40x40 square arrow button (card corner). Arrow rotates 45deg on group hover. */
function SquareArrow({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`w-10 h-10 rounded flex items-center justify-center ${
        light ? "bg-white" : "bg-red"
      }`}
    >
      <span
        className={`text-lg leading-none transition-transform duration-300 group-hover:rotate-45 inline-block ${
          light ? "text-red" : "text-white"
        }`}
      >
        ↗
      </span>
    </span>
  );
}

export default function Work() {
  const ref = useSectionReveal<HTMLElement>();
  const navigate = useNavigate();

  return (
    <section id="work" ref={ref} className="relative">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <SectionMarker index="001" label="WORK" />

        {/* Row 1 - featured split: large media card (~65%) + red PRODUCT LINEUP panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <button
            data-reveal
            onClick={() => navigate("/work")}
            className="lg:col-span-8 group relative text-left rounded overflow-hidden bg-ink"
          >
            <img
              src="/work-settlement.png"
              alt="Settlement Engine - abstract on-chain routing grid"
              className="absolute inset-0 w-full h-full object-cover transition-transform [transition-duration:600ms] group-hover:scale-105"
            />
            <span className="relative z-10 flex flex-col p-6 md:p-8 min-h-[320px] lg:min-h-[460px]">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-white/70">
                FEATURED PRODUCT
              </span>
              <span className="mt-2 font-display font-medium text-[28px] md:text-[32px] leading-[1.1] tracking-[-0.02em] text-white">
                Settlement Engine
              </span>
              <span className="mt-auto font-mono text-xs uppercase tracking-[0.12em] text-white/70">
                tender_router · Atomic · Jupiter-routed
              </span>
            </span>
          </button>

          <div
            data-reveal
            className="lg:col-span-4 relative bg-red rounded p-6 md:p-8 flex flex-col min-h-[320px] lg:min-h-[460px] overflow-hidden"
          >
            <div className="absolute inset-0 dot-matrix" aria-hidden />
            <div className="relative flex items-start justify-between gap-4">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-white/80">
                PRODUCT LINEUP
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-white/80">
                8/8
              </span>
            </div>
            <div className="relative mt-8">
              <h3 className="font-display font-medium text-[28px] md:text-[32px] leading-[1.1] tracking-[-0.02em] text-white">
                One transaction. Your exact portfolio.
              </h3>
              <p className="mt-5 font-body text-[15px] leading-relaxed text-white/85">
                The sender pays in whatever they hold. The settlement engine swaps at receipt
                through Jupiter - slippage-capped, price-sane, authenticity-gated. Non-custodial.
                Atomic. Done.
              </p>
            </div>
            <button
              onClick={() => navigate("/work")}
              aria-label="See the full product lineup"
              className="group relative mt-auto self-start"
            >
              <SquareArrow light />
            </button>
          </div>
        </div>

        {/* Row 2 - three media cards, red square arrow bottom-left */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {ROW_TWO.map((p) => (
            <button
              key={p.name}
              data-reveal
              onClick={() => navigate("/work")}
              className="group relative text-left rounded overflow-hidden bg-ink"
            >
              <img
                src={p.img}
                alt={p.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform [transition-duration:600ms] group-hover:scale-105"
              />
              <span className="relative z-10 flex flex-col p-6 min-h-[260px] lg:min-h-[300px]">
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-white/70">
                  {p.name}
                </span>
                <span className="mt-auto">
                  <SquareArrow />
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Row 3 - media card with name label + dark status card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <button
            data-reveal
            onClick={() => navigate("/work")}
            className="group relative text-left rounded overflow-hidden bg-ink"
          >
            <img
              src="/work-universe.png"
              alt="Universe Gate - eligible asset registry"
              className="absolute inset-0 w-full h-full object-cover transition-transform [transition-duration:600ms] group-hover:scale-105"
            />
            <span className="relative z-10 flex flex-col p-6 min-h-[260px] lg:min-h-[320px]">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-white/70">
                Universe Gate
              </span>
              <span className="mt-auto font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-white">
                xStocks, Ondo and verified RWAs only.
              </span>
            </span>
          </button>

          <div
            data-reveal
            className="relative bg-ink rounded p-6 md:p-8 flex flex-col min-h-[260px] lg:min-h-[320px]"
          >
            <span className="self-end text-right font-mono text-xs uppercase tracking-[0.12em] text-red">
              EARLY BETA ACCESS NOW AVAILABLE.
            </span>
            <div className="mt-8">
              <span className="inline-block font-mono text-xs uppercase tracking-[0.12em] text-white/70 border border-white/20 rounded-full px-4 py-1.5">
                DEVELOPMENT PROGRESS
              </span>
              <div className="mt-6 font-mono font-medium text-[64px] md:text-[88px] leading-none tracking-[-0.03em] text-white">
                42.3%
              </div>
            </div>
            <div className="mt-auto pt-8 flex items-center justify-between gap-4">
              <button
                onClick={() => navigate("/dashboard/claim")}
                className="group/beta font-body font-semibold text-sm uppercase tracking-[0.08em] text-white hover:text-red transition-colors"
              >
                Join early beta{" "}
                <span className="inline-block transition-transform duration-150 group-hover/beta:translate-x-1">
                  →
                </span>
              </button>
              <button
                onClick={() => navigate("/dashboard/claim")}
                aria-label="Join early beta"
                className="group"
              >
                <SquareArrow />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
