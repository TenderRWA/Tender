import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { ExternalLink, Copy, Check, X, CheckCircle2, AlertCircle } from "lucide-react";

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

  // Local state to ensure newly created invoices appear in the table instantly
  const [localCreated, setLocalCreated] = useState<InvoiceRecord[]>([]);

  // Modals for success and error
  const [successModalInvoice, setSuccessModalInvoice] = useState<InvoiceRecord | null>(null);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);

  const effectiveHandle = (recipient || sessionHandle).trim().replace(/^@/, "");
  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0 && effectiveHandle.length > 0;

  // Merge DB invoices with locally created session invoices so nothing is missing
  const invoices = useMemo<InvoiceRecord[]>(() => {
    const fromDb = dbData?.invoices ?? [];
    const seen = new Set(fromDb.map((i) => i.id));
    const pendingLocal = localCreated.filter((i) => !seen.has(i.id));
    return [...pendingLocal, ...fromDb];
  }, [dbData, localCreated]);

  const submit = () => {
    if (!valid || create.isPending) return;

    create.mutate(
      {
        recipientHandle: effectiveHandle,
        amount: parsed,
        tokenMint: mint || undefined,
        memo: memo.trim() || undefined,
        expiryMinutes: Math.max(1, Math.round(Number(days || 14) * 24 * 60)),
        creatorWallet: wallet || undefined,
        creatorHandle: sessionHandle || undefined,
      },
      {
        onSuccess: (newInvoice) => {
          setLocalCreated((prev) => [newInvoice, ...prev]);
          setSuccessModalInvoice(newInvoice);
          setAmount("");
          setMemo("");
          setFormOpen(false);
        },
        onError: (err) => {
          setErrorModalMessage(err.message || "Failed to create invoice");
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

      {/* SUCCESS MODAL */}
      <AnimatePresence>
        {successModalInvoice && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setSuccessModalInvoice(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-hairline bg-card2 p-6 md:p-8 shadow-2xl glass space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-hairline">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-success/10 border border-success/30 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-medium text-foreground">
                      Invoice Created · On Rails
                    </h3>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                      Ready to share and settle
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessModalInvoice(null)}
                  className="rounded-lg p-1.5 text-muted2 hover:text-foreground hover:bg-base transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Invoice Summary Card */}
              <div className="p-4 rounded-xl bg-base/70 border border-hairline space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted2">Invoice ID</span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {successModalInvoice.id}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted2">Recipient</span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    @{successModalInvoice.recipientHandle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted2">Amount</span>
                  <span className="font-mono text-sm font-bold text-red">
                    {Number(successModalInvoice.amount).toLocaleString()}{" "}
                    {successModalInvoice.tokenSymbol || "USDC"}
                  </span>
                </div>
                {successModalInvoice.memo && (
                  <div className="flex items-center justify-between pt-1 border-t border-hairline/60">
                    <span className="font-mono text-xs text-muted2">Memo</span>
                    <span className="font-body text-xs text-foreground truncate max-w-[240px]">
                      {successModalInvoice.memo}
                    </span>
                  </div>
                )}
              </div>

              {/* Shareable Links */}
              <div className="space-y-3">
                <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2 block">
                  Shareable Web Checkout Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={successModalInvoice.payUrl}
                    className="w-full rounded-xl border border-hairline bg-base/80 px-3.5 py-2.5 font-mono text-xs text-foreground outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(successModalInvoice.payUrl, "modal-web")}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-red hover:bg-red-hover text-white font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
                  >
                    {copiedKey === "modal-web" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <a
                    href={successModalInvoice.payUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-2.5 rounded-xl border border-hairline hover:border-red text-muted2 hover:text-foreground transition-colors"
                    title="Open checkout page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2 block">
                  Solana Pay QR URI
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={successModalInvoice.solanaPayUrl}
                    className="w-full rounded-xl border border-hairline bg-base/80 px-3.5 py-2.5 font-mono text-xs text-foreground outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(successModalInvoice.solanaPayUrl, "modal-sol")}
                    className="shrink-0 px-4 py-2.5 rounded-xl glass-soft border border-hairline hover:border-red text-foreground font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
                  >
                    {copiedKey === "modal-sol" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-success" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSuccessModalInvoice(null)}
                className="w-full py-3.5 rounded-xl bg-base hover:bg-raised border border-hairline font-body font-semibold text-xs uppercase tracking-[0.08em] text-foreground transition-colors"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ERROR MODAL */}
      <AnimatePresence>
        {errorModalMessage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setErrorModalMessage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-red/30 bg-card2 p-6 shadow-2xl glass space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-hairline">
                <div className="flex items-center gap-2.5 text-red">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <h3 className="font-display text-base font-medium text-foreground">
                    Invoice Creation Failed
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorModalMessage(null)}
                  className="rounded-lg p-1 text-muted2 hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="font-body text-xs text-muted2 leading-relaxed">
                {errorModalMessage}
              </p>

              <button
                type="button"
                onClick={() => setErrorModalMessage(null)}
                className="w-full py-3 rounded-xl bg-red hover:bg-red-hover text-white font-body font-semibold text-xs uppercase tracking-[0.08em] transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModulePage>
  );
}
