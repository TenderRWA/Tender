import { useNavigate } from "@/lib/router-compat";
import CtaStrip from "@/components/pricing/CtaStrip";
import {
  DefList,
  DOC_ACTION_PRIMARY,
  DocHero,
  DocSection,
  Para,
  PrintButton,
  Reveal,
} from "@/components/docs/DocKit";

/* ------------------------------------------------------------------ */
/* Phase data                                                          */
/* ------------------------------------------------------------------ */

type PhaseStatus = "shipped" | "building" | "planned" | "research";

const STATUS_META: Record<
  PhaseStatus,
  { label: string; dot: string; text: string; rail: string; filled: boolean }
> = {
  shipped: {
    label: "SHIPPED",
    dot: "bg-success",
    text: "text-success",
    rail: "border-success",
    filled: true,
  },
  building: {
    label: "IN BUILD",
    dot: "bg-red",
    text: "text-red",
    rail: "border-red",
    filled: true,
  },
  planned: {
    label: "PLANNED",
    dot: "bg-greyseries",
    text: "text-muted2",
    rail: "border-greyseries",
    filled: false,
  },
  research: {
    label: "RESEARCH",
    dot: "bg-greyseries",
    text: "text-muted2",
    rail: "border-hairline",
    filled: false,
  },
};

const PHASES: {
  code: string;
  when: string;
  name: string;
  status: PhaseStatus;
  summary: string;
  items: string[];
  unlocks: string;
}[] = [
  {
    code: "T1",
    when: "NOW",
    name: "Elections & atomic settlement",
    status: "shipped",
    summary:
      "The rail itself: a handle, an election, and a single transaction that honours it at receipt.",
    items: [
      "On-chain handle registry, consumed rather than forked",
      "Elections expressed in basis points, summing to 100%",
      "Single-recipient pay-by-handle, settled at receipt",
      "Jupiter best-route execution under slippage caps",
      "Pyth reference band checked before anything is signed",
      "USDC safe-settle fallback on a breaching leg",
    ],
    unlocks: "ANY INBOUND TOKEN -> YOUR ELECTED MIX",
  },
  {
    code: "T2",
    when: "NEXT",
    name: "Splits & invoices",
    status: "building",
    summary:
      "One payment, many receivers - each share landing in that receiver's own elected assets.",
    items: [
      "Multi-recipient handles, each share on its own election",
      "Solana Pay QR and pay-links carrying amount, memo, expiry",
      "Invoice status and settlement receipts in the terminal",
      "Dual-provider quoting: Jupiter V6 and Relay.link V2",
    ],
    unlocks: "1 PAYMENT -> N RECIPIENTS -> N ELECTIONS",
  },
  {
    code: "T3",
    when: "LATER",
    name: "Payroll vaults & token genesis",
    status: "planned",
    summary:
      "The same settlement, on a schedule - plus the token that pays the people securing it.",
    items: [
      "Funder vault with a roster and a schedule",
      "Permissionless crank: anyone can trigger a due run",
      "Per-recipient elections honoured on every run",
      "$TNDR genesis, staker fee share and the buyback flow",
    ],
    unlocks: "VAULT -> CRANK -> ROSTER -> ELECTED ASSETS",
  },
  {
    code: "T4",
    when: "LATER",
    name: "Resolution & cross-chain pay-in",
    status: "research",
    summary: "Widening what can address a handle, and what can arrive at one.",
    items: [
      ".sol domain resolution adapter",
      "Cross-chain pay-in routes into the same election",
      "A wider eligible-asset universe under staker governance",
    ],
    unlocks: "MORE WAYS IN · SAME ELECTION OUT",
  },
];

const HERO_META: [string, string][] = [
  ["PHASES", "4"],
  ["SHIPPED", "T1"],
  ["IN BUILD", "T2"],
  ["NETWORK", "SOLANA · MAINNET-BETA"],
];

/* ------------------------------------------------------------------ */
/* Phase rail                                                          */
/* ------------------------------------------------------------------ */

/** Compact status overview - the whole roadmap in one glance. */
function PhaseRail() {
  return (
    <Reveal>
      <ol className="grid grid-cols-2 gap-px overflow-hidden rounded border border-hairline bg-hairline md:grid-cols-4">
        {PHASES.map((p) => {
          const meta = STATUS_META[p.status];
          return (
            <li key={p.code} className="flex flex-col gap-2 bg-card2 px-5 py-5">
              <span className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 ${meta.dot}`} aria-hidden />
                <span className="font-mono text-sm uppercase tracking-[0.12em] text-ink">
                  {p.code}
                </span>
              </span>
              <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${meta.text}`}>
                {meta.label}
              </span>
            </li>
          );
        })}
      </ol>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Phase blocks                                                        */
/* ------------------------------------------------------------------ */

function PhaseBlock({ phase, last }: { phase: (typeof PHASES)[number]; last: boolean }) {
  const meta = STATUS_META[phase.status];

  return (
    <Reveal>
      <div className="relative pl-8 md:pl-14">
        {/* Timeline rail + node. The rail stops at the last phase. */}
        {!last && (
          <span
            className="absolute left-[7px] top-6 bottom-[-2rem] w-px bg-hairline md:left-[11px]"
            aria-hidden
          />
        )}
        <span
          className={`absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-base md:h-6 md:w-6 ${meta.rail}`}
          aria-hidden
        >
          {meta.filled && <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
        </span>

        <article
          id={`phase-${phase.code.toLowerCase()}`}
          className="group scroll-mt-28 rounded border border-hairline bg-card2 p-6 transition-colors duration-300 hover:border-red md:p-9"
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="font-mono text-sm uppercase tracking-[0.12em] text-muted2">
              PHASE {phase.code}
            </span>
            <span
              className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] ${meta.text}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 ${meta.dot}`} aria-hidden />
              {meta.label}
            </span>
            <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.14em] text-muted2">
              {phase.when}
            </span>
          </div>

          <h3 className="mt-4 font-display text-[26px] font-medium leading-[1.1] tracking-[-0.02em] text-ink md:text-[34px]">
            {phase.name}
          </h3>
          <p className="mt-3 max-w-2xl font-body text-[17px] leading-[1.65] text-secondary2">
            {phase.summary}
          </p>

          <ul className="mt-7 grid grid-cols-1 gap-x-8 gap-y-2.5 lg:grid-cols-2">
            {phase.items.map((it) => (
              <li
                key={it}
                className="flex items-start gap-3 font-body text-[15px] leading-relaxed text-secondary2"
              >
                <span className="mt-[8px] h-1.5 w-1.5 shrink-0 bg-red" aria-hidden />
                {it}
              </li>
            ))}
          </ul>

          <div className="mt-7 overflow-x-auto">
            <span className="inline-block whitespace-nowrap rounded border border-hairline bg-base px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink md:text-xs">
              UNLOCKS: {phase.unlocks}
            </span>
          </div>
        </article>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Roadmap() {
  const navigate = useNavigate();

  return (
    <>
      <DocHero
        index="012"
        label="ROADMAP"
        line1="Four phases."
        line2="One rail at a time."
        sub="What is deployed, what is being built, and what is still a question. Each phase ships a primitive that stands on its own - nothing here needs a later phase to be useful."
        meta={HERO_META}
      >
        <button onClick={() => navigate("/whitepaper")} className={DOC_ACTION_PRIMARY}>
          Read the whitepaper
          <span className="inline-block transition-transform duration-150 group-hover:translate-x-1.5">
            →
          </span>
        </button>
        <PrintButton />
      </DocHero>

      <div className="mx-auto max-w-container px-5 md:px-10 py-14 md:py-20">
        <div className="flex max-w-4xl flex-col gap-16 md:gap-24">
          <DocSection
            id="legend"
            num="01"
            title="How to read this"
            lede="Four statuses, and one rule about what they promise."
          >
            <PhaseRail />
            <DefList
              items={[
                {
                  term: "SHIPPED",
                  body: "Deployed and settling on mainnet-beta today. Described in the whitepaper as built, not intended.",
                },
                {
                  term: "IN BUILD",
                  body: "Actively being written. The shape is settled; the surface may still move before it lands.",
                },
                {
                  term: "PLANNED",
                  body: "Committed in order and scope, not yet in build. Details are expected to change as the phase before it lands.",
                },
                {
                  term: "RESEARCH",
                  body: "An open question we intend to answer. Listed so the direction is public - not as a promise of a date.",
                },
              ]}
            />
            <Para>
              The order of the phases is a commitment. The dates are not, and we do not publish
              them: each phase depends on the one before it landing cleanly, and on an
              eligible-asset universe that stakers - not us alone - decide how fast to widen.
            </Para>
          </DocSection>

          <DocSection
            id="phases"
            num="02"
            title="The phases"
            lede="Each block lists what actually ships and the one thing it unlocks."
          >
            <div className="flex flex-col gap-12 md:gap-16">
              {PHASES.map((p, i) => (
                <PhaseBlock key={p.code} phase={p} last={i === PHASES.length - 1} />
              ))}
            </div>
          </DocSection>

          <DocSection
            id="constants"
            num="03"
            title="What doesn't move"
            lede="The design laws hold across every phase. A roadmap item that would break one of them isn't on the roadmap."
          >
            <DefList
              items={[
                {
                  term: "NON-CUSTODIAL, ALWAYS",
                  body: "No phase introduces a pooled balance or a forwarding account. If a feature needs custody to work, it does not ship.",
                },
                {
                  term: "THE ELECTION IS LAW",
                  body: "Splits, vaults and cross-chain pay-in all resolve to the same rule: the receiver's election is honoured exactly, or the payment safe-settles.",
                },
                {
                  term: "THE FAST PATH STAYS FREE",
                  body: "Same-asset transfers convert nothing and cost nothing, in every phase, forever.",
                },
                {
                  term: "THE STANDARD STAYS UNFORKED",
                  body: "Identity keeps living in the on-chain handle registry, so a handle outlives any single interface - including ours.",
                },
              ]}
            />
            <Reveal>
              <button
                onClick={() => navigate("/whitepaper")}
                data-print-hide
                className="group flex w-full items-center justify-between gap-6 rounded border border-hairline bg-card2 px-6 py-6 text-left transition-colors duration-300 hover:border-red md:px-8"
              >
                <span className="flex flex-col gap-2">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted2">
                    THE OTHER DOCUMENT
                  </span>
                  <span className="font-display text-[24px] font-medium leading-[1.12] tracking-[-0.02em] text-ink md:text-[28px]">
                    The whitepaper
                  </span>
                  <span className="font-body text-[15px] leading-relaxed text-secondary2">
                    The laws, the architecture, the fee model, and the risk controls behind T1.
                  </span>
                </span>
                <span
                  aria-hidden
                  className="shrink-0 font-display text-3xl text-red transition-transform duration-200 group-hover:translate-x-1.5"
                >
                  →
                </span>
              </button>
            </Reveal>
          </DocSection>

          <DocSection
            id="changes"
            num="04"
            title="How this list changes"
            lede="A roadmap nobody can hold you to isn't one."
          >
            <DefList
              items={[
                {
                  term: "ORDER IS A COMMITMENT",
                  body: "Phases ship in sequence. If something jumps the queue, this page says so and why.",
                },
                {
                  term: "TIMING IS NOT",
                  body: "We publish status, not dates. A phase moves from PLANNED to IN BUILD when it is genuinely being written.",
                },
                {
                  term: "SCOPE CAN NARROW",
                  body: "A listed deliverable can be cut if it would compromise a design law. That is a feature of the process, not a failure of it.",
                },
                {
                  term: "STAKERS GOVERN THE UNIVERSE",
                  body: "Which assets become electable is decided on-chain, so the pace of that widening is not ours alone to set.",
                },
              ]}
            />
            <Para>
              Anything on this page beyond T1 describes intent rather than deployed code, and none
              of it is an offer, a solicitation, or investment advice.
            </Para>
          </DocSection>
        </div>
      </div>

      <CtaStrip
        heading="T1 is live. Start there."
        disclaimer="TENDER is settlement infrastructure - not payroll, tax, or investment software."
      />
    </>
  );
}
