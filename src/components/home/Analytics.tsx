import { useEffect, useRef } from "react";
import SectionMarker from "@/components/SectionMarker";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/hooks/useSectionReveal";

gsap.registerPlugin(ScrollTrigger);

const DONUT = [
  { value: 96, color: "#3ECF8E", label: "Optimal: settlement success" },
  { value: 3, color: "#F5A524", label: "Stable: safe-settled to USDC" },
  { value: 1, color: "#E8322A", label: "Issues: reverted, zero stranded" },
];

const GAUGES = [
  { label: "Routing", from: "240ms", to: "80ms", pct: 88 },
  { label: "Settlement", from: "900ms", to: "400ms", pct: 72 },
  { label: "Scaling", from: "Adjusting", to: "", pct: 54 },
];

const HISTOGRAM = [
  42, 55, 38, 61, 47, 70, 52, 66, 44, 75, 58, 63, 49, 80, 68,
  54, 72, 60, 84, 50, 77, 65, 89, 57, 73, 62, 92, 70, 81, 96,
];

const EVOLUTION = [
  { label: "Settlement", value: 96 },
  { label: "Execution", value: 84 },
  { label: "Coverage", value: 92 },
  { label: "Scaling", value: 79 },
  { label: "Uptime", value: 98 },
];

const TICKER = [
  ["$5.8B", "Q2 VOLUME"],
  ["60+", "XSTOCKS LIVE"],
  ["200+", "ONDO ASSETS"],
  ["277K+", "RWA HOLDERS"],
];

/** Donut chart (red/grey family) with count-up center. */
function Donut() {
  const r = 60;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative w-[150px] h-[150px] shrink-0">
      <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
        <circle cx="75" cy="75" r={r} fill="none" stroke="#E3E3E6" strokeWidth="14" />
        {DONUT.map((s) => {
          const dash = (s.value / 100) * c;
          const offset = -(acc / 100) * c;
          acc += s.value;
          return (
            <circle
              key={s.label}
              cx="75"
              cy="75"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <span
        data-count={96}
        className="absolute inset-0 flex items-center justify-center font-mono font-medium text-3xl text-ink"
      >
        0%
      </span>
    </div>
  );
}

/** Hand-authored inline SVG (analytics-spark): red polyline + grey area fill. */
function Sparkline() {
  const pathRef = useRef<SVGPathElement>(null);
  const line =
    "M0,210 L60,196 L120,200 L180,176 L240,182 L300,150 L360,156 L420,120 L480,110 L540,72 L600,40";

  useEffect(() => {
    const path = pathRef.current;
    if (!path || prefersReducedMotion) return;
    const len = path.getTotalLength();
    gsap.fromTo(
      path,
      { strokeDasharray: len, strokeDashoffset: len },
      {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: {
          trigger: path.closest("svg"),
          start: "top 85%",
          end: "top 40%",
          scrub: true,
        },
      }
    );
  }, []);

  return (
    <div className="relative">
      <svg viewBox="0 0 600 240" className="w-full h-auto" role="img" aria-label="Tokenized-stock share performance line chart">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1="0" y1={48 * i} x2="600" y2={48 * i} stroke="#E3E3E6" strokeWidth="1" />
        ))}
        <path d={`${line} L600,240 L0,240 Z`} fill="#C9C9CE" opacity="0.5" stroke="none" />
        <path ref={pathRef} d={line} fill="none" stroke="#E8322A" strokeWidth="2.5" />
        <circle cx="540" cy="72" r="4" fill="#E8322A" />
      </svg>
      {/* tooltip chip */}
      <span className="absolute right-[8%] top-[14%] bg-ink text-white font-mono text-[10px] uppercase tracking-[0.1em] rounded px-2.5 py-1.5">
        $5.8B · Q2
      </span>
      <div className="flex justify-between mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
        <span>Q1</span>
        <span>Q2</span>
        <span>Q3</span>
        <span>Q4</span>
      </div>
    </div>
  );
}

export default function Analytics() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
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
      gsap.fromTo(
        root.querySelectorAll("[data-bar]"),
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.03,
          transformOrigin: "bottom center",
          scrollTrigger: { trigger: root.querySelector("[data-bars]"), start: "top 85%" },
        }
      );
      root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%" },
          onUpdate: () => {
            el.textContent = `${Math.round(obj.v)}%`;
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="analytics" ref={rootRef} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <div data-reveal>
          <SectionMarker index="003" label="SMART ANALYTICS" />
        </div>

        <div data-reveal className="mb-12 md:mb-16 max-w-3xl">
          <h2 className="font-display font-semibold text-4xl md:text-[64px] leading-[1.0] tracking-[-0.03em] text-ink">
            The rail, by the numbers.
          </h2>
          <p className="mt-6 font-body text-[17px] leading-[1.65] text-secondary2">
            Solana is the tokenized-stock capital of crypto - and TENDER is the first pay-by-handle
            rail that settles in them.
          </p>
        </div>

        {/* Row A - media tile + donut/gauges */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
          <div data-reveal className="md:col-span-4 relative rounded overflow-hidden bg-ink min-h-[280px]">
            <img
              src="/work-settlement.png"
              alt="TENDER settlement routing grid"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <span className="absolute bottom-5 left-5 font-display font-semibold text-2xl tracking-[-0.02em] text-white">
              TENDER®
            </span>
            <span className="absolute top-5 left-5 font-mono text-xs uppercase tracking-[0.12em] text-white/70">
              SETTLEMENT ENGINE
            </span>
          </div>

          <div data-reveal className="md:col-span-8 bg-card2 border border-hairline rounded p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <span className="inline-block font-mono text-xs uppercase tracking-[0.12em] text-secondary2 border border-hairline rounded-full px-4 py-1.5">
                RESPONSE TIME OPTIMIZATION
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted2">
                24H WINDOW
              </span>
            </div>
            <div className="flex flex-col md:flex-row gap-8 md:gap-12">
              <div className="flex flex-col items-start gap-5">
                <Donut />
                <span className="font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-ink">
                  Global System Status
                </span>
                <div className="flex flex-col gap-1.5">
                  {DONUT.map((s) => (
                    <span key={s.label} className="flex items-center gap-2 font-body text-xs text-secondary2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-7">
                {GAUGES.map((g) => (
                  <div key={g.label}>
                    <div className="flex gap-1 mb-2" aria-hidden>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < Math.round((g.pct / 100) * 12) ? "bg-red" : "bg-hairline"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-baseline justify-between gap-4 mb-2">
                      <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                        {g.label}
                      </span>
                      <span className="font-mono text-sm text-ink">
                        {g.from}
                        {g.to ? ` → ${g.to}` : ""}
                      </span>
                    </div>
                    <div className="h-1 bg-hairline overflow-hidden">
                      <div className="h-full bg-red" style={{ width: `${g.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row B - 30-day histogram + performance line chart */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
          <div data-reveal className="md:col-span-5 bg-card2 border border-hairline rounded p-6 md:p-8 flex flex-col">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2 mb-6">
              30-DAY MONITORING
            </span>
            <div data-bars className="flex items-end gap-[3px] h-[110px] mb-8">
              {HISTOGRAM.map((h, i) => (
                <div
                  key={i}
                  data-bar
                  className="flex-1 bg-red rounded-sm"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <span className="font-mono font-medium text-[64px] md:text-[88px] leading-none tracking-[-0.03em] text-ink mt-auto">
              95-97%
            </span>
            <p className="mt-4 font-body text-[15px] text-secondary2">
              of all cross-chain tokenized-stock volume, 54+ straight weeks.
            </p>
          </div>

          <div data-reveal className="md:col-span-7 bg-card2 border border-hairline rounded p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                PERFORMANCE
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted2">
                CURRENT PERFORMANCE METRICS
              </span>
            </div>
            <Sparkline />
            <p className="mt-6 font-body text-sm text-muted2">
              Cross-chain tokenized-stock share settling on Solana rails.
            </p>
          </div>
        </div>

        {/* Row C - system evolution + narrow model card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div data-reveal className="md:col-span-9 bg-card2 border border-hairline rounded p-6 md:p-8 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                SYSTEM EVOLUTION
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-red">
                EVOLUTION SCORE 90/100
              </span>
            </div>
            <div data-bars className="flex-1 flex items-end gap-2 sm:gap-4 md:gap-8 min-h-[200px]">
              {EVOLUTION.map((e) => (
                <div key={e.label} className="flex-1 min-w-0 flex flex-col items-center gap-3">
                  <span className="font-mono text-xs text-ink">{e.value}%</span>
                  <div
                    data-bar
                    className="w-full bg-red rounded-sm"
                    style={{ height: `${e.value * 1.6}px` }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2 text-center">
                    {e.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal className="md:col-span-3 bg-ink rounded p-6 md:p-8 flex md:flex-col items-center md:items-start justify-between gap-4 min-h-[140px]">
            <span className="w-2.5 h-2.5 bg-red shrink-0" aria-hidden />
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-white/80 md:[writing-mode:vertical-rl] md:rotate-180 md:self-center">
              tender_router · MODEL v0.4.2
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/50">
              SOLANA MAINNET-BETA
            </span>
          </div>
        </div>

        {/* Bottom stat ticker strip with hairline dividers */}
        <div data-reveal className="mt-6 border-y border-hairline grid grid-cols-2 md:grid-cols-4">
          {TICKER.map(([stat, label], i) => (
            <div
              key={label}
              className={`flex flex-col gap-1 py-6 md:py-8 px-5 md:px-8 ${
                i > 0 ? "border-l border-hairline" : ""
              } ${i === 2 ? "max-md:border-l-0 max-md:border-t max-md:border-hairline" : ""} ${
                i === 3 ? "max-md:border-t max-md:border-hairline" : ""
              }`}
            >
              <span className="font-mono font-medium text-2xl md:text-3xl text-red">{stat}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
