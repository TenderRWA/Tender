import ModulePage from "@/components/dashboard/ModulePage";
import DashTable, { DashRow, DashCell, StatusPill, RECEIPT_TONE } from "@/components/dashboard/DashTable";
import { UNIVERSE, formatCompactUSD } from "@/components/dashboard/data";

export default function Universe() {
  const eligible = UNIVERSE.filter((a) => a.status === "eligible").length;
  return (
    <ModulePage
      index="06"
      label="UNIVERSE"
      title="The eligible universe."
      blurb="Assets admitted for election settlement. Admission requires minimum on-chain depth, a live oracle feed and a working safe-settle path to USDC."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="glass glass-interactive rounded-2xl p-5 md:p-6 transition-all duration-200 ">
          <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
            <span className="w-1.5 h-1.5 bg-success shrink-0" aria-hidden />
            ELIGIBLE
          </span>
          <p className="mt-3 font-mono font-medium text-4xl text-success">{eligible}</p>
        </div>
        <div className="glass glass-interactive rounded-2xl p-5 md:p-6 transition-all duration-200 ">
          <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
            <span className="w-1.5 h-1.5 bg-warning shrink-0" aria-hidden />
            SUSPENDED
          </span>
          <p className="mt-3 font-mono font-medium text-4xl text-warning">{UNIVERSE.length - eligible}</p>
        </div>
        <div className="glass glass-interactive rounded-2xl p-5 md:p-6 transition-all duration-200 ">
          <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
            <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
            COMBINED DEPTH
          </span>
          <p className="mt-3 font-mono font-medium text-4xl text-foreground">
            {formatCompactUSD(UNIVERSE.reduce((s, a) => s + a.depth, 0))}
          </p>
        </div>
      </div>

      <DashTable caption="ELIGIBLE ASSETS" columns={["Mint", "Symbol", "Name", "Depth USD", "24h", "Status"]} minWidth="min-w-[720px]">
        {UNIVERSE.map((a) => (
          <DashRow key={a.symbol}>
            <DashCell className="font-mono text-xs text-muted2">{a.mint}</DashCell>
            <DashCell className="font-mono text-sm text-red">{a.symbol}</DashCell>
            <DashCell className="text-foreground">{a.name}</DashCell>
            <DashCell className="font-mono text-xs text-foreground">{formatCompactUSD(a.depth)}</DashCell>
            <DashCell className={`font-mono text-xs ${a.change24h >= 0 ? "text-success" : "text-red"}`}>
              {a.change24h >= 0 ? "+" : ""}
              {a.change24h.toFixed(1)}%
            </DashCell>
            <DashCell>
              <StatusPill tone={RECEIPT_TONE[a.status]} label={a.status} />
            </DashCell>
          </DashRow>
        ))}
      </DashTable>

      <p className="font-body text-sm text-muted2 max-w-2xl">
        Suspended assets stay payable: incoming payments earmarked for them safe-settle to USDC until
        depth and oracle health are restored.
      </p>
    </ModulePage>
  );
}
