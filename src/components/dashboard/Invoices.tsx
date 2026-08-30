import { useState } from "react";
import ModulePage from "@/components/dashboard/ModulePage";
import DashTable, { DashRow, DashCell, StatusPill, RECEIPT_TONE } from "@/components/dashboard/DashTable";
import { INVOICES, PAY_TOKENS, formatUSD } from "@/components/dashboard/data";
import type { Invoice } from "@/components/dashboard/data";

const inputCls =
  "w-full glass-soft rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted2 focus:outline-none focus:border-red focus:ring-2 focus:ring-red/25 transition-all duration-150";

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(INVOICES);
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState(PAY_TOKENS[0]);
  const [memo, setMemo] = useState("");
  const [days, setDays] = useState("14");
  const [created, setCreated] = useState<string | null>(null);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0 && memo.trim().length > 0;

  const create = () => {
    if (!valid) return;
    const expiry = new Date(Date.now() + Number(days || 14) * 86400000)
      .toISOString()
      .slice(0, 10);
    const id = `INV-${2042 + (invoices.length - INVOICES.length)}`;
    const inv: Invoice = { id, amount: parsed, token, memo: memo.trim(), expiry, status: "open" };
    setInvoices((list) => [inv, ...list]);
    setCreated(id);
    setAmount("");
    setMemo("");
    setFormOpen(false);
    window.setTimeout(() => setCreated(null), 4000);
  };

  return (
    <ModulePage
      index="04"
      label="INVOICES"
      title="Pay-links, on rails."
      blurb="Issue an invoice and share the link. Payers settle in whatever they hold; you receive your election, minus the 0.4% protocol fee."
    >
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setFormOpen((o) => !o)}
          className="bg-red hover:bg-red-hover text-white font-body font-semibold text-sm uppercase tracking-[0.08em] px-8 py-3.5 rounded transition-colors duration-150"
        >
          {formOpen ? "Cancel" : "+ Create Invoice"}
        </button>
        {created && (
          <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-success">
            <span className="w-1.5 h-1.5 bg-success" aria-hidden />
            {created} CREATED · LINK COPIED
          </span>
        )}
      </div>

      {formOpen && (
        <div className="glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-5 min-w-0">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            NEW INVOICE
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">AMOUNT</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="1500"
                className={inputCls}
                aria-label="Invoice amount"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">DENOMINATED IN</span>
              <select value={token} onChange={(e) => setToken(e.target.value)} className={inputCls} aria-label="Invoice token">
                {PAY_TOKENS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">MEMO</span>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Retainer: September"
                className={inputCls}
                aria-label="Invoice memo"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">EXPIRES IN (DAYS)</span>
              <input
                value={days}
                onChange={(e) => setDays(e.target.value)}
                inputMode="numeric"
                placeholder="14"
                className={inputCls}
                aria-label="Expiry in days"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={create}
            disabled={!valid}
            className="self-start bg-red hover:bg-red-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-body font-semibold text-sm uppercase tracking-[0.08em] px-8 py-3 rounded transition-colors duration-150"
          >
            Generate Pay-Link
          </button>
        </div>
      )}

      <DashTable caption={`PAY-LINKS · ${invoices.length}`} columns={["ID", "Amount", "Memo", "Expiry", "Status"]}>
        {invoices.map((inv) => (
          <DashRow key={inv.id}>
            <DashCell className="font-mono text-xs text-foreground">{inv.id}</DashCell>
            <DashCell className="font-mono text-xs text-foreground">
              {formatUSD(inv.amount)} {inv.token}
            </DashCell>
            <DashCell className="max-w-[220px] truncate">{inv.memo}</DashCell>
            <DashCell className="font-mono text-xs text-muted2">{inv.expiry}</DashCell>
            <DashCell>
              <StatusPill tone={RECEIPT_TONE[inv.status]} label={inv.status} />
            </DashCell>
          </DashRow>
        ))}
      </DashTable>
    </ModulePage>
  );
}
