import React, { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { formatAddress } from "../lib/utils";
import { ExternalLink, Wallet, LogOut } from "lucide-react";
import ConnectWalletModal from "./ConnectWalletModal";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const mainAppUrl = import.meta.env.VITE_MAIN_APP_URL || "https://tenderrwa.com";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline/80 bg-base/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 group">
              <img src="/logo.png" alt="TENDER logo" className="h-8 w-auto object-contain" />
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-lg tracking-tight text-ink">
                  TENDER
                </span>
                <span className="rounded bg-red/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red">
                  AI
                </span>
              </div>
            </a>
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
                onClick={() => setShowWalletModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-red px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-red-hover transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-red/40"
              >
                <Wallet className="w-3.5 h-3.5 text-white/90" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <ConnectWalletModal open={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </>
  );
}
