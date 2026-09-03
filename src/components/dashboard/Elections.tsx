import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModulePage from "@/components/dashboard/ModulePage";
import AssetPicker from "@/components/dashboard/AssetPicker";
import { useHandle, useUpdateElections } from "@/hooks/useTender";
import { useTenderSession } from "@/lib/tender-session";
import { useWallet } from "@/lib/wallet/wallet-context";
import type { SolanaTokenInfo } from "@/types/tender";

interface ElectionRow {
  id: number;
  symbol: string;
  mint: string;
  pct: number;
}

export default function Elections() {
  const { handle } = useTenderSession();
  const { address: wallet } = useWallet();
  const { data, isLoading, error } = useHandle(handle);
  const save = useUpdateElections();

  const nextId = useRef(1);
  const [rows, setRows] = useState<ElectionRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);

  // Seed the editor from the handle's live allocation, and re-seed on handle change.
  useEffect(() => {
    if (!data) return;
    setRows(
      data.elections.map((election) => ({
        id: nextId.current++,
        symbol: election.symbol,
        mint: election.mint,
        pct: Math.round(election.basisPoints / 100),
      })),
    );
    setDirty(false);
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const total = useMemo(() => rows.reduce((s, r) => s + r.pct, 0), [rows]);
  const valid = total === 100 && rows.length > 0;
  const canSave = valid && dirty && handle.length > 0 && !save.isPending;

  const touch = () => {
    setDirty(true);
    save.reset();
  };

  const setPct = (id: number, pct: number) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, pct } : r)));
    touch();
  };

  const setAsset = (id: number, token: SolanaTokenInfo) => {
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, symbol: token.symbol, mint: token.mint } : r)),
    );
    touch();
  };

  const addRow = () => {
    setRows((rs) => [...rs, { id: nextId.current++, symbol: "", mint: "", pct: 0 }]);
    touch();
  };

  const removeRow = (id: number) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
    touch();
  };

  const submit = () => {
    if (!canSave) return;
    save.mutate({
      handle,
      ownerWallet: wallet ?? undefined,
      elections: rows.map((r) => ({
        symbol: r.symbol,
        mint: r.mint || undefined,
        basisPoints: r.pct * 100,
      })),
    });
    setDirty(false);
  };

  return (
    <ModulePage
      index="03"
      label="ELECTIONS"
      title="Choose what you hold."
      blurb="Your election defines how incoming payments settle: which assets, in what proportions. The rail executes the swaps atomically at receipt time."
    >
      {!handle && (
        <div className="glass rounded-2xl p-5 md:p-6">
          <p className="font-body text-sm text-secondary2">
            Set your handle in the terminal header to load and edit its election.
          </p>
        </div>
      )}

      {handle && isLoading && (
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted2">
          Loading @{handle} election…
        </p>
      )}

      {handle && error && (
        <div className="glass border-l-2 border-l-red rounded-2xl p-5 md:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-red">{error.message}</p>
        </div>
      )}

      {/* Editor */}
      <div className="glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-6 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            ELECTION EDITOR {handle ? `· @${handle}` : ""}
          </span>
          {/* TOTAL indicator pill */}
          <span
            className={`inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.12em] border rounded-full px-4 py-1.5 transition-colors duration-200 ${
              valid
                ? "text-success border-success/40 bg-success/5"
                : "text-red border-red/40 bg-red/5"
            }`}
            aria-live="polite"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${valid ? "bg-success" : "bg-red"}`}
              aria-hidden
            />
            TOTAL <span className="tabular-nums font-medium">{total}%</span>
            {valid ? "BALANCED" : "/ MUST EQUAL 100%"}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.98 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`grid grid-cols-1 sm:grid-cols-[140px_1fr_76px_32px] items-center gap-3 sm:gap-5 border border-hairline/60/60 rounded-xl px-4 py-4 glass-soft transition-colors duration-150 ${
                  dragging === row.id ? "border-red/50" : "hover:border-red/30"
                }`}
              >
                <AssetPicker
                  value={row.symbol}
                  onSelect={(token) => setAsset(row.id, token)}
                  label={`Asset for row ${row.symbol || "new"}`}
                />
                {/* Slider with red fill track */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={row.pct}
                  onChange={(e) => setPct(row.id, Number(e.target.value))}
                  onPointerDown={() => setDragging(row.id)}
                  onPointerUp={() => setDragging(null)}
                  onBlur={() => setDragging(null)}
                  className="w-full h-1.5 rounded-full appearance-none cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-red/40 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-base [&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-base"
                  style={{
                    background: `linear-gradient(to right, #E8322A ${row.pct}%, #E3E3E6 ${row.pct}%)`,
                  }}
                  aria-label={`${row.symbol} allocation percent`}
                />
                {/* Mono % chip */}
                <span
                  className={`justify-self-start sm:justify-self-end font-mono text-xs tabular-nums border rounded-full px-3 py-1 transition-colors duration-150 ${
                    dragging === row.id
                      ? "border-red text-red bg-red/5"
                      : "border-hairline/60 text-foreground"
                  }`}
                >
                  {row.pct}%
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  className="w-8 h-8 flex items-center justify-center border border-hairline/60 rounded font-mono text-muted2 hover:text-red hover:border-red disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 text-lg leading-none"
                  aria-label={`Remove ${row.symbol} row`}
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {rows.length === 0 && !isLoading && (
            <p className="font-body text-sm text-muted2">
              No active elections. Add a row to build an allocation.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addRow}
            className="border border-hairline/60 hover:border-red text-secondary2 hover:text-foreground font-body font-semibold text-sm uppercase tracking-[0.08em] px-6 py-3 rounded transition-colors duration-150"
          >
            + Add Row
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSave}
            className="bg-red hover:bg-red-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-body font-semibold text-sm uppercase tracking-[0.08em] px-8 py-3 rounded transition-all duration-150 hover:-translate-y-0.5"
          >
            {save.isPending ? "Saving..." : save.isSuccess && !dirty ? "Saved ✓" : "Save Election"}
          </button>
          {save.isSuccess && !dirty && (
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-success">
              ELECTION ACTIVE · APPLIES TO NEXT RECEIPT
            </span>
          )}
          {save.isError && (
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-red">
              {save.error.message}
            </span>
          )}
        </div>
      </div>
    </ModulePage>
  );
}
