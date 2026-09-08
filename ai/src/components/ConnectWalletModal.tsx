import React, { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { X, Wallet, AlertCircle } from "lucide-react";

interface ConnectWalletModalProps {
  open: boolean;
  onClose: () => void;
}

const WALLET_ICONS: Record<string, string> = {
  metamask: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg",
  rainbow: "https://avatars.githubusercontent.com/u/48327834?s=200&v=4",
  coinbase: "https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin_Primary.png",
  rabby: "https://rabby.io/assets/images/logo.svg",
  walletconnect:
    "https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Gradient/Icon.svg",
};

function getWalletIcon(name: string): string | undefined {
  const low = name.toLowerCase();
  for (const [key, url] of Object.entries(WALLET_ICONS)) {
    if (low.includes(key)) return url;
  }
  return undefined;
}

export default function ConnectWalletModal({ open, onClose }: ConnectWalletModalProps) {
  const { connectors, connect, isPending } = useConnect();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Filter and deduplicate connectors
  const seen = new Set<string>();
  const uniqueConnectors = connectors.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const handleSelectConnector = async (connector: any) => {
    setError(null);
    try {
      await connect({ connector });
      onClose();
    } catch (err: any) {
      console.error("[ConnectWalletModal] Connection failed:", err);
      setError(err?.shortMessage || err?.message || `Failed to connect to ${connector.name}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="glass max-w-sm w-full rounded-2xl p-6 shadow-md border-hairline relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
              Connect Wallet
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-secondary2 hover:text-ink hover:bg-card2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtitle */}
        <p className="font-body text-xs text-secondary2 mb-4">
          Select your preferred wallet to connect to TenderAI.
        </p>

        {/* Connectors List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {uniqueConnectors.length > 0 ? (
            uniqueConnectors.map((c) => {
              const icon = getWalletIcon(c.name);
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectConnector(c)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between rounded-xl border border-hairline/80 bg-base p-3 font-body text-sm font-medium text-ink hover:border-red hover:bg-card2/50 transition-all shadow-2xs group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    {icon ? (
                      <img src={icon} alt="" className="w-6 h-6 rounded-md object-contain" />
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-card2 border border-hairline flex items-center justify-center text-secondary2 group-hover:text-red">
                        <Wallet className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="text-xs font-mono font-semibold">{c.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted2 uppercase tracking-wider group-hover:text-red">
                    Detected →
                  </span>
                </button>
              );
            })
          ) : (
            <div className="text-center py-6 text-xs font-mono text-muted2">
              No EVM wallet extensions detected. Please install MetaMask, Rabby, or Rainbow.
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 rounded-xl bg-red/10 border border-red/20 p-2.5 text-xs font-mono text-red flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
