import {
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
} from "@solana/wallet-standard-features";
import type { IdentifierString } from "@wallet-standard/base";
import { StandardDisconnect, type StandardDisconnectFeature } from "@wallet-standard/features";
import { useWallets } from "@wallet-standard/react";
import { getWalletAccountFeature, type UiWallet, type UiWalletAccount } from "@wallet-standard/ui";
import {
  getWalletAccountForUiWalletAccount,
  getWalletForHandle,
} from "@wallet-standard/ui-registry";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { base64ToBytes, bytesToBase58 } from "@/lib/solana-bytes";

/** Wallet Standard chain identifiers, keyed by the network name in VITE_SOLANA_NETWORK. */
const CHAIN_BY_NETWORK: Record<string, IdentifierString> = {
  "mainnet-beta": "solana:mainnet",
  mainnet: "solana:mainnet",
  devnet: "solana:devnet",
  testnet: "solana:testnet",
  localnet: "solana:localnet",
};

export const SOLANA_CHAIN: IdentifierString =
  CHAIN_BY_NETWORK[import.meta.env.VITE_SOLANA_NETWORK ?? "mainnet-beta"] ?? "solana:mainnet";

const STORAGE_KEY = "tender-wallet";

interface PersistedWallet {
  name: string;
  address: string;
}

function readPersisted(): PersistedWallet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedWallet) : null;
  } catch {
    return null;
  }
}

function writePersisted(value: PersistedWallet | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / storage disabled — selection just won't survive a reload */
  }
}

interface WalletContextValue {
  /** Detected wallets that can actually sign and send on our chain. */
  wallets: readonly UiWallet[];
  account: UiWalletAccount | null;
  address: string | null;
  walletName: string | null;
  walletIcon: string | null;
  select: (account: UiWalletAccount) => void;
  disconnect: () => Promise<void>;
  /** Signs and broadcasts a backend-assembled transaction; resolves to its base58 signature. */
  signAndSendBase64: (base64Transaction: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function supportsSigning(wallet: UiWallet): boolean {
  return (
    wallet.features.includes(SolanaSignAndSendTransaction) &&
    wallet.chains.some((chain) => chain === SOLANA_CHAIN)
  );
}

export function TenderWalletProvider({ children }: { children: ReactNode }) {
  const detected = useWallets();
  const [account, setAccount] = useState<UiWalletAccount | null>(null);

  const wallets = useMemo(() => detected.filter(supportsSigning), [detected]);

  // Wallets register asynchronously after hydration, so restoring the previous
  // selection has to react to the list rather than run once on mount. A wallet
  // that still lists the account has already authorized us: no connect needed.
  useEffect(() => {
    const persisted = readPersisted();
    if (!persisted) return;

    const wallet = wallets.find((w) => w.name === persisted.name);
    const match = wallet?.accounts.find((a) => a.address === persisted.address);

    setAccount((current) => {
      if (!current) return match ?? null;
      // Drop a selection the wallet has since revoked (disconnected in the extension).
      const stillLive = wallets
        .find((w) => w.name === persisted.name)
        ?.accounts.some((a) => a.address === current.address);
      return stillLive ? current : (match ?? null);
    });
  }, [wallets]);

  const select = useCallback((next: UiWalletAccount) => {
    setAccount(next);
    const wallet = getWalletForHandle(next);
    writePersisted({ name: wallet.name, address: next.address });
  }, []);

  const disconnect = useCallback(async () => {
    const current = account;
    setAccount(null);
    writePersisted(null);
    if (!current) return;

    const wallet = getWalletForHandle(current);
    const feature = wallet.features[StandardDisconnect] as
      StandardDisconnectFeature[typeof StandardDisconnect] | undefined;
    // Not every wallet implements standard:disconnect; dropping our reference is
    // the meaningful part either way.
    await feature?.disconnect();
  }, [account]);

  const signAndSendBase64 = useCallback(
    async (base64Transaction: string) => {
      if (!account) throw new Error("Connect a wallet before signing.");

      const feature = getWalletAccountFeature(
        account,
        SolanaSignAndSendTransaction,
      ) as SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction];

      const [output] = await feature.signAndSendTransaction({
        account: getWalletAccountForUiWalletAccount(account),
        chain: SOLANA_CHAIN,
        transaction: base64ToBytes(base64Transaction),
      });

      if (!output?.signature) throw new Error("Wallet returned no transaction signature.");
      return bytesToBase58(output.signature);
    },
    [account],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      wallets,
      account,
      address: account?.address ?? null,
      walletName: account ? getWalletForHandle(account).name : null,
      walletIcon: account ? getWalletForHandle(account).icon : null,
      select,
      disconnect,
      signAndSendBase64,
    }),
    [wallets, account, select, disconnect, signAndSendBase64],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside <TenderWalletProvider>");
  return context;
}
