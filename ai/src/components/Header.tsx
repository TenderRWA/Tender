import React from "react";
import { useAccount, useDisconnect, useConnect } from "wagmi";
import { formatAddress } from "../lib/utils";
import { ExternalLink, Wallet, LogOut } from "lucide-react";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  const mainAppUrl = import.meta.env.VITE_MAIN_APP_URL || "https://tenderrwa.com";

  const handleConnect = () => {
    const metaMaskOrInjected =
      connectors.find((c) => c.name.toLowerCase().includes("metamask")) || connectors[0];
    if (metaMaskOrInjected) {
      connect({ connector: metaMaskOrInjected });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-hairline/80 bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-red flex items-center justify-center font-display font-black text-white text-base shadow-xs group-hover:bg-red-hover transition-colors">
              T
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg tracking-tight text-ink">
                TENDER
              </span>
              <span className="rounded bg-red/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red">
                AI
              </span>
            </div>
          </a>

          {/* Network Pill */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-hairline bg-card2/80 px-2.5 py-1 text-xs font-mono text-secondary2">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span>Robinhood Chain (4663)</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <a
            href={`${mainAppUrl}/dashboard`}
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono text-secondary2 hover:text-ink transition-colors px-2 py-1 rounded hover:bg-hairline/40"
          >
            Terminal App
            <ExternalLink className="w-3 h-3 text-muted2" />
          </a>

          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-hairline bg-base px-3 py-1.5 text-xs font-mono font-medium text-ink shadow-2xs">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span>{formatAddress(address)}</span>
              </div>
              <button
                onClick={() => disconnect()}
                title="Disconnect wallet"
                className="rounded-xl border border-hairline p-2 text-secondary2 hover:text-red hover:border-red/30 transition-colors shadow-2xs"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-black transition-all shadow-xs"
            >
              <Wallet className="w-3.5 h-3.5 text-white/80" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
