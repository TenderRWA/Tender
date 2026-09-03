import { useState, useEffect } from "react";
import { ShieldCheck, Sparkles, LogOut, ArrowRight, AlertCircle } from "lucide-react";
import { useWallet } from "@/lib/wallet/wallet-context";

interface XAuthGateProps {
  wallet: string;
}

export default function XAuthGate({ wallet }: XAuthGateProps) {
  const { disconnect, signMessage } = useWallet();
  const [isSigning, setIsSigning] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("x_error");
      if (err) {
        setUrlError(decodeURIComponent(err));
      }
    }
  }, []);

  const handleAuthorize = async () => {
    setSignError(null);
    setIsSigning(true);

    try {
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 10);
      const message = `Sign to authenticate wallet ownership with TENDER and bind your 𝕏 (@Twitter) identity.\n\nWallet: ${wallet}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

      // Prompt wallet to sign message proving ownership
      const signature = await signMessage(message);

      setIsSigning(false);
      setIsRedirecting(true);

      const apiBase =
        import.meta.env.VITE_API_URL ||
        import.meta.env.TENDER_API_URL ||
        "https://api.tenderrwa.com";

      const currentUrl = window.location.origin + window.location.pathname;
      const loginUrl = `${apiBase}/api/v1/auth/x/login?wallet=${encodeURIComponent(
        wallet
      )}&signature=${encodeURIComponent(signature)}&message=${encodeURIComponent(
        message
      )}&return_url=${encodeURIComponent(currentUrl)}`;

      window.location.href = loginUrl;
    } catch (err: any) {
      setIsSigning(false);
      setIsRedirecting(false);
      console.warn("Wallet message signing error:", err);
      setSignError(err?.message || "Signature was rejected in your wallet. Please sign to proceed.");
    }
  };

  const shortWallet = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d12]/90 backdrop-blur-xl p-6 md:p-10 shadow-2xl my-4">
      {/* Decorative gradient orb */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-xl mx-auto text-center space-y-6">
        {/* X Logo & Lock Icon Badge */}
        <div className="inline-flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
              <span className="text-3xl font-black text-white tracking-tighter">𝕏</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-black border-2 border-[#0c0d12]">
              <ShieldCheck className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            STEP 2 OF 2: IDENTITY BINDING
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
            Bind your 𝕏 Account to Enter
          </h2>
          <p className="text-sm md:text-base text-muted2 leading-relaxed">
            TENDER requires a verified 𝕏 (Twitter) account bound to your Solana wallet to unlock your settlement terminal, protect your handles from squatters, and enable receive-side timeline routing via{" "}
            <span className="text-white font-mono font-medium">@TenderRWABot</span>.
          </p>
        </div>

        {/* Error notice if signature fails or redirected back with error */}
        {(signError || urlError) && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red/10 border border-red/20 text-left text-xs text-red">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Verification failed:</span> {signError || urlError}.
            </div>
          </div>
        )}

        {/* Wallet Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-muted2">
          <span>Connected Wallet:</span>
          <span className="text-white font-medium">{shortWallet}</span>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left pt-2">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-white">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Timeline Settlement Routing</span>
            </div>
            <p className="text-[11px] text-muted2 leading-normal">
              Users on X can pay your Twitter handle directly; stocks land straight in this Solana wallet.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cryptographic Proof</span>
            </div>
            <p className="text-[11px] text-muted2 leading-normal">
              You sign an on-chain proof of ownership. Nobody can spoof or claim your address without your key.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="pt-3 space-y-3">
          <button
            onClick={handleAuthorize}
            disabled={isSigning || isRedirecting}
            className="w-full h-12 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-white/10 disabled:opacity-60"
          >
            {isSigning ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>1. Sign message in your wallet...</span>
              </span>
            ) : isRedirecting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>2. Redirecting to 𝕏...</span>
              </span>
            ) : (
              <>
                <span className="text-base font-black">𝕏</span>
                <span>Sign & Authorize with 𝕏 (Twitter)</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          <button
            onClick={() => disconnect()}
            className="w-full text-center text-xs text-muted2 hover:text-white transition-colors flex items-center justify-center gap-1.5 pt-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect or switch wallet</span>
          </button>
        </div>

        <p className="text-[11px] text-muted2/60">
          We only request read-only access to verify your username and numeric ID. TENDER will never post or modify your account.
        </p>
      </div>
    </div>
  );
}
