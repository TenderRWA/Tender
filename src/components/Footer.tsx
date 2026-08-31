import { useLocation, useNavigate } from "@/lib/router-compat";
import { scrollToHash } from "@/lib/lenis";
import { useComingSoon } from "@/components/ComingSoonModal";

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

/** One lean row of real destinations — no placeholder or duplicate links. */
const LINKS: { label: string; to: string }[] = [
  { label: "Work", to: "/work" },
  { label: "Services", to: "/services" },
  { label: "Pricing", to: "/pricing" },
  { label: "Contact", to: "/contact" },
  { label: "Terms", to: "/contact#terms" },
];

export default function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const comingSoon = useComingSoon();

  const go = (to: string) => {
    const hashIdx = to.indexOf("#");
    const path = hashIdx >= 0 ? to.slice(0, hashIdx) || "/" : to;
    const hash = hashIdx >= 0 ? to.slice(hashIdx) : "";
    if (hash && path === location.pathname) {
      scrollToHash(hash);
    } else {
      navigate(to);
    }
  };

  return (
    <footer className="bg-base/55 border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="TENDER logo" className="h-9 w-auto" />
              <span className="font-display font-semibold text-xl text-ink tracking-tight">
                TENDER®
              </span>
            </div>
            <p className="font-body text-secondary2 text-[17px] leading-relaxed max-w-sm">
              Get paid in the assets you'd rather hold.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => go(l.to)}
                    className="font-body text-[15px] text-secondary2 hover:text-red transition-colors duration-150"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-8 border-t border-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted2">
            © 2026 TENDER · Built by Infranodes
          </span>
          <div className="flex items-center gap-5">
            <a
              href="https://x.com/TenderRWA"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TENDER on X"
              className="text-secondary2 hover:text-red hover:-translate-y-1 transition-all duration-150"
            >
              <XIcon className="w-6 h-6" />
            </a>
            <button
              onClick={comingSoon.open}
              aria-label="TENDER on Telegram"
              className="text-secondary2 hover:text-red hover:-translate-y-1 transition-all duration-150"
            >
              <TelegramIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
