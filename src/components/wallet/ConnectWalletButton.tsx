import { useState } from "react";

import WalletModal from "@/components/wallet/WalletModal";
import { useRailProfile } from "@/lib/rail";
import { useWallet } from "@/lib/wallet/wallet-context";

const truncate = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

const pillCls =
  "inline-flex h-9 items-center gap-2 whitespace-nowrap shrink-0 rounded-full border px-3.5 font-mono text-[12px] tracking-[0.1em] uppercase transition-colors duration-150";

/**
 * Connect / disconnect control. Renders the connected wallet's own icon and a
 * truncated address once an account is selected.
 *
 * On the Robinhood rail a wallet can be connected but parked on another chain,
 * which would send settlement transactions to the wrong network — so that state
 * gets its own affordance rather than looking like a healthy connection.
 */
export default function ConnectWalletButton({ className = "" }: { className?: string }) {
  const { address, walletName, walletIcon, disconnect, wrongNetwork, switchNetwork } = useWallet();
  const profile = useRailProfile();
  const [open, setOpen] = useState(false);

  if (address && wrongNetwork) {
    return (
      <>
        <button
          type="button"
          onClick={() => void switchNetwork()}
          title={`${walletName} is on the wrong network — click to switch to ${profile.network}`}
          className={`${pillCls} border-warning/50 bg-warning/10 text-warning hover:border-warning ${className}`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
          <span>Switch to {profile.label}</span>
        </button>
        <WalletModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      {address ? (
        <button
          type="button"
          onClick={() => void disconnect()}
          title={`${walletName} · ${address} on ${profile.network} — click to disconnect`}
          className={`${pillCls} border-hairline text-ink/75 hover:border-red hover:text-ink ${className}`}
        >
          {walletIcon && (
            <img src={walletIcon} alt="" className="h-4 w-4 shrink-0 rounded" aria-hidden />
          )}
          <span>{truncate(address)}</span>
          <span className="text-muted2">· Disconnect</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${pillCls} border-hairline text-ink/75 hover:border-red hover:text-ink ${className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
          CONNECT WALLET
        </button>
      )}

      <WalletModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
