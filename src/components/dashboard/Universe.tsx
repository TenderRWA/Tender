import { useMemo, useState } from "react";

import ModulePage from "@/components/dashboard/ModulePage";
import DashTable, { DashRow, DashCell, StatusPill } from "@/components/dashboard/DashTable";
import { useAssets, useRailProfile } from "@/hooks/useTender";

const truncateAddress = (addr: string) =>
  addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr || "—";

export default function Universe() {
  const profile = useRailProfile();
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useAssets({ q: query.trim(), limit: 60 });

  const baseCurrencies = data?.baseCurrencies ?? [];
  const featured = data?.featured ?? [];

  const rows = useMemo(() => {
    if (!data) return [];
    const catalog = data.all ?? [...baseCurrencies, ...featured];
    const seen = new Set<string>();
    return catalog.filter((token) => {
      const key = token?.address || token?.symbol;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data, baseCurrencies, featured]);

  return (
    <ModulePage
      index="06"
      label="UNIVERSE"
      title="The eligible universe."
      blurb={`Assets admitted for election settlement on ${profile.network}. Admission requires live pool depth on ${profile.venueLabel} and a working safe-settle path to ${profile.defaultPayToken}.`}
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
            {profile.id === "solana" ? "FEATURED XSTOCKS" : "FEATURED EQUITIES"}
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
        placeholder={`Search the registry — SPCX, NVDA, AAPL, ${profile.addressLabel.toLowerCase()}…`}
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
        columns={[profile.addressLabel, "Symbol", "Name", "Underlying", "Decimals", "Class"]}
        minWidth="min-w-[720px]"
      >
        {rows.map((token) => (
          <DashRow key={token.address || token.symbol}>
            <DashCell className="font-mono text-xs text-muted2">
              <a
                href={profile.explorer.token(token.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-red transition-colors"
                title={token.address}
              >
                {truncateAddress(token.address)}
              </a>
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
                label={token.isBaseCurrency || token.isNative ? "base" : token.assetType || "eligible"}
              />
            </DashCell>
          </DashRow>
        ))}
      </DashTable>

      <p className="font-body text-sm text-muted2 max-w-2xl">
        Suspended assets stay payable: incoming payments earmarked for them safe-settle to {profile.defaultPayToken}
        until depth and venue health are restored.
      </p>
    </ModulePage>
  );
}
