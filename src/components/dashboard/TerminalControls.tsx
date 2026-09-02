import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import ConnectWalletButton from "@/components/wallet/ConnectWalletButton";
import { useHandleAvailability, useOwnerHandles } from "@/hooks/useTender";
import { useTenderSession } from "@/lib/tender-session";
import { useWallet } from "@/lib/wallet/wallet-context";
import { Check, Plus, ChevronDown, Sparkles } from "lucide-react";

type Tone = "success" | "warning" | "red" | "muted";

const DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  red: "bg-red",
  muted: "bg-muted2",
};

const TEXT: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  red: "text-red",
  muted: "text-muted2",
};

export default function TerminalControls() {
  const { handle, setHandle } = useTenderSession();
  const { address } = useWallet();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualHandle, setManualHandle] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data: ownerData } = useOwnerHandles(address);
  const ownedHandles = ownerData?.handles || [];

  // Auto-activate the first owned handle when wallet connects if no handle or mismatch
  useEffect(() => {
    if (address && ownedHandles.length > 0) {
      if (!handle || !ownedHandles.includes(handle)) {
        setHandle(ownedHandles[0]);
      }
    }
  }, [address, ownedHandles, handle, setHandle]);

  const { data: availability, isFetching } = useHandleAvailability(handle);
  const registered = availability?.registered ?? false;
  const owner = availability?.details?.ownerWallet;
  const isOwner = Boolean(owner && address && owner === address);

  const tooShort = handle.length > 0 && handle.length < 3;

  const status: { tone: Tone; label: string; hint: string } = !handle
    ? { tone: "warning", label: "NO HANDLE", hint: "Claim or select a handle to activate this terminal." }
    : tooShort
      ? { tone: "muted", label: `@${handle}`, hint: "Resolving handle…" }
      : isFetching
        ? { tone: "muted", label: `@${handle}`, hint: "Resolving on the rail…" }
        : !registered
          ? {
              tone: "warning",
              label: `@${handle}`,
              hint: "Not registered yet — claim it to elect a portfolio.",
            }
          : !address
            ? {
                tone: "warning",
                label: `@${handle}`,
                hint: "Connect the owner wallet to enable settlement writes.",
              }
            : isOwner
              ? {
                  tone: "success",
                  label: `@${handle}`,
                  hint: "Session ready — this wallet owns the handle.",
                }
              : {
                  tone: "red",
                  label: `@${handle}`,
                  hint: "This wallet does not own the handle. Writes will be rejected.",
                };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex items-center gap-3">
      <div ref={popoverRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          title={status.hint}
          className="inline-flex items-center gap-2 rounded-full border border-hairline/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-secondary2 transition-colors duration-150 hover:border-red hover:text-foreground"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${DOT[status.tone]}`} aria-hidden />
          <span className="max-w-[14ch] truncate">{status.label}</span>
          <ChevronDown className="h-3 w-3 text-muted2" />
        </button>

        {open && (
          <div
            data-lenis-prevent="true"
            className="glass absolute right-0 top-full z-20 mt-2 w-80 rounded-xl p-4 shadow-2xl border border-hairline"
          >
            {/* Wallet Owned Handles Section */}
            {address && ownedHandles.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-hairline">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                    Your Handles ({ownedHandles.length})
                  </span>
                  <span className="font-mono text-[9px] text-success font-medium">● CONNECTED</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {ownedHandles.map((h) => {
                    const isActive = handle === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          setHandle(h);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-xs transition-colors ${
                          isActive
                            ? "bg-red/15 border border-red/30 text-ink font-semibold"
                            : "hover:bg-base text-secondary2 hover:text-ink border border-transparent"
                        }`}
                      >
                        <span>@{h}</span>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red font-medium">
                            <Check className="h-3.5 w-3.5" /> ACTIVE
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted2">Switch</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/dashboard/claim");
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-hairline py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted2 hover:border-red hover:text-ink transition-colors"
                >
                  <Plus className="h-3 w-3 text-red" />
                  Claim New Handle
                </button>
              </div>
            ) : address ? (
              <div className="space-y-3 text-center py-2">
                <p className="font-body text-xs text-secondary2">
                  No handles registered to this wallet yet.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/dashboard/claim");
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-red py-2 font-body text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-red-hover transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Claim a Handle
                </button>
              </div>
            ) : (
              <div className="text-center py-2 space-y-2">
                <p className="font-body text-xs text-muted2">
                  Connect your wallet to auto-load your handles.
                </p>
              </div>
            )}

            {/* Manual Handle Override Toggle */}
            <div className="mt-3 pt-3 border-t border-hairline/60">
              {!showManualInput ? (
                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="w-full text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 hover:text-ink transition-colors"
                >
                  + Enter custom handle manually
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualHandle.trim()) {
                      setHandle(manualHandle.trim());
                      setOpen(false);
                      setShowManualInput(false);
                    }
                  }}
                  className="space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. alice"
                      value={manualHandle}
                      onChange={(e) => setManualHandle(e.target.value)}
                      className="glass-soft flex-1 rounded px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-muted2 focus:border-red focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded bg-base border border-hairline px-3 py-1.5 font-mono text-xs text-ink hover:border-red"
                    >
                      Set
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Active Handle Status Pill */}
            {handle && (
              <div className="mt-2.5 pt-2 border-t border-hairline/40">
                <p className={`font-body text-[10px] leading-snug ${TEXT[status.tone]}`}>
                  {status.hint}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ConnectWalletButton />
    </div>
  );
}
