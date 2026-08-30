import { useState } from "react";
import ModulePage from "@/components/dashboard/ModulePage";
import { useCountUp } from "@/components/dashboard/StatCard";
import { BUYBACKS, formatUSD } from "@/components/dashboard/data";

type TxState = "idle" | "pending" | "done";

export default function Staking() {
  const [staked, setStaked] = useState(124000);
  const [stakeState, setStakeState] = useState<TxState>("idle");
  const [unstakeState, setUnstakeState] = useState<TxState>("idle");
  const rewardsDisplay = useCountUp(3412.88, 1400);

  const run = (kind: "stake" | "unstake") => {
    const set = kind === "stake" ? setStakeState : setUnstakeState;
    const current = kind === "stake" ? stakeState : unstakeState;
    if (current === "pending") return;
    set("pending");
    window.setTimeout(() => {
      setStaked((s) => (kind === "stake" ? s + 10000 : Math.max(0, s - 10000)));
      set("done");
    }, 1500);
    window.setTimeout(() => set("idle"), 5000);
  };

  const btnBase =
    "font-body font-semibold text-sm uppercase tracking-[0.08em] px-8 py-3.5 rounded transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <ModulePage
      index="07"
      label="STAKING"
      title="Stake TENDER, earn the rail."
      blurb="Stakers earn a share of the 0.4% protocol fee, streamed from settlement flow and periodic buybacks."
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Stake card */}
        <div className="xl:col-span-7 glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-6 min-w-0 ">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-secondary2">
              <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
              TENDER STAKE
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] border border-success/40 rounded-full px-3 py-1 text-success">
              REWARDS STREAM ACTIVE
            </span>
          </div>
          {/* Big mono rewards figure with count-up */}
          <div className="glass-soft rounded-xl px-5 py-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              Rewards earned 30d
            </span>
            <p className="mt-2 font-mono font-medium text-4xl md:text-5xl leading-none tracking-[-0.03em] text-foreground tabular-nums">
              ${formatUSD(rewardsDisplay)}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              USD EQUIVALENT · FROM FEES + BUYBACKS
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">Staked</span>
              <p className="mt-2 font-mono font-medium text-3xl md:text-4xl text-foreground whitespace-nowrap">
                {formatUSD(staked, 0)}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">TENDER</p>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">Fee share</span>
              <p className="mt-2 font-mono font-medium text-3xl md:text-4xl text-red">0.31%</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">OF PROTOCOL FEES</p>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">Rewards 30d</span>
              <p className="mt-2 font-mono font-medium text-3xl md:text-4xl text-success">14.2%</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">ANNUALIZED</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => run("stake")}
              disabled={stakeState === "pending"}
              className={`${btnBase} bg-red hover:bg-red-hover text-white`}
            >
              {stakeState === "pending" ? "Staking..." : stakeState === "done" ? "Staked ✓" : "Stake 10,000 TENDER"}
            </button>
            <button
              type="button"
              onClick={() => run("unstake")}
              disabled={unstakeState === "pending" || staked <= 0}
              className={`${btnBase} border border-hairline/60 hover:border-red text-secondary2 hover:text-foreground`}
            >
              {unstakeState === "pending" ? "Unstaking..." : unstakeState === "done" ? "Unstaked ✓" : "Unstake 10,000"}
            </button>
          </div>
          {(stakeState === "done" || unstakeState === "done") && (
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-success">
              POSITION UPDATED · REWARDS STREAM ACTIVE
            </p>
          )}
        </div>

        {/* Buyback feed */}
        <div className="xl:col-span-5 glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-4 min-w-0">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            BUYBACK FEED
          </span>
          <ul className="flex flex-col">
            {BUYBACKS.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 border-b border-hairline/60 last:border-b-0 py-3.5 -mx-2 px-2 rounded hover:bg-raised transition-colors duration-150">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-foreground">
                    {formatUSD(b.amount, 0)} TENDER
                  </p>
                  <p className="font-body text-xs text-muted2 truncate">{b.source}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">{b.time}</p>
                  <p className="font-mono text-[10px] text-muted2">{b.tx}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="font-body text-xs text-muted2">
            Buybacks route 25% of protocol fees to open-market buybacks, streamed to stakers.
          </p>
        </div>
      </div>
    </ModulePage>
  );
}
