import { useState } from "react";
import ModulePage from "@/components/dashboard/ModulePage";
import DashTable, { DashRow, DashCell } from "@/components/dashboard/DashTable";
import { VAULTS, ROSTER, formatUSD } from "@/components/dashboard/data";

type CrankState = "idle" | "running" | "done";

export default function Payroll() {
  const [crank, setCrank] = useState<Record<string, CrankState>>({});

  const runCrank = (id: string, roster: number) => {
    if (crank[id] === "running") return;
    setCrank((c) => ({ ...c, [id]: "running" }));
    window.setTimeout(() => {
      setCrank((c) => ({ ...c, [id]: "done" }));
      void roster;
    }, 1800);
    window.setTimeout(() => setCrank((c) => ({ ...c, [id]: "idle" })), 6000);
  };

  return (
    <ModulePage
      index="05"
      label="PAYROLL"
      title="Payroll vaults."
      blurb="Fund a vault once; the crank settles every roster handle on cycle, each receiver paid out in their own election."
    >
      {/* Vault cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {VAULTS.map((v) => {
          const state = crank[v.id] ?? "idle";
          return (
            <div
              key={v.id}
              className="glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-5 min-w-0 transition-all duration-200 "
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-secondary2">
                  <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
                  {v.id}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] border border-hairline/60 rounded-full px-2.5 py-1 text-muted2">
                  {v.cycle}
                </span>
              </div>
              <h3 className="font-display font-medium text-2xl tracking-[-0.02em] text-foreground">{v.name}</h3>
              {/* Cycle progress */}
              <div>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">Cycle progress</span>
                  <span className="font-mono text-xs tabular-nums text-red">{v.cyclePct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-hairline overflow-hidden" role="img" aria-label={`${v.name} cycle ${v.cyclePct}% elapsed`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-red-deep to-red" style={{ width: `${v.cyclePct}%` }} />
                </div>
              </div>
              <dl className="flex flex-col gap-2.5 border-t border-hairline/60 pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">Budget</dt>
                  <dd className="font-mono text-sm text-foreground">
                    {formatUSD(v.budget, 0)} {v.token}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">Next run</dt>
                  <dd className="font-mono text-xs text-secondary2">{v.nextRun}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">Roster</dt>
                  <dd className="font-mono text-sm text-foreground">{v.roster} handles</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => runCrank(v.id, v.roster)}
                disabled={state === "running"}
                className="mt-auto self-start bg-red hover:bg-red-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-body font-semibold text-sm uppercase tracking-[0.08em] px-6 py-3 rounded transition-colors duration-150"
              >
                {state === "running" ? "Crank running..." : state === "done" ? `Settled ${v.roster}/${v.roster} ✓` : "Run Crank"}
              </button>
              {state === "running" && (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-warning">
                  SETTLING ROSTER · SWAPS IN FLIGHT
                </p>
              )}
              {state === "done" && (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-success">
                  CRANK COMPLETE · {v.roster} RECEIPTS ISSUED
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Roster */}
      <DashTable caption={`ROSTER · ${ROSTER.length} HANDLES`} columns={["Handle", "Role", "Salary / Cycle", "Paid In", "Vault"]} minWidth="min-w-[720px]">
        {ROSTER.map((r) => (
          <DashRow key={r.handle + r.vault}>
            <DashCell className="text-foreground">{r.handle}</DashCell>
            <DashCell>{r.role}</DashCell>
            <DashCell className="font-mono text-xs text-foreground">
              {formatUSD(r.salary, 0)} {r.token}
            </DashCell>
            <DashCell className="font-mono text-xs">SPYx 50 + USDC 50</DashCell>
            <DashCell className="font-mono text-xs text-muted2">{r.vault}</DashCell>
          </DashRow>
        ))}
      </DashTable>
    </ModulePage>
  );
}
