import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import DashSidebar from "@/components/dashboard/DashSidebar";
import XAuthGate from "@/components/dashboard/XAuthGate";
import { useWallet } from "@/lib/wallet/wallet-context";
import { useXAccount } from "@/hooks/useTender";
import { CheckCircle2, X } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  head: () => ({
    meta: [
      { title: "Terminal | TENDER" },
      {
        name: "description",
        content:
          "The TENDER terminal: payments, elections, invoices, payroll, universe and staking.",
      },
      { property: "og:title", content: "Terminal | TENDER" },
      { property: "og:description", content: "Live settlement modules on the TENDER rail." },
    ],
  }),
});

function DashboardLayout() {
  const { address, connected } = useWallet();
  const { data: xData, isLoading: isCheckingX } = useXAccount(address);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [linkedUser, setLinkedUser] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("x_linked") === "true") {
        setShowSuccessBanner(true);
        setLinkedUser(params.get("x_user"));
        // Clean query params from URL without reload
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  const isWalletConnected = Boolean(address);
  const isXBound = Boolean(xData?.linked);

  return (
    <div className="dash-aurora">
      <div className="mx-auto max-w-container px-5 md:px-10 pb-10 md:pb-16">
        {/* Success toast after OAuth callback */}
        {showSuccessBanner && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold">𝕏 Account Verified!</span>{" "}
                {linkedUser ? `@${linkedUser}` : "Your 𝕏 account"} is now permanently bound to your Solana wallet. Terminal unlocked.
              </div>
            </div>
            <button
              onClick={() => setShowSuccessBanner(false)}
              className="p-1 text-emerald-400/70 hover:text-emerald-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
          <DashSidebar />
          <div className="flex-1 min-w-0 w-full">
            {isWalletConnected && isCheckingX ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 mx-auto border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-xs font-mono text-muted2">Verifying 𝕏 authorization status...</p>
              </div>
            ) : isWalletConnected && !isXBound ? (
              <XAuthGate wallet={address!} />
            ) : (
              <Outlet />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
