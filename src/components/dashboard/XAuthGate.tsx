import { useState, useEffect } from "react";
import ModulePage from "@/components/dashboard/ModulePage";
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
      setSignError(
        err?.message?.includes("User rejected")
          ? "Signature was rejected in your wallet. Please sign to authenticate."
          : err?.message || "Signature failed in your wallet. Please try again."
      );
    }
  };

  const shortWallet = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;

  return (
    <ModulePage
      index="00"
      label="IDENTITY"
      title="Bind your 𝕏 account."
      blurb="Authenticate wallet ownership and bind your Twitter identity to activate receive-side portfolio settlement routing."
    >
      {/* Notice Card */}
      <div className="glass rounded-2xl p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-red flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />
            AUTHENTICATION REQUIRED
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] border border-hairline/80 rounded-full px-2.5 py-1 text-secondary2">
            STEP 2 OF 2
          </span>
        </div>
        <p className="font-body text-[15px] md:text-base leading-[1.65] text-foreground max-w-prose">
          To access the terminal, eliminate sybil handle squatting, and allow{" "}
          <span className="font-mono font-medium text-foreground">@TenderRWABot</span> to slice incoming timeline payments directly into your custom stock portfolio, verify your wallet with your 𝕏 account.
        </p>
      </div>

      {/* Session Metadata Grid */}
      <div className="glass rounded-2xl p-6 md:p-8 space-y-5">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
          SESSION CREDENTIALS
        </span>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div className="flex items-baseline justify-between gap-4 min-w-0 border-b border-hairline/60 pb-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              Connected Wallet
            </dt>
            <dd className="font-mono text-xs text-foreground truncate" title={wallet}>
              {shortWallet}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 min-w-0 border-b border-hairline/60 pb-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              Proof Mechanism
            </dt>
            <dd className="font-mono text-xs text-foreground">
              ed25519 Cryptographic Sign
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 min-w-0 border-b border-hairline/60 pb-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              Permission Scope
            </dt>
            <dd className="font-mono text-xs text-foreground">
              Read-Only (tweet.read, users.read)
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 min-w-0 border-b border-hairline/60 pb-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              Timeline Settlement Bot
            </dt>
            <dd className="font-mono text-xs text-red font-semibold">
              @TenderRWABot
            </dd>
          </div>
        </dl>
      </div>

      {/* Error Notice */}
      {(signError || urlError) && (
        <div className="rounded-xl bg-red/10 border border-red/30 p-4 flex items-start gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-red shrink-0 mt-2" />
          <div className="text-xs font-mono text-red leading-relaxed">
            <span className="font-bold">VERIFICATION NOTICE:</span> {signError || urlError}
          </div>
        </div>
      )}

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
        <button
          type="button"
          disabled={isSigning || isRedirecting}
          onClick={handleAuthorize}
          className={`font-body font-semibold text-sm uppercase tracking-[0.08em] rounded-xl px-8 py-3.5 flex items-center justify-center gap-2.5 transition-all duration-150 ${
            isSigning || isRedirecting
              ? "bg-hairline text-muted2 cursor-not-allowed"
              : "bg-red hover:bg-red-hover text-white hover:-translate-y-0.5 shadow-md shadow-red/15"
          }`}
        >
          {isSigning ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>SIGNING IN WALLET…</span>
            </>
          ) : isRedirecting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>REDIRECTING TO 𝕏…</span>
            </>
          ) : (
            <>
              <span className="text-base font-black leading-none">𝕏</span>
              <span>SIGN & AUTHORIZE WITH 𝕏</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => disconnect()}
          className="font-body text-xs text-muted2 hover:text-foreground transition-colors py-2 px-3"
        >
          Disconnect or switch wallet
        </button>
      </div>
    </ModulePage>
  );
}
