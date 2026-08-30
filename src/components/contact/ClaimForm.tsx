import { useMemo, useState } from "react";
import { useSearchParams } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useComingSoon } from "@/components/ComingSoonModal";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ROLES = ["Receiver", "Sender", "Team-DAO", "Staker"] as const;
type Role = (typeof ROLES)[number];

/** Mock registry - handles already claimed on mainnet-beta. */
const TAKEN = new Set([
  "tender",
  "admin",
  "solana",
  "infranodes",
  "satoshi",
  "jupiter",
  "usdc",
  "tender",
]);

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

type Availability = "idle" | "available" | "taken";

interface Election {
  spyx: number;
  usdc: number;
  gldx: number;
}

const SLIDERS: { key: keyof Election; label: string; color: string }[] = [
  { key: "spyx", label: "SPYx", color: "#E8322A" },
  { key: "usdc", label: "USDC", color: "#9A9AA0" },
  { key: "gldx", label: "GLDx", color: "#5C5C63" },
];

function roleFromQuery(raw: string | null): Role {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("send")) return "Sender";
  if (v.includes("team") || v.includes("dao")) return "Team-DAO";
  if (v.includes("stak") || v.includes("tender")) return "Staker";
  return "Receiver";
}

/* ---------------------------------- pie ---------------------------------- */

function ElectionRing({ election }: { election: Election }) {
  const r = 76;
  const C = 2 * Math.PI * r;
  const values = [election.spyx, election.usdc, election.gldx];
  const total = values.reduce((a, b) => a + b, 0);

  let cursor = 0;
  const segments = values.map((v, i) => {
    const frac = total > 0 ? v / Math.max(total, 100) : 0;
    const len = Math.max(frac * C - 4, 0);
    const seg = (
      <circle
        key={SLIDERS[i].key}
        cx="100"
        cy="100"
        r={r}
        fill="none"
        stroke={SLIDERS[i].color}
        strokeWidth={v > 0 ? 22 : 0}
        strokeDasharray={`${len} ${C - len}`}
        strokeDashoffset={-cursor + C / 4}
        style={{ transition: "stroke-dasharray 400ms ease-out, stroke-dashoffset 400ms ease-out" }}
      />
    );
    cursor += frac * C;
    return seg;
  });

  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 200 200" className="w-full h-auto" aria-hidden>
        <circle cx="100" cy="100" r={r} fill="none" stroke="#E3E3E6" strokeWidth="22" />
        {segments}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-medium tracking-[-0.03em] text-ink">
          {total}%
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
          ELECTION
        </span>
      </div>
    </div>
  );
}

/** Right-hand sticky preview: on-chain account card with live handle + pie. */
function PreviewCard({
  handle,
  availability,
  election,
  role,
}: {
  handle: string;
  availability: Availability;
  election: Election;
  role: Role;
}) {
  return (
    <div className="rounded border border-hairline bg-card2 dot-matrix-dark p-8 md:p-10 lg:sticky lg:top-28">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="TENDER mark" className="h-10 w-auto" />
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-medium tracking-[-0.02em] text-ink">
            @{handle.trim() || "yourhandle"}
          </p>
          <p
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.12em]",
              availability === "available" && "text-success",
              availability === "taken" && "text-red",
              availability === "idle" && "text-muted2"
            )}
          >
            {availability === "available"
              ? "● AVAILABLE"
              : availability === "taken"
                ? "● TAKEN"
                : "ELECTION REGISTRY"}
          </p>
        </div>
      </div>

      <div className="my-8">
        <ElectionRing election={election} />
      </div>

      <div className="mb-8 grid grid-cols-3 gap-2">
        {SLIDERS.map((s) => (
          <div
            key={s.key}
            className="rounded border border-hairline bg-base px-3 py-2 text-center"
          >
            <span
              className="mx-auto mb-1 block h-1 w-4"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="font-mono text-xs text-secondary2">
              {s.label} {election[s.key]}%
            </span>
          </div>
        ))}
      </div>

      <p className="border-t border-hairline pt-5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-muted2">
        {role.toUpperCase()} · SETTLES VIA JUPITER · NON-CUSTODIAL · SOLANA
      </p>
    </div>
  );
}

/* ---------------------------------- form ---------------------------------- */

const fieldVariants = {
  hidden: { y: 24, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

export default function ClaimForm({ embedded = false }: { embedded?: boolean }) {
  const [searchParams] = useSearchParams();
  const [handle, setHandle] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [election, setElection] = useState<Election>({ spyx: 60, usdc: 30, gldx: 10 });
  const [role, setRole] = useState<Role>(() => roleFromQuery(searchParams.get("role")));
  const [done, setDone] = useState(false);
  const comingSoon = useComingSoon();

  const total = election.spyx + election.usdc + election.gldx;
  const validTotal = total === 100;
  const canSubmit = availability === "available" && validTotal;

  const summary = useMemo(
    () =>
      `@${handle.trim()} - SPYx ${election.spyx} / USDC ${election.usdc} / GLDx ${election.gldx} - ${role.toUpperCase()}`,
    [handle, election, role]
  );

  const checkHandle = (value: string) => {
    const v = value.trim().toLowerCase();
    if (!HANDLE_RE.test(v) || TAKEN.has(v)) {
      setAvailability("taken");
    } else {
      setAvailability("available");
    }
  };

  const setPct = (key: keyof Election, value: number) =>
    setElection((e) => ({ ...e, [key]: value }));

  const inputCls =
    "w-full rounded border border-hairline bg-base px-4 py-3.5 font-mono text-sm text-ink caret-red placeholder:text-muted2 outline-none transition-colors duration-150 focus:border-red";

  return (
    <section id="claim" className={embedded ? "" : "scroll-mt-24 border-t border-hairline"}>
      <div className={embedded ? "" : "mx-auto max-w-container px-5 py-24 md:px-10 md:py-40"}>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ staggerChildren: 0.08 }}
          className="grid gap-10 lg:grid-cols-[55fr_45fr] lg:gap-16"
        >
          {/* Form card / success panel */}
          <motion.div variants={fieldVariants} style={{ perspective: 1200 }}>
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.div
                  key="success"
                  initial={{ rotateY: 8, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -8, opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="flex h-full flex-col justify-between gap-10 rounded border border-red-deep/60 bg-red p-8 md:p-12"
                >
                  <div>
                    <span className="mb-6 inline-block h-1.5 w-1.5 bg-red-deep" aria-hidden />
                    <h3 className="font-display text-3xl font-medium leading-[1.1] tracking-[-0.02em] text-white md:text-4xl">
                      Handle reserved.
                      <br />
                      Election recorded.
                    </h3>
                    <p className="mt-6 font-mono text-xs uppercase leading-relaxed tracking-[0.12em] text-red-deep">
                      {summary}
                    </p>
                    <p className="mt-4 max-w-md font-body text-[15px] leading-[1.65] text-white/80">
                      Your mix is pinned in the election registry. When mainnet-beta
                      opens, this handle settles every incoming payment exactly as
                      elected - no held balances, ever.
                    </p>
                  </div>
                  <button
                    onClick={comingSoon.open}
                    className="inline-flex w-fit items-center gap-2 rounded bg-white px-8 py-4 font-body text-sm font-semibold uppercase tracking-[0.08em] text-red transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    Talk to us on Telegram →
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  exit={{ rotateY: -8, opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (canSubmit) setDone(true);
                  }}
                  className="rounded border border-hairline bg-card2 p-8 md:p-12"
                >
                  {!embedded && (
                    <motion.div variants={fieldVariants}>
                      <h2 className="font-display text-[28px] font-medium leading-[1.1] tracking-[-0.02em] text-ink">
                        Claim your handle
                      </h2>
                      <p className="mt-3 font-body text-[15px] leading-[1.65] text-secondary2">
                        Reserve a name in the election registry and pin your receive
                        mix before mainnet-beta opens.
                      </p>
                    </motion.div>
                  )}

                  {/* 1. Handle */}
                  <motion.div variants={fieldVariants} className="mt-10">
                    <label
                      htmlFor="claim-handle"
                      className="mb-3 block font-mono text-xs uppercase tracking-[0.12em] text-secondary2"
                    >
                      Handle
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted2">
                        @
                      </span>
                      <input
                        id="claim-handle"
                        type="text"
                        value={handle}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="yourname"
                        onChange={(e) => {
                          setHandle(e.target.value);
                          setAvailability("idle");
                        }}
                        onBlur={() => handle.trim() && checkHandle(handle)}
                        className={cn(
                          inputCls,
                          "pl-9",
                          availability === "available" && "border-success/60",
                          availability === "taken" && "border-red"
                        )}
                      />
                      <span
                        className={cn(
                          "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.12em]",
                          availability === "available" && "text-success",
                          availability === "taken" && "text-red"
                        )}
                      >
                        {availability === "available" && "✓ AVAILABLE"}
                        {availability === "taken" && "✕ TAKEN"}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                      3-20 chars · a-z 0-9 _ · registry-checked on blur
                    </p>
                  </motion.div>

                  {/* 2. Election sliders */}
                  <motion.div variants={fieldVariants} className="mt-10">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                        Your election
                      </span>
                      <span
                        className={cn(
                          "font-mono text-xs uppercase tracking-[0.12em]",
                          validTotal ? "text-success" : "animate-pulse text-red"
                        )}
                        aria-live="polite"
                      >
                        TOTAL {total}%
                      </span>
                    </div>
                    <div className="space-y-5 rounded border border-hairline bg-base p-5">
                      {SLIDERS.map((s) => (
                        <div key={s.key}>
                          <div className="mb-2 flex items-center justify-between font-mono text-xs">
                            <span className="uppercase tracking-[0.12em] text-ink">
                              {s.label}
                            </span>
                            <span className="text-secondary2">{election[s.key]}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={election[s.key]}
                            aria-label={`${s.label} percentage`}
                            onChange={(e) => setPct(s.key, Number(e.target.value))}
                            className="h-1 w-full cursor-pointer appearance-none rounded bg-hairline accent-[#E8322A]"
                          />
                        </div>
                      ))}
                    </div>
                    {!validTotal && (
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-red">
                        Election must total 100% to claim.
                      </p>
                    )}
                  </motion.div>

                  {/* 3. Role pills */}
                  <motion.div variants={fieldVariants} className="mt-10">
                    <span className="mb-3 block font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                      I am a…
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          aria-pressed={role === r}
                          className={cn(
                            "rounded border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-150",
                            role === r
                              ? "border-red bg-red text-white"
                              : "border-hairline bg-base text-secondary2 hover:border-red hover:text-ink"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  {/* 5. Submit */}
                  <motion.div variants={fieldVariants} className="mt-10">
                    <motion.button
                      type="submit"
                      disabled={!canSubmit}
                      whileTap={canSubmit ? { scale: 0.96 } : undefined}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded px-8 py-4 font-body text-sm font-semibold uppercase tracking-[0.08em] transition-all duration-150",
                        canSubmit
                          ? "bg-red text-white hover:-translate-y-0.5 hover:bg-red-hover"
                          : "cursor-not-allowed bg-raised text-muted2"
                      )}
                    >
                      ✓ Claim Handle
                    </motion.button>
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Live preview */}
          <motion.div variants={fieldVariants}>
            <PreviewCard
              handle={handle}
              availability={availability}
              election={election}
              role={role}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
