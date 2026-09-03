import { useState, useMemo } from "react";
import ModulePage from "@/components/dashboard/ModulePage";
import DashTable, {
  DashRow,
  DashCell,
  StatusPill,
  RECEIPT_TONE,
} from "@/components/dashboard/DashTable";
import { useAssets, useCreateInvoice, useInvoices } from "@/hooks/useTender";
import { useTenderSession } from "@/lib/tender-session";
import { useWallet } from "@/lib/wallet/wallet-context";
import type { InvoiceRecord } from "@/types/tender";
import { ExternalLink, Copy, Check } from "lucide-react";

const inputCls =
  "w-full glass-soft rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted2 focus:outline-none focus:border-red focus:ring-2 focus:ring-red/25 transition-all duration-150";

export default function Invoices() {
  const { handle: sessionHandle } = useTenderSession();
  const { address: wallet } = useWallet();
  const { data: assets } = useAssets({ featured: true });
  const create = useCreateInvoice();

  // Read persistent invoices from database for this handle and wallet
  const { data: dbData, isLoading } = useInvoices({
    handle: sessionHandle,
    wallet,
  });

  const baseCurrencies = assets?.baseCurrencies ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [mint, setMint] = useState("");
  const [memo, setMemo] = useState("");
  const [days, setDays] = useState("14");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const effectiveHandle = (recipient || sessionHandle).trim().replace(/^@/, "");
  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0 && effectiveHandle.length > 0;

  const invoices = useMemo<InvoiceRecord[]>(() => {
    return dbData?.invoices ?? [];
  }, [dbData]);

  const submit = () => {
    if (!valid || create.isPending) return;
    const chosenToken = baseCurrencies.find((b) => b.mint === mint);

    create.mutate(
      {
        recipientHandle: effectiveHandle,
        amount: parsed,
        tokenMint: mint || undefined,
        memo: memo.trim() || undefined,
        expiryMinutes: Math.max(1, Math.round(Number(days || 14) * 24 * 60)),
      },
      {
        onSuccess: () => {
          setAmount("");
          setMemo("");
          setFormOpen(false);
        },
      },
    );
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      /* clipboard blocked */
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
            {create.data.id} CREATED
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
        columns={["ID", "Amount", "Memo", "Expires", "Share Links", "Status"]}
        minWidth="min-w-[820px]"
      >
        {invoices.map((inv) => (
          <DashRow key={inv.id}>
            <DashCell className="font-mono text-xs text-foreground">
              <a
                href={inv.payUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-foreground hover:text-red transition-colors group"
              >
                <span>{inv.id}</span>
                <ExternalLink className="w-3 h-3 text-muted2 group-hover:text-red shrink-0" />
              </a>
            </DashCell>
            <DashCell className="font-mono text-xs font-semibold text-foreground">
              {Number(inv.amount).toLocaleString()}{" "}
              <span className="text-secondary2 font-normal">{inv.tokenSymbol || "USDC"}</span>
            </DashCell>
            <DashCell className="max-w-[200px] truncate text-muted2">
              {inv.memo || "—"}
            </DashCell>
            <DashCell className="font-mono text-xs text-muted2">
              {new Date(inv.expiresAt).toLocaleDateString()}
            </DashCell>
            <DashCell>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(inv.payUrl, `web-${inv.id}`)}
                  className="font-mono text-[10px] uppercase tracking-[0.12em] border border-hairline/80 hover:border-red text-secondary2 hover:text-foreground rounded-lg px-2.5 py-1 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  {copiedKey === `web-${inv.id}` ? (
                    <>
                      <Check className="w-3 h-3 text-success" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-muted2" />
                      <span>Web Link</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(inv.solanaPayUrl, `sol-${inv.id}`)}
                  className="font-mono text-[10px] uppercase tracking-[0.12em] border border-hairline/80 hover:border-red text-secondary2 hover:text-foreground rounded-lg px-2.5 py-1 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  {copiedKey === `sol-${inv.id}` ? (
                    <>
                      <Check className="w-3 h-3 text-success" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <span>Solana Pay</span>
                  )}
                </button>
              </div>
            </DashCell>
            <DashCell>
              <StatusPill tone={RECEIPT_TONE[inv.status] ?? "muted"} label={inv.status} />
            </DashCell>
          </DashRow>
        ))}
      </DashTable>

      {isLoading && (
        <p className="font-body text-sm text-muted2 py-4">
          Loading persistent invoices from the TENDER rail…
        </p>
      )}

      {!isLoading && invoices.length === 0 && (
        <p className="font-body text-sm text-muted2">
          No invoices recorded for this handle yet. Click "+ Create Invoice" to generate a shareable pay-link.
        </p>
      )}
    </ModulePage>
  );
}
