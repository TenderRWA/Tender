import { useConnect } from "@wallet-standard/react";
import type { UiWallet, UiWalletAccount } from "@wallet-standard/ui";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useWallet } from "@/lib/wallet/wallet-context";

/**
 * One row per detected wallet. `useConnect` is a per-wallet hook, so each row has
 * to be its own component rather than a loop inside the modal.
 */
function WalletRow({
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
    <button
      type="button"
      onClick={handleClick}
      disabled={isConnecting}
      className="flex w-full items-center gap-3 rounded-xl border border-hairline/60 px-4 py-3 text-left transition-colors duration-150 hover:border-red disabled:opacity-40"
    >
      {wallet.icon ? (
        <img src={wallet.icon} alt="" className="h-7 w-7 rounded-md" aria-hidden />
      ) : (
        <span className="h-7 w-7 rounded-md bg-raised" aria-hidden />
      )}
      <span className="min-w-0 flex-1 font-body text-sm text-foreground">{wallet.name}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
        {isConnecting ? "Connecting…" : wallet.accounts.length ? "Connected" : "Detected"}
      </span>
    </button>
  );
}

export default function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wallets, select } = useWallet();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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
            aria-label="Connect a Solana wallet"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
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

            <div className="flex flex-col gap-2">
              {wallets.map((wallet) => (
                <WalletRow
                  key={wallet.name}
                  wallet={wallet}
                  onError={setError}
                  onConnected={(account) => {
                    select(account);
                    onClose();
                  }}
                />
              ))}
            </div>

            {wallets.length === 0 && (
              <p className="font-body text-sm leading-relaxed text-muted2">
                No Solana wallet detected. Install Phantom, Solflare or Backpack, then reload this
                page.
              </p>
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
