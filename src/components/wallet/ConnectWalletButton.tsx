import { useState } from "react";

import WalletModal from "@/components/wallet/WalletModal";
import { useWallet } from "@/lib/wallet/wallet-context";

const truncate = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

/**
 * Connect / disconnect control. Renders the connected wallet's own icon and a
 * truncated address once an account is selected.
 */
export default function ConnectWalletButton({ className = "" }: { className?: string }) {
  const { address, walletName, walletIcon, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  return (
    <>
      {address ? (
        <button
          type="button"
          onClick={() => void disconnect()}
          title={`${walletName} · ${address} — click to disconnect`}
          className={`inline-flex h-9 items-center gap-2 whitespace-nowrap shrink-0 rounded-full border border-hairline px-3.5 font-mono text-[12px] tracking-[0.1em] text-ink/75 uppercase transition-colors duration-150 hover:border-red hover:text-ink ${className}`}
        >
          {walletIcon && <img src={walletIcon} alt="" className="h-4 w-4 rounded shrink-0" aria-hidden />}
          <span>{truncate(address)}</span>
          <span className="text-muted2">· Disconnect</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex h-9 items-center gap-2 rounded-full border border-hairline px-3.5 font-mono text-[12px] tracking-[0.1em] text-ink/75 uppercase transition-colors duration-150 hover:border-red hover:text-ink ${className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
          CONNECT WALLET
        </button>
      )}

      <WalletModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
