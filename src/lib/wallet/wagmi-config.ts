import { createConfig, http } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

import { robinhoodChain } from "@/lib/robinhoodChain";

const wcProjectId =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID) ||
  (typeof process !== "undefined" && process.env?.VITE_WALLETCONNECT_PROJECT_ID) ||
  "";

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: "TENDER" }),
    ...(wcProjectId
      ? [
          walletConnect({
            projectId: wcProjectId,
            showQrModal: true,
            metadata: {
              name: "TENDER",
              description: "Receive-Side RWA Settlement Engine",
              url: "https://tenderrwa.com",
              icons: ["https://tenderrwa.com/favicon.ico"],
            },
          }),
        ]
      : []),
  ],
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

