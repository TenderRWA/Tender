import { useState } from "react";

import ModulePage from "@/components/dashboard/ModulePage";
import DashTable, {
  DashRow,
  DashCell,
  StatusPill,
  RECEIPT_TONE,
} from "@/components/dashboard/DashTable";
import { useAssets, useCreateInvoice } from "@/hooks/useTender";
import { useTenderSession } from "@/lib/tender-session";
import type { InvoiceResponse } from "@/types/tender";

const inputCls =
  "w-full glass-soft rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted2 focus:outline-none focus:border-red focus:ring-2 focus:ring-red/25 transition-all duration-150";

export default function Invoices() {
  const { handle: sessionHandle } = useTenderSession();
  const { data: assets } = useAssets({ featured: true });
  const create = useCreateInvoice();

  const baseCurrencies = assets?.baseCurrencies ?? [];

  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [mint, setMint] = useState("");
  const [memo, setMemo] = useState("");
  const [days, setDays] = useState("14");
  const [copied, setCopied] = useState<string | null>(null);

  const effectiveHandle = (recipient || sessionHandle).trim();
  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0 && effectiveHandle.length > 0;

  const submit = () => {
    if (!valid || create.isPending) return;
    create.mutate(
      {
        recipientHandle: effectiveHandle,
        amount: parsed,
        tokenMint: mint || undefined,
        memo: memo.trim() || undefined,
        expiryMinutes: Math.max(1, Math.round(Number(days || 14) * 24 * 60)),
      },
      {
        onSuccess: (invoice) => {
          setInvoices((list) => [invoice, ...list]);
          setAmount("");
          setMemo("");
          setFormOpen(false);
        },
      },
    );
  };

  const copyPayUrl = async (invoice: InvoiceResponse) => {
    try {
      await navigator.clipboard.writeText(invoice.payUrl);
      setCopied(invoice.invoiceId);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      /* clipboard blocked — the URL is still shown in the row */
    }
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
        {create.isSuccess && !formOpen && (
          <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-success">
            <span className="w-1.5 h-1.5 bg-success" aria-hidden />
            {create.data.invoiceId} CREATED
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
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                RECIPIENT HANDLE
              </span>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={sessionHandle ? `@${sessionHandle}` : "@yourhandle"}
                className={inputCls}
                aria-label="Recipient handle"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                AMOUNT
              </span>
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
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                DENOMINATED IN
              </span>
              <select
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                className={inputCls}
                aria-label="Invoice token"
              >
                <option value="">USDC (default)</option>
                {baseCurrencies.map((t) => (
                  <option key={t.mint} value={t.mint}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                MEMO
              </span>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Retainer: September"
                className={inputCls}
                aria-label="Invoice memo"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                EXPIRES IN (DAYS)
              </span>
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
            onClick={submit}
            disabled={!valid || create.isPending}
            className="self-start bg-red hover:bg-red-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-body font-semibold text-sm uppercase tracking-[0.08em] px-8 py-3 rounded transition-colors duration-150"
          >
            {create.isPending ? "Generating…" : "Generate Pay-Link"}
          </button>
          {create.isError && (
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-red">
              {create.error.message}
            </p>
          )}
        </div>
      )}

      <DashTable
        caption={`PAY-LINKS · ${invoices.length}`}
        columns={["ID", "Amount", "Memo", "Expires", "Pay URL", "Status"]}
        minWidth="min-w-[760px]"
      >
        {invoices.map((inv) => (
          <DashRow key={inv.invoiceId}>
            <DashCell className="font-mono text-xs text-foreground">{inv.invoiceId}</DashCell>
            <DashCell className="font-mono text-xs text-foreground">{inv.amount}</DashCell>
            <DashCell className="max-w-[220px] truncate">{inv.memo}</DashCell>
            <DashCell className="font-mono text-xs text-muted2">
              {new Date(inv.expiresAt).toLocaleString("en-US", { hour12: false })}
            </DashCell>
            <DashCell>
              <button
                type="button"
                onClick={() => copyPayUrl(inv)}
                className="font-mono text-[10px] uppercase tracking-[0.12em] border border-hairline/60 hover:border-red text-secondary2 hover:text-foreground rounded-full px-3 py-1 transition-colors duration-150"
              >
                {copied === inv.invoiceId ? "Copied ✓" : "Copy Solana Pay link"}
              </button>
            </DashCell>
            <DashCell>
              <StatusPill tone={RECEIPT_TONE[inv.status] ?? "muted"} label={inv.status} />
            </DashCell>
          </DashRow>
        ))}
      </DashTable>

      {invoices.length === 0 && (
        <p className="font-body text-sm text-muted2">
          Invoices created in this session appear here with their Solana Pay URL. The API has no
          invoice-listing endpoint yet, so past pay-links are not read back.
        </p>
      )}
    </ModulePage>
  );
}
