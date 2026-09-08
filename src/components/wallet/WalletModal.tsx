import { useConnect } from "@wallet-standard/react";
import type { UiWallet, UiWalletAccount } from "@wallet-standard/ui";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useRailProfile } from "@/lib/rail";
import { useSolanaWallet, useWallet } from "@/lib/wallet/wallet-context";

const rowCls =
  "flex w-full items-center gap-3 rounded-xl border border-hairline/60 px-4 py-3 text-left transition-colors duration-150 hover:border-red disabled:opacity-40";

function RowShell({
  icon,
  name,
  status,
  onClick,
  disabled,
}: {
  icon?: string;
  name: string;
  status: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={rowCls}>
      {icon ? (
        <img src={icon} alt="" className="h-7 w-7 rounded-md" aria-hidden />
      ) : (
        <span className="h-7 w-7 rounded-md bg-raised" aria-hidden />
      )}
      <span className="min-w-0 flex-1 font-body text-sm text-foreground">{name}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
        {status}
      </span>
    </button>
  );
}

/**
 * Solana row. `useConnect` is a per-wallet hook, so each row has to be its own
 * component rather than a loop inside the modal.
 */
function SolanaWalletRow({
  wallet,
  onConnected,
  onError,
}: {
  wallet: UiWallet;
  onConnected: (account: UiWalletAccount) => void;
  onError: (message: string) => void;
}) {
  const [isConnecting, connect] = useConnect(wallet);

  const handleClick = async () => {
    onError("");
    try {
      // An already-authorized wallet exposes its accounts without a prompt.
      const accounts = wallet.accounts.length ? wallet.accounts : await connect();
      const account = accounts[0];
      if (!account) {
        onError(`${wallet.name} authorized no accounts.`);
        return;
      }
      onConnected(account);
    } catch (err) {
      onError(err instanceof Error ? err.message : `Could not connect to ${wallet.name}.`);
    }
  };

  return (
    <RowShell
      icon={wallet.icon}
      name={wallet.name}
      status={isConnecting ? "Connecting…" : wallet.accounts.length ? "Connected" : "Detected"}
      onClick={handleClick}
      disabled={isConnecting}
    />
  );
}

/**
 * Connect dialog for whichever rail is active.
 *
 * The two rails discover wallets differently — Wallet Standard registers them
 * asynchronously and connects per wallet; wagmi surfaces EIP-6963 providers as
 * connectors — so the list is built per rail rather than from one shared array.
 */
const WALLET_CONNECT_ICON = "https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Gradient/Icon.svg";
const METAMASK_ICON = "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg";
const COINBASE_ICON = "https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin_Primary.png";
const PHANTOM_ICON = "https://phantom.app/favicon.ico";
const RABBY_ICON = "https://rabby.io/assets/images/logo.svg";

function getWalletIcon(name: string, fallback?: string): string | undefined {
  if (fallback) return fallback;
  const n = name.toLowerCase();
  if (n.includes("walletconnect")) return WALLET_CONNECT_ICON;
  if (n.includes("coinbase")) return COINBASE_ICON;
  if (n.includes("metamask")) return METAMASK_ICON;
  if (n.includes("phantom")) return PHANTOM_ICON;
  if (n.includes("rabby")) return RABBY_ICON;
  return undefined;
}

function getWalletStatus(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("walletconnect")) return "QR / Mobile";
  if (n.includes("coinbase")) return "App & Ext";
  return "Detected";
}

export default function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { rail, wallets, connect } = useWallet();
  const solana = useSolanaWallet();
  const profile = useRailProfile();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const connectEvm = async (id: string, name: string) => {
    setError("");
    try {
      await connect(id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not connect to ${name}.`);
    }
  };

  const empty =
    rail === "robinhood"
      ? "No EVM wallet detected. Install MetaMask, Rabby or Coinbase Wallet, or scan with WalletConnect."
      : "No Solana wallet detected. Install Phantom, Solflare or Backpack, then reload this page.";

  const hasWallets = rail === "robinhood" ? wallets.length > 0 : solana.wallets.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5 backdrop-blur-sm"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass w-full max-w-sm rounded-2xl p-5 md:p-6"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Connect a wallet on ${profile.network}`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                <span className="h-1.5 w-1.5 bg-red" aria-hidden />
                CONNECT WALLET
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded border border-hairline/60 text-lg leading-none text-muted2 transition-colors duration-150 hover:border-red hover:text-red"
              >
                ×
              </button>
            </div>

            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              {profile.network}
              {profile.chainId ? ` · chain ${profile.chainId}` : ""}
            </p>

            <div className="flex flex-col gap-2">
              {rail === "robinhood"
                ? wallets.map((wallet) => (
                    <RowShell
                      key={wallet.id}
                      icon={getWalletIcon(wallet.name, wallet.icon)}
                      name={wallet.name}
                      status={getWalletStatus(wallet.name)}
                      onClick={() => void connectEvm(wallet.id, wallet.name)}
                    />
                  ))
                : solana.wallets.map((wallet) => (
                    <SolanaWalletRow
                      key={wallet.name}
                      wallet={wallet}
                      onError={setError}
                      onConnected={(account) => {
                        solana.select(account);
                        onClose();
                      }}
                    />
                  ))}
            </div>

            {!hasWallets && (
              <p className="font-body text-sm leading-relaxed text-muted2">{empty}</p>
            )}

            {error && (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-red">
                {error}
              </p>
            )}

            <p className="mt-5 border-t border-hairline/60 pt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-muted2">
              NON-CUSTODIAL · TENDER NEVER HOLDS YOUR KEYS
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
