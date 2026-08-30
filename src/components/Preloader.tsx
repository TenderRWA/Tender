import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface PreloaderProps {
  /** Unique key: re-mounts / re-runs when it changes. */
  runKey: string;
  label: string;
  duration?: number;
  onDone?: () => void;
}

/**
 * Premium brand preloader: white canvas, hairline grid, logo mark revealed by a
 * red wipe, mono counter, then a two-panel curtain exit.
 */
export default function Preloader({ runKey, label, duration = 1900, onDone }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(true);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setProgress(0);
    setOpen(true);

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // Ease-out so the counter decelerates into 100.
      const eased = 1 - Math.pow(1 - t, 2.2);
      setProgress(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        setOpen(false);
      }
    };

    raf = requestAnimationFrame(tick);

    // Lock scroll while the curtain is up.
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = prev;
    };
  }, [runKey, duration]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {open && (
        <motion.div
          key={runKey}
          className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden bg-base"
          initial={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          aria-live="polite"
          aria-busy="true"
        >
          {/* hairline grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #e3e3e6 1px, transparent 1px), linear-gradient(to bottom, #e3e3e6 1px, transparent 1px)",
              backgroundSize: "clamp(48px, 8vw, 96px) clamp(48px, 8vw, 96px)",
              maskImage: "radial-gradient(circle at 50% 50%, #000 30%, transparent 78%)",
              WebkitMaskImage: "radial-gradient(circle at 50% 50%, #000 30%, transparent 78%)",
            }}
          />

          {/* curtain panels (exit) */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-base"
            initial={{ y: 0 }}
            exit={{ y: "-101%" }}
            transition={{ duration: 0.85, ease: EASE }}
          />
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-base"
            initial={{ y: 0 }}
            exit={{ y: "101%" }}
            transition={{ duration: 0.85, ease: EASE }}
          />

          {/* content */}
          <motion.div
            className="relative z-10 flex w-full max-w-[min(90vw,560px)] flex-col items-center px-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.35, ease: EASE } }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            {/* logo with red wipe reveal */}
            <div className="relative">
              <motion.img
                src="/logo.png"
                alt=""
                aria-hidden
                className="h-16 w-auto sm:h-20"
                initial={{ scale: 0.94, opacity: 0, filter: "blur(6px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.9, ease: EASE }}
              />
              <motion.span
                className="pointer-events-none absolute inset-0 bg-red mix-blend-multiply"
                style={{
                  WebkitMaskImage: "url(/logo.png)",
                  maskImage: "url(/logo.png)",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                }}
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)", "inset(0 0 0 100%)"] }}
                transition={{ duration: 1.6, ease: EASE, times: [0, 0.55, 1], delay: 0.25 }}
              />
            </div>

            {/* wordmark */}
            <motion.p
              className="mt-6 font-mono text-[10px] uppercase tracking-[0.36em] text-muted2"
              initial={{ opacity: 0, letterSpacing: "0.6em" }}
              animate={{ opacity: 1, letterSpacing: "0.36em" }}
              transition={{ duration: 1, ease: EASE, delay: 0.15 }}
            >
              {label}
            </motion.p>

            {/* progress rail */}
            <div className="mt-8 w-full">
              <div className="relative h-px w-full bg-hairline">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-red"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "linear" }}
                />
                <motion.span
                  className="absolute -top-[3px] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-red"
                  style={{ left: `${progress}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted2">
                <span>Loading</span>
                <span className="tabular-nums text-ink">
                  {String(progress).padStart(3, "0")}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
