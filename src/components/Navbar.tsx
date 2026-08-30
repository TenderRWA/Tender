import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import { scrollToHash } from "@/lib/lenis";
import { useComingSoon } from "@/components/ComingSoonModal";

const NAV_LINKS: { label: string; to: string }[] = [
  { label: "Home", to: "/#top" },
  { label: "Work", to: "/work" },
  { label: "Services", to: "/services" },
  { label: "Process", to: "/#process" },
  { label: "Smart Analytics", to: "/#analytics" },
  { label: "Pricing", to: "/pricing" },
  { label: "FAQ", to: "/#faq" },
  { label: "The Team", to: "/team" },
  { label: "Design Laws", to: "/#laws" },
  { label: "Tender Labs®", to: "/#labs" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Contact", to: "/contact" },
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.9 2.1h3.4l-7.5 8.6 8.8 11.2h-6.9l-5.4-6.8-6.2 6.8H1.7l8-9.2L1.3 2.1h7.1l4.9 6.2 5.6-6.2Zm-1.2 17.8h1.9L7.6 4H5.6l12.1 15.9Z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.9 3.4 2.8 10.9c-1.3.5-1.3 1.3-.2 1.6l4.8 1.5 1.9 5.7c.2.6.4.8.8.8.3 0 .5-.1.8-.4l2.2-2.1 4.7 3.4c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.2-.4-1.7-1.7-1.3ZM7.6 13.7l10.9-6.9c.5-.3 1-.1.6.2l-9.3 8.4-.4 3.9-1.8-5.6Z" />
    </svg>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const comingSoon = useComingSoon();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // close panel on route change (adjust state during render, no effect)
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setOpen(false);
  }

  /** Handles "/#hash" (scroll on home), "/path#hash", and plain routes. */
  const go = (to: string) => {
    setOpen(false);
    const hashIdx = to.indexOf("#");
    const path = hashIdx >= 0 ? to.slice(0, hashIdx) || "/" : to;
    const hash = hashIdx >= 0 ? to.slice(hashIdx) : "";
    if (path === location.pathname) {
      if (hash) scrollToHash(hash);
      else window.scrollTo({ top: 0 });
    } else {
      navigate(to);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-20 transition-all duration-300 ${
          scrolled && !open
            ? "bg-base/90 backdrop-blur-md border-b border-hairline"
            : "bg-transparent border-b border-transparent"
        }`}
        style={{
          opacity: mounted ? 1 : 0,
          transitionProperty: "opacity, background-color, border-color",
          transitionDuration: "400ms, 300ms, 300ms",
          transitionDelay: "200ms, 0ms, 0ms",
        }}
      >
        <div className="mx-auto max-w-container h-full px-5 md:px-10 flex items-center justify-between">
          <Link
            to="/"
            onClick={(e) => {
              e.preventDefault();
              go("/#top");
            }}
            className="flex items-center gap-3 group"
            aria-label="TENDER home"
          >
            <img src="/logo.png" alt="TENDER logo" className="h-9 w-auto" />
            <span className="font-display font-semibold text-xl text-ink tracking-tight group-hover:text-red transition-colors duration-150">
              TENDER®
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <span className="hidden md:block font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
              SOLANA · MAINNET-BETA
            </span>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="relative w-12 h-12 flex flex-col items-center justify-center gap-1.5 group"
            >
              <span className="block w-6 h-0.5 bg-red transition-all duration-200" />
              <span className="block w-6 h-0.5 bg-red transition-all duration-200 group-hover:w-[17px]" />
              <span className="block w-6 h-0.5 bg-red transition-all duration-200" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            {/* dark backdrop over the visible remainder; click closes */}
            <motion.div
              key="nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="fixed inset-0 z-[60] bg-black/30"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            {/* right-side red sidebar panel */}
            <motion.aside
              key="nav-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-full sm:w-[min(480px,92vw)] bg-red overflow-y-auto shadow-2xl flex flex-col"
              data-lenis-prevent
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
            >
              <div className="flex items-center justify-end p-5 md:p-6">
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="w-12 h-12 flex items-center justify-center group"
                >
                  <span className="text-red-deep font-display text-4xl leading-none transition-transform duration-300 group-hover:rotate-90 inline-block">
                    ×
                  </span>
                </button>
              </div>

              <nav className="flex-1 flex flex-col justify-center px-10 py-6 gap-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.button
                    key={link.label}
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => go(link.to)}
                    className="group flex items-baseline gap-4 text-left w-fit"
                  >
                    <span className="font-mono text-xs text-red-deep/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display font-semibold text-[clamp(24px,3vw,34px)] leading-[1.15] tracking-[-0.03em] text-red-deep group-hover:text-white transition-colors duration-200 flex items-center gap-3">
                      {link.label}
                      <span className="opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-white text-[0.6em]">
                        →
                      </span>
                    </span>
                  </motion.button>
                ))}
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + NAV_LINKS.length * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-7"
                >
                  <button
                    onClick={() => go("/dashboard/claim")}
                    className="font-body font-semibold text-sm uppercase tracking-[0.08em] text-red-deep border-2 border-red-deep rounded px-8 py-4 hover:bg-red-deep hover:text-white transition-colors duration-200"
                  >
                    Claim Your Handle →
                  </button>
                </motion.div>
              </nav>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="flex items-center justify-between gap-4 px-10 py-6 border-t border-red-deep/30"
              >
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-red-deep">
                  TENDER · BY INFRANODES
                </span>
                <div className="flex items-center gap-5">
                  <a
                    href="https://x.com/TenderRWA"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TENDER on X"
                    className="text-red-deep hover:text-white transition-colors"
                  >
                    <XIcon className="w-5 h-5" />
                  </a>
                  <button
                    onClick={comingSoon.open}
                    aria-label="TENDER on Telegram"
                    className="text-red-deep hover:text-white transition-colors"
                  >
                    <TelegramIcon className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
