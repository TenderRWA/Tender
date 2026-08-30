import { useMemo, useState } from "react";

import ModulePage from "@/components/dashboard/ModulePage";
import DashTable, { DashRow, DashCell, StatusPill } from "@/components/dashboard/DashTable";
import { useAssets } from "@/hooks/useTender";

const truncateMint = (mint: string) =>
  mint.length > 12 ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : mint;

export default function Universe() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useAssets({ q: query.trim(), limit: 60 });

  const baseCurrencies = data?.baseCurrencies ?? [];
  const featured = data?.featured ?? [];

  const rows = useMemo(() => {
    if (!data) return [];
    const catalog = data.assets ?? featured;
    const seen = new Set<string>();
    return [...baseCurrencies, ...catalog].filter((token) => {
      if (!token?.mint || seen.has(token.mint)) return false;
      seen.add(token.mint);
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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
            CATALOG SIZE
          </span>
          <p className="mt-3 font-mono font-medium text-4xl text-success">
            {data?.total ?? data?.count ?? (isLoading ? "…" : 0)}
          </p>
        </div>
        <div className="glass glass-interactive rounded-2xl p-5 md:p-6 transition-all duration-200 ">
          <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
            <span className="w-1.5 h-1.5 bg-warning shrink-0" aria-hidden />
            FEATURED XSTOCKS
          </span>
          <p className="mt-3 font-mono font-medium text-4xl text-warning">{featured.length}</p>
        </div>
        <div className="glass glass-interactive rounded-2xl p-5 md:p-6 transition-all duration-200 ">
          <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
            <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
            BASE CURRENCIES
          </span>
          <p className="mt-3 font-mono font-medium text-4xl text-foreground">
            {baseCurrencies.map((t) => t.symbol).join(" · ") || "—"}
          </p>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the registry — apple, NVDA, tesla, mint address…"
        aria-label="Search the asset registry"
        className="w-full glass-soft rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted2 focus:outline-none focus:border-red focus:ring-2 focus:ring-red/25 transition-all duration-150"
      />

      {error && (
        <div className="glass border-l-2 border-l-red rounded-2xl p-5 md:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-red">{error.message}</p>
        </div>
      )}

      <DashTable
        caption={`ELIGIBLE ASSETS · ${rows.length}${isLoading ? " · LOADING" : ""}`}
        columns={["Mint", "Symbol", "Name", "Underlying", "Decimals", "Class"]}
        minWidth="min-w-[720px]"
      >
        {rows.map((token) => (
          <DashRow key={token.mint}>
            <DashCell className="font-mono text-xs text-muted2">
              {truncateMint(token.mint)}
            </DashCell>
            <DashCell className="font-mono text-sm text-red">{token.symbol}</DashCell>
            <DashCell className="text-foreground">{token.name}</DashCell>
            <DashCell className="font-mono text-xs text-foreground">
              {token.underlyingTicker ?? "—"}
            </DashCell>
            <DashCell className="font-mono text-xs">{token.decimals}</DashCell>
            <DashCell>
              <StatusPill
                tone={token.isBaseCurrency || token.isNative ? "muted" : "success"}
                label={token.isBaseCurrency || token.isNative ? "base" : "eligible"}
              />
            </DashCell>
          </DashRow>
        ))}
      </DashTable>

      <p className="font-body text-sm text-muted2 max-w-2xl">
        Suspended assets stay payable: incoming payments earmarked for them safe-settle to USDC
        until depth and oracle health are restored.
      </p>
    </ModulePage>
  );
}
