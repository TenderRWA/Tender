import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import { scrollToHash } from "@/lib/lenis";
import { useComingSoon } from "@/components/ComingSoonModal";
import TerminalControls from "@/components/dashboard/TerminalControls";

/** `newTab` links are plain anchors: reading the doc shouldn't lose the page
    the visitor was already on. */
const NAV_LINKS: { label: string; to: string; newTab?: boolean }[] = [
  { label: "Home", to: "/#top" },
  { label: "Work", to: "/work" },
  { label: "Services", to: "/services" },
  { label: "Pricing", to: "/pricing" },
  { label: "Whitepaper", to: "/whitepaper", newTab: true },
  { label: "Roadmap", to: "/roadmap", newTab: true },
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
  // The terminal carries its identity controls here rather than in a
  // second bar of its own.
  const isTerminal = location.pathname.startsWith("/dashboard");

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

  /** Which panel link the current route belongs to, for the orientation cue. */
  const isActive = (to: string) => {
    const path = to.split("#")[0] || "/";
    return path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
  };

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
            {isTerminal ? (
              <TerminalControls />
            ) : (
              <span className="hidden items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.08em] text-ink/75 md:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                Solana · Mainnet-Beta
              </span>
            )}
            {/* An unlabelled hamburger is the one control every visitor has to
                guess at. The word costs 44px and removes the guess. */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="group -mr-1.5 flex h-12 items-center gap-3 rounded-full px-1.5 md:pr-4 md:pl-3.5"
            >
              <span className="hidden font-mono text-[13px] tracking-[0.14em] text-ink/75 uppercase transition-colors duration-200 group-hover:text-red md:block">
                Menu
              </span>
              <span className="flex w-6 shrink-0 flex-col items-end gap-[5px]">
                <span className="block h-0.5 w-6 bg-red transition-all duration-200" />
                <span className="block h-0.5 w-6 bg-red transition-all duration-200 group-hover:w-[17px]" />
                <span className="block h-0.5 w-6 bg-red transition-all duration-200" />
              </span>
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
              style={{
                // White on #E8322A measures 4.3:1 — under the 4.5:1 floor for
                // body text. Dropping the panel to a deeper red puts every
                // label past 7:1 without leaving the brand.
                backgroundImage: "linear-gradient(168deg, #C1281F 0%, #A92019 54%, #8D1912 100%)",
              }}
              className="fixed top-0 right-0 bottom-0 z-[70] flex w-full flex-col overflow-y-auto shadow-2xl sm:w-[min(480px,92vw)]"
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
                  <span className="inline-block font-display text-4xl leading-none text-white/70 transition-all duration-300 group-hover:rotate-90 group-hover:text-white">
                    ×
                  </span>
                </button>
              </div>

              <nav className="flex flex-1 flex-col justify-center gap-0.5 px-10 py-6 md:px-14">
                {NAV_LINKS.map((link, i) => {
                  const active = isActive(link.to);
                  const shared = {
                    initial: { y: 60, opacity: 0 },
                    animate: { y: 0, opacity: 1 },
                    transition: {
                      delay: 0.15 + i * 0.06,
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                    },
                    className: "group flex w-fit items-baseline gap-5 py-1.5 text-left",
                  };
                  const inner = (
                    <>
                      <span
                        className={`font-mono text-[12px] tabular-nums transition-colors duration-200 ${
                          active ? "text-white" : "text-white/45 group-hover:text-white/75"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`flex items-center gap-3.5 font-display text-[clamp(30px,3.6vw,42px)] leading-[1.08] font-semibold tracking-[-0.03em] transition-colors duration-200 group-hover:text-white ${
                          active ? "text-white" : "text-white/80"
                        }`}
                      >
                        {link.label}
                        <span
                          aria-hidden
                          className={`text-[0.5em] transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 ${
                            // A new-tab link keeps its cue visible: the ↗ is what
                            // tells you the page won't replace this one.
                            active || link.newTab
                              ? "translate-x-0 opacity-100"
                              : "-translate-x-3 opacity-0"
                          }`}
                        >
                          {link.newTab ? "↗" : "→"}
                        </span>
                      </span>
                    </>
                  );

                  return link.newTab ? (
                    <motion.a
                      key={link.label}
                      href={link.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpen(false)}
                      {...shared}
                    >
                      {inner}
                      <span className="sr-only">(opens in a new tab)</span>
                    </motion.a>
                  ) : (
                    <motion.button
                      key={link.label}
                      onClick={() => go(link.to)}
                      aria-current={active ? "page" : undefined}
                      {...shared}
                    >
                      {inner}
                    </motion.button>
                  );
                })}
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.15 + NAV_LINKS.length * 0.06,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="mt-10"
                >
                  <button
                    onClick={() => go("/dashboard/claim")}
                    className="rounded border-2 border-white/85 px-8 py-4 font-body text-sm font-semibold tracking-[0.08em] text-white uppercase transition-colors duration-200 hover:bg-white hover:text-[#8D1912]"
                  >
                    Claim Your Handle →
                  </button>
                </motion.div>
              </nav>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="flex items-center justify-between gap-4 border-t border-white/20 px-10 py-7 md:px-14"
              >
                <span className="font-mono text-[12px] tracking-[0.12em] text-white/70 uppercase">
                  TENDER · BY INFRANODES
                </span>
                <div className="flex items-center gap-5">
                  <a
                    href="https://x.com/TenderRWA"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TENDER on X"
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    <XIcon className="w-5 h-5" />
                  </a>
                  <button
                    onClick={comingSoon.open}
                    aria-label="TENDER on Telegram"
                    className="text-white/70 transition-colors hover:text-white"
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
