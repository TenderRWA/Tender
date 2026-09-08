import { defineChain } from "viem";

/**
 * Robinhood Chain — an Arbitrum Orbit / Nitro L2 rollup.
 *
 * Both RPCs in the list are CORS-open, so the browser reaches them directly;
 * viem falls through to the second if the first is unreachable.
 */
export const ROBINHOOD_CHAIN_ID = 4663;

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.mainnet.chain.robinhood.com",
        "https://robinhood-rpc.publicnode.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Explorer",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});

/** 0x-prefixed, 40 hex characters. The v2 API rejects anything else. */
export const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export const isEvmAddress = (value: string | null | undefined) =>
  EVM_ADDRESS_RE.test((value ?? "").trim());

/** 0x-prefixed, 64 hex characters. */
export const isEvmTxHash = (value: string | null | undefined) =>
  /^0x[a-fA-F0-9]{64}$/.test((value ?? "").trim());
