import OnyxCubes from "@/components/OnyxCubes";
import { useEffect, useRef } from "react";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";
import { gsap, prefersReducedMotion } from "@/hooks/useSectionReveal";
import { useComingSoon } from "@/components/ComingSoonModal";

const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/* P1. Page Hero                                                       */
/* ------------------------------------------------------------------ */

function CharLine({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`block overflow-hidden ${className ?? ""}`}>
      {text.split("").map((ch, i) => (
        <span key={i} data-hero-char className="inline-block will-change-transform">
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

function WorkHero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });
      tl.fromTo(
        root.querySelectorAll("[data-hero-char]"),
        { yPercent: 110 },
        { yPercent: 0, duration: 0.8, ease: "power4.out", stagger: 0.03 }
      )
        .fromTo(
          root.querySelector("[data-hero-hairline]"),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.6, ease: "power3.out", transformOrigin: "left center" },
          0.4
        )
        .fromTo(
          root.querySelectorAll("[data-hero-fade]"),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.15 },
          0.5
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="bg-base/55">
      <div className="mx-auto max-w-container px-5 md:px-10 py-16 md:py-24">
        <SectionMarker index="001" label="WORK" />
        <h1 className="font-display font-semibold text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.04em]">
          <CharLine text="The product lineup." className="text-ink" />
          <CharLine text="Six programs, one rail." className="text-red" />
        </h1>
        <p
          data-hero-fade
          className="mt-8 font-body text-[17px] leading-[1.65] text-secondary2 max-w-2xl"
        >
          Every module is a Solana program with a single job. Composed, they turn any
          payment into your portfolio.
        </p>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <span
            data-hero-fade
            className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.12em] text-secondary2 sm:whitespace-nowrap"
          >
            PRODUCT LINEUP 6/6 · SOLANA MAINNET-BETA · NON-CUSTODIAL
          </span>
          <span data-hero-hairline className="flex-1 h-px bg-hairline" aria-hidden />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* P2. Featured Module - Settlement Engine                             */
/* ------------------------------------------------------------------ */

const CHIPS = ["ATOMIC", "SLIPPAGE-CAPPED", "AUTHENTICITY-GATED", "ZERO CUSTODY"];

function FeaturedModule() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelector("[data-feat-img]"),
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 1,
          ease: "power3.inOut",
          scrollTrigger: { trigger: root, start: "top 75%" },
        }
      );
      gsap.fromTo(
        root.querySelector("[data-feat-panel]"),
        { x: 80, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 75%" },
        }
      );
      gsap.fromTo(
        root.querySelectorAll("[data-chip]"),
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: "back.out(1.7)",
          stagger: 0.08,
          scrollTrigger: { trigger: root, start: "top 65%" },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:min-h-[70vh]">
          {/* Image tile */}
          <div className="lg:col-span-3 relative bg-card2 border border-hairline rounded overflow-hidden">
            <span className="absolute top-5 left-5 z-10 font-mono text-xs uppercase tracking-[0.12em] text-white/80">
              01/06 · SETTLEMENT ENGINE
            </span>
            <div data-feat-img className="h-full">
              <img
                src="/work-settlement.png"
                alt="Settlement Engine - abstract on-chain routing grid"
                className="w-full aspect-[4/3] lg:aspect-auto lg:h-full object-cover"
              />
            </div>
            <span className="absolute bottom-5 left-5 z-10 font-mono text-xs uppercase tracking-[0.12em] text-white/70">
              tender_router
            </span>
          </div>

          {/* Red panel */}
          <div
            data-feat-panel
            className="lg:col-span-2 relative bg-red rounded p-8 md:p-10 flex flex-col justify-between gap-10 overflow-hidden"
          >
            <div className="absolute inset-0 dot-matrix" aria-hidden />
            <div className="relative">
              <h3 className="font-display font-medium text-[28px] md:text-[32px] leading-[1.1] tracking-[-0.02em] text-white">
                The router that never touches your money.
              </h3>
              <p className="mt-5 font-body text-[15px] leading-relaxed text-white/85">
                tender_router executes the full settlement in one atomic instruction:
                validate the handle's election, route the conversion through Jupiter,
                sanity-check price against Pyth, deliver to the receiver. If any leg
                breaches its cap, the payment safe-settles in USDC with an on-chain
                notice.
              </p>
            </div>
            <div className="relative flex flex-wrap gap-2">
              {CHIPS.map((chip) => (
                <span
                  key={chip}
                  data-chip
                  className="font-mono text-xs uppercase tracking-[0.12em] text-white border border-white/40 rounded px-3 py-2"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* P3. Module Index (5 rows)                                           */
/* ------------------------------------------------------------------ */

const MODULES = [
  {
    num: "02/06",
    name: "Election Registry",
    img: "/work-registry.png",
    copy: "Your mix lives on-chain. Basis points summing to 100%, updateable in one transaction, effective at the next payment. Consume the standard - never fork it.",
  },
  {
    num: "03/06",
    name: "Invoice Book",
    img: "/work-invoice.png",
    copy: "Pay-links and QR codes carrying amount, memo and expiry. Fully Solana Pay-compatible - any wallet can pay any handle.",
  },
  {
    num: "04/06",
    name: "Payroll Vault",
    img: "/work-payroll.png",
    copy: "A funder vault, a roster, a schedule. A permissionless crank executes each run - every recipient paid in their own elected assets.",
  },
  {
    num: "05/06",
    name: "Universe Gate",
    img: "/work-universe.png",
    copy: "The eligible-asset registry. xStocks, Ondo and verified RWAs only - with issuer restrictions enforced at election time.",
  },
  {
    num: "06/06",
    name: "Fee Sink",
    img: "/work-token.png",
    scene: "onyx" as const,
    copy: "The fee sink. Settlement fees fund open-market buyback and staker pay. Stakers secure parameters and the registry.",
  },
];

function ModuleIndex() {
  const rootRef = useRef<HTMLElement>(null);
  const comingSoon = useComingSoon();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>("[data-row]").forEach((row, i) => {
        const fromLeft = i % 2 === 0; // odd rows (1st, 3rd, 5th) slide from left
        gsap.fromTo(
          row,
          { x: fromLeft ? -60 : 60, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: row, start: "top 80%" },
          }
        );
        const img = row.querySelector("[data-parallax]");
        if (img) {
          gsap.fromTo(
            img,
            { yPercent: -7 },
            {
              yPercent: 7,
              ease: "none",
              scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true },
            }
          );
        }
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <div className="flex items-center gap-3 mb-12 md:mb-16">
          <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2 whitespace-nowrap">
            [ MODULE INDEX ]
          </span>
          <span className="flex-1 h-px bg-hairline" aria-hidden />
        </div>

        <div>
          {MODULES.map((m) => (
            <article
              key={m.num}
              data-row
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center border-t border-hairline py-12 md:py-16 first:border-t-0 first:pt-0"
            >
              <div className="lg:col-span-5 overflow-hidden rounded border border-hairline bg-card2">
                {"scene" in m && m.scene === "onyx" ? (
                  <OnyxCubes className="w-full aspect-[4/3]" />
                ) : (
                  <img
                    data-parallax
                    src={m.img}
                    alt={`${m.name} - abstract module artwork`}
                    className="w-full aspect-[4/3] object-cover scale-110"
                  />
                )}
              </div>
              <div className="lg:col-span-7">
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-red">
                  {m.num}
                </span>
                <h3 className="mt-3 font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-ink">
                  {m.name}
                </h3>
                <p className="mt-4 font-body text-[17px] leading-[1.65] text-secondary2 max-w-xl">
                  {m.copy}
                </p>
                <button
                  onClick={comingSoon.open}
                  className="group mt-6 inline-flex items-center gap-2 font-body font-semibold text-sm uppercase tracking-[0.08em] text-secondary2 border border-hairline rounded px-5 py-3 hover:border-red hover:text-ink transition-colors duration-150"
                >
                  Read the spec
                  <span className="inline-block transition-transform duration-150 group-hover:translate-x-1">
                    →
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-12 font-mono text-xs uppercase tracking-[0.12em] text-muted2">
          TENDER is settlement infrastructure - not payroll, tax, or investment software.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* P4. Development Status Band                                         */
/* ------------------------------------------------------------------ */

function StatusBand() {
  const rootRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion) {
      const c = root.querySelector("[data-count]");
      if (c) c.textContent = "42.3%";
      const b = root.querySelector<HTMLElement>("[data-bar]");
      if (b) b.style.transform = "scaleX(0.423)";
      return;
    }

    const ctx = gsap.context(() => {
      const counter = root.querySelector("[data-count]");
      const bar = root.querySelector("[data-bar]");
      const state = { v: 0 };
      gsap.to(state, {
        v: 42.3,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: { trigger: root, start: "top 75%" },
        onUpdate: () => {
          if (counter) counter.textContent = `${state.v.toFixed(1)}%`;
        },
      });
      if (bar) {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: 0.423,
            duration: 1.2,
            ease: "power2.out",
            transformOrigin: "left center",
            scrollTrigger: { trigger: root, start: "top 75%" },
          }
        );
      }
      gsap.fromTo(
        root.querySelectorAll("[data-reveal]"),
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: root, start: "top 85%" },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="border-t border-hairline bg-card2/40">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end">
          <div data-reveal>
            <h3 className="font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-ink">
              Mainnet readiness
            </h3>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
              DEVELOPMENT PROGRESS · EARLY BETA OPEN
            </p>
          </div>
          <div
            data-reveal
            className="font-mono font-medium text-[80px] md:text-[120px] leading-none tracking-[-0.03em] text-ink lg:text-right"
          >
            <span data-count>0.0%</span>
          </div>
        </div>
        <div data-reveal className="mt-10 h-1.5 bg-hairline overflow-hidden">
          <div data-bar className="h-full w-full bg-red origin-left scale-x-0" />
        </div>
        <div data-reveal className="mt-10">
          <button
            onClick={() => navigate("/dashboard/claim")}
            className="group inline-flex items-center gap-2 bg-red hover:bg-red-hover text-white font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-8 py-4 transition-all duration-150 hover:-translate-y-0.5"
          >
            Join early beta
            <span className="inline-block transition-transform duration-150 group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* P5. CTA Strip                                                       */
/* ------------------------------------------------------------------ */

function CtaStrip() {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { clipPath: "inset(100% 0 0 0)" }}
      whileInView={{ clipPath: "inset(0% 0 0 0)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.9, ease: EXPO }}
      className="bg-red"
    >
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-32 flex flex-col md:flex-row md:items-center justify-between gap-10">
        <h2 className="font-display font-semibold text-4xl md:text-[64px] leading-[1.0] tracking-[-0.03em] text-white max-w-3xl">
          Pay a handle. Receive a portfolio.
        </h2>
        <motion.button
          onClick={() => navigate("/dashboard/claim")}
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.02, 1] }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="shrink-0 font-body font-semibold text-sm uppercase tracking-[0.08em] text-red-deep border-2 border-red-deep rounded px-8 py-4 hover:bg-red-deep hover:text-white transition-colors duration-200"
        >
          Claim Your Handle →
        </motion.button>
      </div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */

export default function Work() {
  return (
    <>
      <WorkHero />
      <FeaturedModule />
      <ModuleIndex />
      <StatusBand />
      <CtaStrip />
    </>
  );
}
