import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { robinhoodChain } from "@/lib/robinhoodChain";

/**
 * Wagmi config for the Robinhood rail.
 *
 * Only `injected` is registered explicitly. Wagmi's EIP-6963 discovery is on by
 * default, so every browser wallet that announces itself (MetaMask, Rabby,
 * Coinbase Wallet, Brave, Phantom's EVM provider) shows up as its own connector
 * with its own name and icon — no per-wallet entry needed here, and no
 * WalletConnect project id to provision.
 *
 * `ssr: true` keeps wagmi from touching localStorage during the server render.
 */
export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [robinhoodChain.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
