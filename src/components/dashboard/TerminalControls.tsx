import { useEffect, useRef, useState } from "react";

import ConnectWalletButton from "@/components/wallet/ConnectWalletButton";
import { useHandleAvailability } from "@/hooks/useTender";
import { useTenderSession } from "@/lib/tender-session";
import { useWallet } from "@/lib/wallet/wallet-context";

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

/**
 * Terminal identity controls, rendered inside the site navbar on /dashboard.
 *
 * Per the integration spec the wallet is the identity: writes carry
 * `ownerWallet`, and the API 403s when it does not match the handle's owner
 * (backend/src/routes/handles.ts). There is no reverse lookup from wallet to
 * handle, so the handle is still typed — but it is resolved against
 * GET /api/v1/handles/:handle as you type and checked against the connected
 * wallet, so a mismatch shows here rather than surfacing as a failed save.
 */
export default function TerminalControls() {
  const { handle, setHandle } = useTenderSession();
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data: availability, isFetching } = useHandleAvailability(handle);
  const registered = availability?.registered ?? false;
  const owner = availability?.details?.ownerWallet;
  const isOwner = Boolean(owner && address && owner === address);

  // useHandleAvailability only queries at 3+ characters; say so rather than
  // reporting an unchecked handle as unregistered.
  const tooShort = handle.length > 0 && handle.length < 3;

  const status: { tone: Tone; label: string; hint: string } = !handle
    ? { tone: "warning", label: "SET HANDLE", hint: "Enter the handle this terminal should act as." }
    : tooShort
      ? { tone: "muted", label: `@${handle}`, hint: "Keep typing — checked from 3 characters." }
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
                hint: "Connect the owner wallet to enable writes.",
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
          <span className="max-w-[12ch] truncate">{status.label}</span>
        </button>

        {open && (
          <div className="glass absolute right-0 top-full z-10 mt-2 w-72 rounded-xl p-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                HANDLE
              </span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="mira"
                autoFocus
                aria-label="Your TENDER handle"
                className="glass-soft w-full rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted2 transition-all duration-150 focus:border-red focus:ring-2 focus:ring-red/25 focus:outline-none"
              />
            </label>

            <p className={`mt-2.5 font-body text-[11px] leading-snug ${TEXT[status.tone]}`}>
              {status.hint}
            </p>

            {registered && owner && (
              <p className="mt-2 font-mono text-[10px] tracking-[0.06em] text-muted2 break-all">
                OWNER {owner.slice(0, 6)}…{owner.slice(-4)}
              </p>
            )}
          </div>
        )}
      </div>

      <ConnectWalletButton />
    </div>
  );
}
