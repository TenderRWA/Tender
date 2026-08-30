import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";

interface ComingSoonCtx {
  open: () => void;
  close: () => void;
}

const ComingSoonContext = createContext<ComingSoonCtx>({ open: () => {}, close: () => {} });

/** Trigger the shared "coming soon" modal from anywhere (X/Telegram links, dead doc links). */
export function useComingSoon() {
  return useContext(ComingSoonContext);
}

/**
 * Light-theme centered modal shown instead of external X/Telegram navigation.
 * Mounted once in Layout via this provider; any element can open it with
 * `useComingSoon().open()`. Backdrop click + ESC close.
 */
export function ComingSoonProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <ComingSoonContext.Provider value={{ open, close }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="coming-soon-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] bg-black/30 flex items-center justify-center px-5"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label="Coming soon"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-base border border-hairline rounded p-8 md:p-10 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                  COMING SOON
                </span>
              </div>
              <h3 className="mt-6 font-display font-semibold text-3xl md:text-4xl leading-[1.05] tracking-[-0.02em] text-ink">
                We're launching soon.
              </h3>
              <p className="mt-4 font-body text-[15px] leading-[1.65] text-secondary2">
                Our X and Telegram channels go live with the T1 mainnet release. Claim your
                handle to get notified.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    close();
                    navigate("/dashboard/claim");
                  }}
                  className="group flex-1 inline-flex items-center justify-center gap-2 bg-red hover:bg-red-hover text-white font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-6 py-4 transition-all duration-150 hover:-translate-y-0.5"
                >
                  Claim Your Handle
                  <span className="inline-block transition-transform duration-150 group-hover:translate-x-1.5">
                    →
                  </span>
                </button>
                <button
                  onClick={close}
                  className="border border-hairline text-secondary2 hover:text-ink hover:border-red font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-6 py-4 transition-colors duration-150"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ComingSoonContext.Provider>
  );
}
