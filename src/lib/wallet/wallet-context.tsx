/**
 * The wallet every component talks to.
 *
 * Both rails' providers are mounted at once, and `useWallet()` hands back
 * whichever one the active rail needs behind a single interface. A component
 * asks for `address`, `connected`, `disconnect` without knowing whether a
 * Solana account or an EVM account is behind them.
 *
 * The two signing paths stay distinct on purpose. A Solana settlement is a
 * base64 transaction the backend assembled and the wallet broadcasts; a
 * Robinhood settlement is a list of pre-built EVM calls the client sends one at
 * a time. Collapsing them into one method would hide a real difference in how
 * the two rails execute, so calling the wrong one throws with an explanation
 * rather than silently doing nothing.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useRail, type RailId } from "@/lib/rail";
import {
  EvmWalletProvider,
  useEvmWallet,
  type EvmTxRequest,
  type EvmWalletValue,
} from "@/lib/wallet/evm-wallet";
import {
  SolanaWalletProvider,
  useSolanaWallet,
  type SolanaWalletValue,
} from "@/lib/wallet/solana-wallet";

/** One connectable wallet, whichever rail it belongs to. */
export interface RailWalletOption {
  /** Opaque handle passed back to `connect`. */
  id: string;
  name: string;
  icon?: string;
}

export interface WalletContextValue {
  rail: RailId;
  /** Wallets the active rail can connect to right now. */
  wallets: RailWalletOption[];
  address: string | null;
  connected: boolean;
  walletName: string | null;
  walletIcon: string | null;
  isConnecting: boolean;
  /** Robinhood only: connected, but the wallet is on another chain. */
  wrongNetwork: boolean;
  connect: (walletId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  /** Robinhood only; a no-op on Solana, which has no chain to switch. */
  switchNetwork: () => Promise<void>;
  /** Solana only. Signs and broadcasts a backend-assembled transaction. */
  signAndSendBase64: (base64Transaction: string) => Promise<string>;
  /** Robinhood only. Broadcasts one pre-built EVM call, resolves to its hash. */
  sendTransaction: (tx: EvmTxRequest) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const wrongRail = (needed: RailId, method: string) => () => {
  throw new Error(`${method} is only available on the ${needed} rail. Switch rails first.`);
};

function buildValue(
  rail: RailId,
  solana: SolanaWalletValue,
  evm: EvmWalletValue,
): WalletContextValue {
  if (rail === "robinhood") {
    return {
      rail,
      wallets: evm.wallets.map((w) => ({ id: w.id, name: w.name, icon: w.icon })),
      address: evm.address,
      connected: evm.connected,
      walletName: evm.walletName,
      walletIcon: evm.walletIcon,
      isConnecting: evm.isConnecting,
      wrongNetwork: evm.wrongNetwork,
      connect: evm.connect,
      disconnect: evm.disconnect,
      switchNetwork: evm.switchToRobinhood,
      signAndSendBase64: wrongRail("solana", "signAndSendBase64"),
      sendTransaction: evm.sendTransaction,
      signMessage: evm.signMessage,
    };
  }

  return {
    rail,
    // Wallet Standard keys a wallet by its name, so that doubles as the id.
    wallets: solana.wallets.map((w) => ({ id: w.name, name: w.name, icon: w.icon })),
    address: solana.address,
    connected: solana.connected,
    walletName: solana.walletName,
    walletIcon: solana.walletIcon,
    isConnecting: false,
    wrongNetwork: false,
    connect: async (walletId) => {
      const wallet = solana.wallets.find((w) => w.name === walletId);
      if (!wallet) throw new Error("That wallet is no longer available.");
      const account = wallet.accounts[0];
      if (!account) {
        throw new Error(`${wallet.name} has not authorized an account yet.`);
      }
      solana.select(account);
    },
    disconnect: solana.disconnect,
    switchNetwork: async () => {},
    signAndSendBase64: solana.signAndSendBase64,
    sendTransaction: wrongRail("robinhood", "sendTransaction"),
    signMessage: solana.signMessage,
  };
}

/** Reads both providers and publishes the active rail's one. */
function RailWalletBridge({ children }: { children: ReactNode }) {
  const rail = useRail();
  const solana = useSolanaWallet();
  const evm = useEvmWallet();

  const value = useMemo(() => buildValue(rail, solana, evm), [rail, solana, evm]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function TenderWalletProvider({ children }: { children: ReactNode }) {
  return (
    <EvmWalletProvider>
      <SolanaWalletProvider>
        <RailWalletBridge>{children}</RailWalletBridge>
      </SolanaWalletProvider>
    </EvmWalletProvider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside <TenderWalletProvider>");
  return context;
}

/**
 * The Solana provider, reachable regardless of the active rail.
 *
 * Only the wallet modal needs this: connecting a Solana wallet goes through
 * Wallet Standard's per-wallet `useConnect`, which the neutral interface cannot
 * express.
 */
export { useSolanaWallet } from "@/lib/wallet/solana-wallet";
export type { EvmTxRequest } from "@/lib/wallet/evm-wallet";
