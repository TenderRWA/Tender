import { create } from "zustand";
import { persist } from "zustand/middleware";

import { ROBINHOOD_CHAIN_ID, isEvmAddress } from "@/lib/robinhoodChain";

/**
 * TENDER runs two settlement rails side by side.
 *
 *   solana    — V1. Jupiter + Relay dual routing, Wallet Standard, SPL xStocks.
 *   robinhood — V2. Uniswap V4 on Robinhood Chain (4663), Wagmi/Viem, ERC-20
 *               tokenized equities.
 *
 * Everything downstream — which API prefix is called, which wallet stack is
 * mounted, which explorer a receipt links to — is derived from this one value,
 * so a rail is added by extending RAILS rather than by branching in components.
 */
export type RailId = "solana" | "robinhood";

export interface RailProfile {
  id: RailId;
  /** Short label for switchers and pills. */
  label: string;
  /** Full network name for prose and receipts. */
  network: string;
  apiPrefix: "/api/v1" | "/api/v2";
  /** EVM chain id; null on Solana, which has no numeric chain id. */
  chainId: number | null;
  /** Gas / native currency symbol. */
  nativeSymbol: string;
  /** Default settlement currency the composers open on. */
  defaultPayToken: string;
  /** What a token identifier is called on this rail, for labels. */
  addressLabel: string;
  /** The routing venues quotes come back from, for prose. */
  venueLabel: string;
  explorer: {
    name: string;
    tx: (id: string) => string;
    account: (id: string) => string;
    token: (id: string) => string;
  };
  isAddress: (value: string | null | undefined) => boolean;
}

/** Base58, 32-44 chars. */
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const isSolanaAddress = (value: string | null | undefined) =>
  SOLANA_ADDRESS_RE.test((value ?? "").trim());

export const RAILS: Record<RailId, RailProfile> = {
  solana: {
    id: "solana",
    label: "Solana",
    network: "Solana Mainnet-Beta",
    apiPrefix: "/api/v1",
    chainId: null,
    nativeSymbol: "SOL",
    defaultPayToken: "USDC",
    addressLabel: "Mint",
    venueLabel: "Jupiter + Relay",
    explorer: {
      name: "Solscan",
      tx: (id) => `https://solscan.io/tx/${id}`,
      account: (id) => `https://solscan.io/account/${id}`,
      token: (id) => `https://solscan.io/token/${id}`,
    },
    isAddress: isSolanaAddress,
  },
  robinhood: {
    id: "robinhood",
    label: "Robinhood",
    network: "Robinhood Chain",
    apiPrefix: "/api/v2",
    chainId: ROBINHOOD_CHAIN_ID,
    nativeSymbol: "ETH",
    defaultPayToken: "USDG",
    addressLabel: "Contract",
    venueLabel: "Uniswap V4",
    explorer: {
      name: "Blockscout",
      tx: (id) => `https://robinhoodchain.blockscout.com/tx/${id}`,
      account: (id) => `https://robinhoodchain.blockscout.com/address/${id}`,
      token: (id) => `https://robinhoodchain.blockscout.com/token/${id}`,
    },
    isAddress: isEvmAddress,
  },
};

export const RAIL_IDS: RailId[] = ["robinhood", "solana"];

interface RailStore {
  activeRail: RailId;
  setRail: (rail: RailId) => void;
}

/**
 * Persisted so a reload keeps the rail the user was working on. Robinhood is
 * the default for new sessions — it is the rail the product is moving to.
 */
export const useRailStore = create<RailStore>()(
  persist(
    (set) => ({
      activeRail: "robinhood",
      setRail: (activeRail) => set({ activeRail }),
    }),
    { name: "tender-rail" },
  ),
);

/** The active rail's id. */
export const useRail = (): RailId => useRailStore((s) => s.activeRail);

/** The active rail's full profile — explorer, labels, address validator. */
export const useRailProfile = (): RailProfile => RAILS[useRailStore((s) => s.activeRail)];

export const railProfile = (rail: RailId): RailProfile => RAILS[rail];
