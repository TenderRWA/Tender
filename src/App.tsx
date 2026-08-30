import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Split, 
  QrCode, 
  TrendingUp, 
  Wallet, 
  CheckCircle2, 
  Server
} from "lucide-react";

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  environment: string;
}

export default function App() {
  const [handle, setHandle] = useState("alex.sol");
  const [allocations, setAllocations] = useState([
    { symbol: "SPYx", name: "S&P 500 Tokenized ETF", percent: 60, color: "bg-emerald-500" },
    { symbol: "USDC", name: "USD Coin", percent: 30, color: "bg-blue-500" },
    { symbol: "GLDx", name: "Tokenized Gold", percent: 10, color: "bg-amber-500" },
  ]);

  const { data: healthData, isError, isLoading } = useQuery<HealthResponse>({
    queryKey: ["backend-health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("Health check failed");
      return res.json();
    },
    retry: 1,
  });

  return (
    <div className="min-h-screen flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Banner */}
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-black text-lg">
              T
            </div>
            <span className="font-bold text-xl tracking-tight">TENDER</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Solana RWA Rail
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>Backend:</span>
              {isLoading ? (
                <span className="text-yellow-400">checking...</span>
              ) : isError ? (
                <span className="text-muted-foreground">offline</span>
              ) : (
                <span className="text-emerald-400 font-mono">v{healthData?.version} ok</span>
              )}
            </div>

            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all shadow-lg shadow-emerald-500/10">
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <Zap className="w-3.5 h-3.5" /> Non-Custodial Receive-Side Settlement
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Get paid in the assets <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                you'd rather hold.
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Every payment rail asks the sender what to send. <span className="text-foreground font-medium">TENDER asks the receiver what they want to hold.</span> Senders pay in SOL, USDC, or SPL tokens; you receive your auto-rebalanced portfolio in a single atomic transaction.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all shadow-lg shadow-emerald-500/20">
                Claim Your Handle
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#how-it-works"
                className="px-6 py-3 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground font-semibold border border-border transition-all"
              >
                Read Specs
              </a>
            </div>

            <div className="pt-6 grid grid-cols-3 gap-6 border-t border-border/50 text-sm">
              <div>
                <div className="text-2xl font-bold text-foreground">~$5.8B</div>
                <div className="text-muted-foreground text-xs">Tokenized Stock Vol (Q2)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">100%</div>
                <div className="text-muted-foreground text-xs">Atomic & Non-Custodial</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">0 BPS</div>
                <div className="text-muted-foreground text-xs">Same-asset pay fee</div>
              </div>
            </div>
          </div>

          {/* Interactive Card */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <div className="text-xs text-muted-foreground font-mono">RECEIVER HANDLE</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">@{handle}</div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  ACTIVE ELECTION
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>Target Allocation</span>
                  <span>Split (%)</span>
                </div>

                {allocations.map((item, index) => (
                  <div key={index} className="space-y-1.5 p-3 rounded-xl bg-secondary/40 border border-border/40">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-foreground">{item.symbol}</span>
                      <span className="font-mono font-bold text-emerald-400">{item.percent}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{item.name}</div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Jupiter Atomic Routing + Slippage Caps</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Incoming payments in any SPL token swap atomically at receipt. Legs breaching slippage safe-settle in USDC.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Feature Grid */}
        <section id="how-it-works" className="mt-24 pt-12 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl bg-card/60 border border-border/50 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Auto-DCA Every Payday</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every invoice, salary payout, and tip converts instantly into your target RWA stock portfolio upon arrival.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card/60 border border-border/50 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Split className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Native Payout Splits</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Route a single incoming payment across multiple cofounders, each settling automatically in their own chosen mix.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card/60 border border-border/50 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Solana Pay Invoices</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Generate QR codes compatible with any Solana wallet; payments settle instantly into recipient-elected RWAs.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 TENDER. Non-custodial RWA settlement rail.</p>
          <div className="flex items-center gap-6">
            <a href="https://github.com/notadeveloper7/tender" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="/technical-docs/Tender Overview.pdf" target="_blank" className="hover:text-foreground transition-colors">
              Product Overview
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
