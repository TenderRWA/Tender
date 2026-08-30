import ModulePage from "@/components/dashboard/ModulePage";
import StatCard from "@/components/dashboard/StatCard";
import DashTable, { DashRow, DashCell, StatusPill, RECEIPT_TONE } from "@/components/dashboard/DashTable";
import { RECEIPTS, VOLUME_30D, STATUS_SPLIT, SPARKS, formatUSD } from "@/components/dashboard/data";

/** Settlement volume chart: gradient red bars with rounded tops + hover tooltip chips. */
function VolumeChart() {
  const max = Math.max(...VOLUME_30D);
  const total = VOLUME_30D.reduce((s, v) => s + v, 0);
  return (
    <div className="xl:col-span-8 glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col min-w-0 ">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
          SETTLEMENT VOLUME 30D
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
          TOTAL ${total.toLocaleString("en-US")}K · AVG ${Math.round(total / VOLUME_30D.length)}K/DAY
        </span>
      </div>
      <div
        className="flex-1 flex items-end gap-1 min-h-[190px]"
        role="img"
        aria-label="Red bar chart of daily settlement volume for the last 30 days"
      >
        {VOLUME_30D.map((v, i) => {
          const isMax = v === max;
          return (
            <div key={i} className="relative flex-1 flex flex-col justify-end self-stretch group">
              {/* Tooltip chip */}
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 whitespace-nowrap border border-hairline/60 bg-base rounded px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xs">
                <span className="text-muted2">D-{30 - i}</span> ${v}K
              </span>
              <div
                className={`w-full rounded-t-[3px] bg-gradient-to-t transition-all duration-150 group-hover:from-red group-hover:to-red ${
                  isMax ? "from-red-deep to-red" : "from-red-deep/60 to-red/70"
                }`}
                style={{ height: `${(v / max) * 190}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-hairline/60 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
        <span>D-30</span>
        <span className="text-red">PEAK ${max}K</span>
        <span>TODAY</span>
      </div>
    </div>
  );
}

/** Status donut: three-segment SVG ring + center total label + legend. */
function StatusDonut() {
  const r = 54;
  const c = 2 * Math.PI * r;
  const totalReceipts = 38642;
  let offset = 0;
  return (
    <div className="glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col items-center gap-7 h-full ">
      <span className="self-start font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
        SETTLEMENT STATUS
      </span>
      <div className="relative shrink-0">
        <svg viewBox="0 0 140 140" className="w-40 h-40 -rotate-90" role="img" aria-label="Settlement status split donut chart">
          <circle cx="70" cy="70" r={r} fill="none" strokeWidth="12" className="stroke-hairline" />
          {STATUS_SPLIT.map((s) => {
            const len = (s.value / 100) * c;
            const el = (
              <circle
                key={s.label}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="12"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        {/* Center total label (outside svg so it stays upright) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono font-medium text-2xl leading-none tracking-[-0.03em] text-foreground">
            {totalReceipts.toLocaleString("en-US")}
          </span>
          <span className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted2">
            RECEIPTS 30D
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-4 w-full">
        {STATUS_SPLIT.map((s) => (
          <div key={s.label} className="flex items-center gap-3 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="font-mono font-medium text-xl text-foreground w-14 shrink-0">{s.value}%</span>
            <span className="font-body text-sm text-secondary2 truncate">
              {s.label} <span className="text-muted2">· {s.note}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Overview() {
  return (
    <ModulePage
      index="01"
      label="OVERVIEW"
      title="The rail at a glance."
      blurb="Live view of settlement flow across your handles: volume, elections, receipts and system status for the last 30 days."
    >
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Total Settled" value={12408116} format={(n) => `$${formatUSD(n, 0)}`} delta="+18.2% / 30d" spark={SPARKS.settled} />
        <StatCard label="Active Handles" value={8214} delta="+412 this week" spark={SPARKS.handles} />
        <StatCard label="Elections Set" value={3109} delta="92% of handles" deltaTone="success" spark={SPARKS.elections} />
        <StatCard label="Receipts Today" value={1286} delta="peak 14:00 UTC" deltaTone="warning" spark={SPARKS.receipts} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <VolumeChart />
        <div className="xl:col-span-4 min-w-0">
          <StatusDonut />
        </div>
      </div>

      {/* Recent receipts */}
      <DashTable caption="RECENT RECEIPTS" columns={["Receipt", "Handle", "In", "Legs", "Fee", "Status", "Time"]} minWidth="min-w-[760px]">
        {RECEIPTS.slice(0, 5).map((r) => (
          <DashRow key={r.id}>
            <DashCell className="font-mono text-xs text-foreground">{r.id}</DashCell>
            <DashCell className="text-foreground">{r.handle}</DashCell>
            <DashCell className="font-mono text-xs">
              {formatUSD(r.inAmount)} {r.inToken}
            </DashCell>
            <DashCell className="font-mono text-xs">
              {r.legs.map((l) => `${l.asset} ${l.pct}%`).join(" + ")}
            </DashCell>
            <DashCell className="font-mono text-xs">${formatUSD(r.fee)}</DashCell>
            <DashCell>
              <StatusPill tone={RECEIPT_TONE[r.status]} label={r.status} />
            </DashCell>
            <DashCell className="font-mono text-xs text-muted2">{r.time}</DashCell>
          </DashRow>
        ))}
      </DashTable>
    </ModulePage>
  );
}
