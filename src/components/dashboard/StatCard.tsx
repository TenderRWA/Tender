import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Eased count-up hook: animates 0 -> value over `duration` ms. */
export function useCountUp(value: number, duration = 1200): number {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  return display;
}

/** Tiny red sparkline rendered from a short series. */
function Sparkline({ data }: { data: number[] }) {
  const w = 96;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`)
    .join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-24 h-7" aria-hidden preserveAspectRatio="none">
      <polygon points={area} className="fill-red/10" />
      <polyline
        points={points}
        fill="none"
        className="stroke-red"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta?: string;
  deltaTone?: "success" | "warning" | "red";
  spark?: number[];
}

/** Stat card: red square marker, mono count-up, sparkline, hover lift + red top accent. */
export default function StatCard({ label, value, format, delta, deltaTone = "success", spark }: StatCardProps) {
  const display = useCountUp(value);
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString("en-US"));
  const tone =
    deltaTone === "success" ? "text-success" : deltaTone === "warning" ? "text-warning" : "text-red";

  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className="group relative glass glass-interactive glass-sheen rounded-2xl p-5 md:p-6 pt-6 md:pt-7 flex flex-col gap-5 min-w-0 overflow-hidden"
    >
      {/* Red top accent on hover */}
      <span
        className="absolute top-0 left-0 h-[2px] w-full bg-red scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 z-[1]"
        aria-hidden
      />
      <span className="relative z-[1] flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-secondary2">
          <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
          {label}
        </span>
        {spark && <Sparkline data={spark} />}
      </span>
      <span className="relative z-[1] font-mono font-medium text-[clamp(1.35rem,1.9vw,2.15rem)] leading-none tracking-[-0.03em] text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
        {fmt(display)}
      </span>
      {delta && (
        <span className={`relative z-[1] font-mono text-xs uppercase tracking-[0.12em] ${tone}`}>{delta}</span>
      )}
    </div>
  );
}
