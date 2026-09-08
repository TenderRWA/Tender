/**
 * V2 rail wallet: Wagmi / Viem against Robinhood Chain (4663).
 *
 * Exposes the same surface the Solana provider does — a list of connectable
 * wallets, a selected address, a way to sign — so wallet-context.tsx can hand
 * either one to a component without the component knowing which rail it is on.
 */
import { useCallback, useMemo, type ReactNode } from "react";
import { WagmiProvider, useAccount, useConnect, useConnectors, useDisconnect, useSignMessage, useSendTransaction, useSwitchChain } from "wagmi";

import { ROBINHOOD_CHAIN_ID } from "@/lib/robinhoodChain";
import { wagmiConfig } from "@/lib/wallet/wagmi-config";

/** One connectable EVM wallet, shaped like the Solana provider's UiWallet rows. */
export interface EvmWalletOption {
  id: string;
  name: string;
  icon?: string;
  ready: boolean;
}

/** An unsigned EVM call, exactly as the V2 API's step items describe one. */
export interface EvmTxRequest {
  to: string;
  data?: string;
  value?: string;
  chainId?: number;
}

export interface EvmWalletValue {
  wallets: EvmWalletOption[];
  address: string | null;
  connected: boolean;
  walletName: string | null;
  walletIcon: string | null;
  chainId: number | undefined;
  /** True when the wallet is connected but pointed at the wrong network. */
  wrongNetwork: boolean;
  isConnecting: boolean;
  connect: (connectorId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  switchToRobinhood: () => Promise<void>;
  /** Broadcasts one transaction and resolves to its 0x hash. */
  sendTransaction: (tx: EvmTxRequest) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

export function EvmWalletProvider({ children }: { children: ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}

/**
 * Reads the wagmi state into the shared shape.
 *
 * This is a hook rather than a second React context: wagmi already holds the
 * state, and wrapping it again would only add a re-render layer.
 */
export function useEvmWallet(): EvmWalletValue {
  const account = useAccount();
  const connectors = useConnectors();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { sendTransactionAsync } = useSendTransaction();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();

  const wallets = useMemo<EvmWalletOption[]>(
    () =>
      connectors.map((c) => ({
        id: c.uid,
        name: c.name,
        icon: c.icon,
        ready: true,
      })),
    [connectors],
  );

  const activeConnector = account.connector;

  const connect = useCallback(
    async (connectorId: string) => {
      const connector = connectors.find((c) => c.uid === connectorId);
      if (!connector) throw new Error("That wallet is no longer available.");
      await connectAsync({ connector, chainId: ROBINHOOD_CHAIN_ID });
    },
    [connectAsync, connectors],
  );

  const disconnect = useCallback(async () => {
    await disconnectAsync();
  }, [disconnectAsync]);

  const switchToRobinhood = useCallback(async () => {
    await switchChainAsync({ chainId: ROBINHOOD_CHAIN_ID });
  }, [switchChainAsync]);

  const sendTransaction = useCallback(
    async (tx: EvmTxRequest) => {
      if (!account.address) throw new Error("Connect a wallet before signing.");
      // A wallet parked on another network would broadcast to the wrong chain,
      // so ask it to move first rather than letting the send silently land there.
      if (account.chainId !== ROBINHOOD_CHAIN_ID) {
        await switchChainAsync({ chainId: ROBINHOOD_CHAIN_ID });
      }
      return sendTransactionAsync({
        to: tx.to as `0x${string}`,
        data: (tx.data || undefined) as `0x${string}` | undefined,
        value: BigInt(tx.value || "0"),
        chainId: ROBINHOOD_CHAIN_ID,
      });
    },
    [account.address, account.chainId, sendTransactionAsync, switchChainAsync],
  );

  const signMessage = useCallback(
    async (message: string) => {
      if (!account.address) throw new Error("Connect a wallet before signing.");
      return signMessageAsync({ message });
    },
    [account.address, signMessageAsync],
  );

  return {
    wallets,
    address: account.address ?? null,
    connected: Boolean(account.address),
    walletName: activeConnector?.name ?? null,
    walletIcon: activeConnector?.icon ?? null,
    chainId: account.chainId,
    wrongNetwork: Boolean(account.address) && account.chainId !== ROBINHOOD_CHAIN_ID,
    isConnecting,
    connect,
    disconnect,
    switchToRobinhood,
    sendTransaction,
    signMessage,
  };
}
