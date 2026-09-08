import React, { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { checkXBindingStatus, XStatusResponse } from "../lib/api";
import { formatAddress } from "../lib/utils";
import { ExternalLink, Sparkles, Wallet, RefreshCw } from "lucide-react";

interface AuthGateProps {
  children: (props: { xUsername: string | null; wallet: string }) => React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [isCheckingX, setIsCheckingX] = useState(false);
  const [xData, setXData] = useState<XStatusResponse | null>(null);

  const mainAppUrl = import.meta.env.VITE_MAIN_APP_URL || "https://tenderrwa.com";

  // Check 𝕏 binding status whenever wallet changes
  useEffect(() => {
    if (!isConnected || !address) {
      setXData(null);
      return;
    }

    let isMounted = true;
    setIsCheckingX(true);

    checkXBindingStatus(address)
      .then((res) => {
        if (isMounted) setXData(res);
      })
      .finally(() => {
        if (isMounted) setIsCheckingX(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isConnected, address]);

  // 1. Wallet Connection Gate
  if (!isConnected || !address) {
    const handleConnect = () => {
      const target =
        connectors.find((c) => c.name.toLowerCase().includes("metamask")) || connectors[0];
      if (target) connect({ connector: target });
    };

    return (
      <div className="flex min-h-[75vh] items-center justify-center p-4">
        <div className="glass max-w-lg w-full rounded-2xl p-8 md:p-10 text-center space-y-6 shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-ink text-white flex items-center justify-center font-display font-black text-2xl shadow-md">
            T
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-red/20 bg-red/8 px-3 py-1 font-mono text-[11px] font-semibold text-red">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Robinhood Chain (4663)</span>
            </div>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-ink tracking-tight">
              Connect to TenderAI
            </h1>
            <p className="font-body text-sm text-secondary2 max-w-sm mx-auto">
              Conversational portfolio settlement copilot. Type natural commands to settle into
              custom stock mixes with zero custody.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleConnect}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-ink px-6 py-3.5 font-mono text-sm font-semibold text-white hover:bg-black transition-all shadow-sm"
            >
              <Wallet className="w-4 h-4 text-white/80" />
              <span>Connect Robinhood EVM Wallet</span>
            </button>
            <p className="mt-3 text-[11px] font-mono text-muted2">
              Supports MetaMask, Rabby, Rainbow, Coinbase, and Injected Wallets
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Verifying 𝕏 state loader
  if (isCheckingX) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center p-4">
        <div className="glass max-w-md w-full rounded-2xl p-8 text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-hairline border-t-red rounded-full animate-spin" />
          <p className="font-mono text-xs text-secondary2">Verifying 𝕏 identity binding...</p>
        </div>
      </div>
    );
  }

  // 4. 𝕏 Binding Gate: If wallet is connected but 𝕏 is NOT linked
  const isLinked = Boolean(xData?.data?.linked ?? xData?.linked);
  const xUser = (xData?.data?.account?.xUsername ?? xData?.account?.xUsername) || null;

  if (!isLinked) {
    const redirectUrl = `${mainAppUrl}/dashboard?wallet=${address}&source=ai`;

    return (
      <div className="flex min-h-[75vh] items-center justify-center p-4">
        <div className="glass max-w-md w-full rounded-2xl p-8 text-center space-y-5 border-hairline/90 shadow-md">
          <div className="mx-auto w-12 h-12 rounded-xl bg-base border border-hairline flex items-center justify-center font-black text-xl text-ink shadow-xs">
            𝕏
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-bold text-xl text-ink">
              𝕏 Account Binding Required
            </h2>
            <p className="font-body text-xs text-secondary2 leading-relaxed">
              Your connected wallet{" "}
              <span className="font-mono font-medium text-ink bg-card2 px-1.5 py-0.5 rounded border border-hairline">
                {formatAddress(address)}
              </span>{" "}
              is not yet linked to an authorized 𝕏 handle on TENDER.
            </p>
            <p className="font-body text-xs text-secondary2 leading-relaxed">
              To prevent spoofing and enforce identity sovereignty, please visit{" "}
              <strong className="text-ink">tenderrwa.com</strong> to authenticate your 𝕏 account
              first.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <a
              href={redirectUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red px-5 py-3 font-mono text-xs font-semibold text-white hover:bg-red-hover transition-colors shadow-xs"
            >
              <span>Connect 𝕏 on tenderrwa.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => {
                setIsCheckingX(true);
                checkXBindingStatus(address)
                  .then((res) => setXData(res))
                  .finally(() => setIsCheckingX(false));
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-base px-4 py-2 font-mono text-xs text-secondary2 hover:text-ink transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>I've connected my 𝕏, check again</span>
            </button>

            <button
              onClick={() => disconnect()}
              className="w-full text-center text-xs font-mono text-muted2 hover:text-red transition-colors pt-1"
            >
              Switch or disconnect wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Authorized! Render Chat Terminal
  return <>{children({ xUsername: xUser, wallet: address })}</>;
}
