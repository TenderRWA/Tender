import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useComingSoon } from "@/components/ComingSoonModal";
import InkTicker from "@/components/InkTicker";

const ROLES = [
  {
    idx: "R1",
    name: "Receiver",
    role: "GET PAID YOUR WAY",
    img: "/team-receiver.png",
    desc: "Set your election once. Every tip, invoice and salary auto-DCAs your portfolio - you receive what you want, not what they sent.",
  },
  {
    idx: "R2",
    name: "Sender",
    role: "PAY WITH WHAT YOU HOLD",
    img: "/team-sender.png",
    desc: "Pay a name in any token you hold. No swaps, no bridge, no friction - the rail does the rest.",
  },
  {
    idx: "R3",
    name: "Team / DAO",
    role: "ONE VAULT, EVERY ROSTER",
    img: "/team-dao.png",
    desc: "One payroll vault, one roster, salary-in-assets for everyone. Splits route revenue the moment it lands.",
  },
  {
    idx: "R4",
    name: "Staker",
    role: "SECURE THE RAIL",
    img: "/team-staker.png",
    scene: "ink" as const,
    desc: "Secure the parameters and registry. Earn a share of every converted settlement.",
  },
];

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.2l7.3-8.3L1.2 2h6.4l4.4 5.9L18.9 2zm-1.1 18.1h1.7L7.1 3.8H5.3l12.5 16.3z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
      <path d="M21.9 4.6 18.8 19c-.2 1.1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-.9.5l.3-4.6L18 6.9c.4-.3-.1-.5-.6-.2L7.2 13.2 2.7 11.8c-1-.3-1-1 .2-1.4l17.6-6.8c.8-.3 1.5.2 1.4 1z" />
    </svg>
  );
}

export default function Team() {
  const ref = useSectionReveal<HTMLElement>();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const navigate = useNavigate();
  const comingSoon = useComingSoon();

  const jump = (i: number) => {
    setDir(i > idx ? 1 : -1);
    setIdx(((i % ROLES.length) + ROLES.length) % ROLES.length);
  };

  const role = ROLES[idx];

  return (
    <section id="team" ref={ref} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <SectionMarker index="007" label="THE TEAM" />

        {/* Header row: mono label + red progress dots + arrows */}
        <div data-reveal className="flex flex-wrap items-center justify-between gap-4 md:gap-6 mb-10 md:mb-14">
          <div className="flex items-center gap-6">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
              TEAM PLATFORM
            </span>
            <div className="flex items-center gap-2">
              {ROLES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => jump(i)}
                  aria-label={`Role ${i + 1}`}
                  className={`w-3 h-3 rounded-full border transition-colors duration-300 ${
                    i === idx ? "bg-red border-red" : "bg-transparent border-muted2"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => jump(idx - 1)}
              aria-label="Previous role"
              className="w-12 h-12 border border-hairline rounded text-secondary2 hover:border-red hover:text-ink transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => jump(idx + 1)}
              aria-label="Next role"
              className="w-12 h-12 border border-hairline rounded text-secondary2 hover:border-red hover:text-ink transition-colors"
            >
              →
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Carousel body */}
          <div data-reveal className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-10 bg-card2 border border-hairline rounded p-8 md:p-12 min-h-[380px] overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={idx}
                initial={{ x: 60 * dir, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60 * dir, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col"
              >
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-red">
                  {role.idx} · {role.role}
                </span>
                <h3 className="mt-4 font-display font-semibold text-4xl md:text-[56px] leading-[1.0] tracking-[-0.03em] text-ink">
                  {role.name}
                </h3>
                <p className="mt-5 font-body text-[16px] leading-[1.65] text-secondary2 max-w-md">
                  {role.desc}
                </p>
                <button
                  onClick={() => navigate("/team")}
                  className="mt-8 w-fit font-body font-semibold text-sm uppercase tracking-[0.08em] text-secondary2 hover:text-ink border border-hairline hover:border-red rounded px-6 py-3 transition-colors duration-150"
                >
                  Learn more →
                </button>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`img-${idx}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded overflow-hidden bg-base min-h-[240px]"
              >
                {"scene" in role && role.scene === "ink" ? (
                  <InkTicker className="absolute inset-0 h-full w-full" />
                ) : (
                  <img
                    src={role.img}
                    alt={`${role.name} - abstract portrait tile`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Vertical icon column, far right */}
          <div data-reveal className="hidden md:flex flex-col items-center gap-3">
            <a
              href="https://x.com/TenderRWA"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TENDER on X"
              className="w-12 h-12 border border-hairline rounded flex items-center justify-center text-secondary2 hover:text-red hover:border-red transition-colors"
            >
              <XIcon />
            </a>
            <button
              onClick={comingSoon.open}
              aria-label="TENDER on Telegram"
              className="w-12 h-12 border border-hairline rounded flex items-center justify-center text-secondary2 hover:text-red hover:border-red transition-colors"
            >
              <TelegramIcon />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
