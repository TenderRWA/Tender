import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import CtaStrip from "@/components/pricing/CtaStrip";
import {
  Callout,
  DefList,
  DOC_ACTION_PRIMARY,
  DocHero,
  DocSection,
  MonoBlock,
  Para,
  PrintButton,
  Reveal,
} from "@/components/docs/DocKit";
import { scrollToHash } from "@/lib/lenis";

const SECTIONS = [
  { id: "abstract", num: "01", title: "Abstract" },
  { id: "problem", num: "02", title: "The receive side" },
  { id: "laws", num: "03", title: "Design laws" },
  { id: "architecture", num: "04", title: "Architecture" },
  { id: "lifecycle", num: "05", title: "Settlement lifecycle" },
  { id: "risk", num: "06", title: "Risk controls" },
  { id: "economics", num: "07", title: "Fee model" },
  { id: "interfaces", num: "08", title: "Interfaces" },
  { id: "limits", num: "09", title: "Scope & limits" },
];

const SECTION_IDS = SECTIONS.map((s) => s.id);

const HERO_META: [string, string][] = [
  ["VERSION", "V1.0"],
  ["UPDATED", "SEPTEMBER 2026"],
  ["NETWORK", "SOLANA · MAINNET-BETA"],
  ["STATUS", "LIVE"],
];

/* ------------------------------------------------------------------ */
/* Contents rail                                                       */
/* ------------------------------------------------------------------ */

function useActiveSection() {
  const [active, setActive] = useState<string>(SECTION_IDS[0]);

  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -68% 0px", threshold: 0 },
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return active;
}

function TocList({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  return (
    <ul className="flex flex-col">
      {SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <li key={s.id}>
            <button
              onClick={() => onPick(s.id)}
              aria-current={isActive ? "true" : undefined}
              className={`group flex w-full items-baseline gap-3 border-l-2 py-2 pl-4 text-left transition-colors duration-150 ${
                isActive ? "border-red" : "border-hairline"
              }`}
            >
              <span
                className={`font-mono text-[11px] tabular-nums transition-colors ${
                  isActive ? "text-red" : "text-muted2"
                }`}
              >
                {s.num}
              </span>
              <span
                className={`font-body text-[14px] leading-snug transition-colors ${
                  isActive ? "text-ink" : "text-secondary2 group-hover:text-ink"
                }`}
              >
                {s.title}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Fee table                                                           */
/* ------------------------------------------------------------------ */

const FEE_ROWS: { path: string; basis: string; rate: string; free: boolean }[] = [
  { path: "SAME-ASSET FAST PATH", basis: "Nothing converts", rate: "0 BPS · FOREVER", free: true },
  {
    path: "CROSS-ASSET SETTLEMENT",
    basis: "Converted volume only",
    rate: "15 BPS · CAPPED ≤ 30 BPS / TX",
    free: false,
  },
  { path: "SPLITS & INVOICES", basis: "Routing only", rate: "0 BPS", free: true },
  { path: "PAYROLL VAULT", basis: "Scheduled run", rate: "TIERED BY ROSTER", free: false },
  { path: "STAKING", basis: "Share of protocol fees", rate: "EARN · NOT A COST", free: true },
];

function FeeTable() {
  return (
    <Reveal>
      <div className="overflow-x-auto rounded border border-hairline bg-card2">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead>
            <tr>
              {["PATH", "BASIS", "RATE"].map((h) => (
                <th
                  key={h}
                  className="border-b border-hairline px-5 py-4 font-mono text-xs font-normal uppercase tracking-[0.12em] text-secondary2"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEE_ROWS.map((r) => (
              <tr key={r.path} className="border-b border-hairline last:border-b-0">
                <td className="px-5 py-4 font-mono text-xs uppercase tracking-[0.1em] text-ink">
                  {r.path}
                </td>
                <td className="px-5 py-4 font-body text-[15px] text-secondary2">{r.basis}</td>
                <td
                  className={`px-5 py-4 font-mono text-xs uppercase tracking-[0.1em] ${
                    r.free ? "text-success" : "text-ink"
                  }`}
                >
                  {r.rate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Whitepaper() {
  const active = useActiveSection();
  const navigate = useNavigate();

  return (
    <>
      <DocHero
        index="011"
        label="WHITEPAPER"
        line1="The rail,"
        line2="written down."
        sub="How TENDER settles a payment into the receiver's elected assets - the laws it obeys, the architecture behind them, the fee model, and what the rail refuses to do. Kept current with what is actually deployed."
        meta={HERO_META}
      >
        <button onClick={() => navigate("/roadmap")} className={DOC_ACTION_PRIMARY}>
          Read the roadmap
          <span className="inline-block transition-transform duration-150 group-hover:translate-x-1.5">
            →
          </span>
        </button>
        <PrintButton />
      </DocHero>

      <div className="mx-auto max-w-container px-5 md:px-10 py-14 md:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Sticky contents rail (desktop) */}
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-28">
              <span className="mb-5 block font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                [ CONTENTS ]
              </span>
              <nav aria-label="Whitepaper contents">
                <TocList active={active} onPick={(id) => scrollToHash(`#${id}`)} />
              </nav>
            </div>
          </aside>

          {/* Contents (mobile / tablet) */}
          <details
            data-print-hide
            className="rounded border border-hairline bg-card2 px-5 py-4 lg:hidden"
          >
            <summary className="cursor-pointer list-none font-mono text-xs uppercase tracking-[0.12em] text-ink">
              [ CONTENTS ] <span className="text-red">▾</span>
            </summary>
            <nav aria-label="Whitepaper contents" className="mt-4">
              <TocList active={active} onPick={(id) => scrollToHash(`#${id}`)} />
            </nav>
          </details>

          {/* Document body */}
          <article className="flex max-w-3xl flex-col gap-16 md:gap-24 lg:col-span-9">
            <DocSection
              id="abstract"
              num="01"
              title="Abstract"
              lede="TENDER is a non-custodial, receive-side settlement rail on Solana."
            >
              <Para>
                Conventional payment rails let the sender decide which asset arrives. TENDER inverts
                that. A receiver publishes an election against an on-chain handle - a basis-point
                split across eligible assets, summing to 100% - and every inbound payment is
                converted at receipt and delivered in exactly that mix, atomically, in a single
                transaction.
              </Para>
              <Para>
                The sender does nothing differently: they pay a handle in whatever they already
                hold. No account is opened, no balance is held, and no TENDER-controlled address
                ever takes possession of the funds. What changes is the unit of account on the
                receiving end - and who gets to choose it.
              </Para>
              <Callout label="THE ONE-LINE VERSION">
                Get paid in the assets you'd rather hold, without asking anyone to send them.
              </Callout>
            </DocSection>

            <DocSection
              id="problem"
              num="02"
              title="The receive side is unowned"
              lede="Every rail in production optimises the sender. Nobody owns what happens the moment value lands."
            >
              <DefList
                items={[
                  {
                    term: "CONVERSION BURDEN",
                    body: "A payment arrives in the sender's unit of account. Turning it into what the receiver actually wants to hold is manual, after the fact, and paid for twice - once in spread, once in attention.",
                  },
                  {
                    term: "TIME EXPOSURE",
                    body: "The gap between receipt and conversion is unhedged exposure to an asset nobody chose to hold. Across a payroll-sized flow, that gap compounds.",
                  },
                  {
                    term: "POLICY WITHOUT A HOME",
                    body: "Treasury policy - what mix of stables, tokenised equities and commodities to hold - lives in a spreadsheet, not in the rail. Nothing enforces it at the point of receipt.",
                  },
                  {
                    term: "CUSTODY AS THE DEFAULT FIX",
                    body: "The usual answer is an intermediary that receives on your behalf, converts, then forwards. That solves the mix by reintroducing exactly the counterparty risk the chain removed.",
                  },
                ]}
              />
              <Para>
                TENDER treats the receive side as the product. The election is the policy, the rail
                is the enforcement, and settlement is atomic - so there is never a moment where the
                policy is stated but not yet true.
              </Para>
            </DocSection>

            <DocSection
              id="laws"
              num="03"
              title="Design laws"
              lede="Part 0 of the backend spec isn't a feature list - it's the set of constraints every later decision has to satisfy."
            >
              <DefList
                items={[
                  {
                    term: "LAW 01 · ELECTION IS LAW",
                    body: "The receiver's election is honoured exactly, atomically, with no custody. A settlement that cannot honour it does not silently approximate it.",
                  },
                  {
                    term: "LAW 02 · NEVER FILL BADLY",
                    body: "Never fill badly; never strand funds. A leg that breaches its slippage bound safe-settles in USDC with an on-chain notice, rather than taking the fill or failing the payment.",
                  },
                  {
                    term: "LAW 03 · THE FAST PATH IS FREE",
                    body: "Same-asset payments are a direct transfer. Nothing converts, so the rail adds nothing and charges nothing - zero fee, forever.",
                  },
                  {
                    term: "LAW 04 · CONSUME THE STANDARD",
                    body: "Consume the handle standard, don't fork it. Identity lives in the on-chain handle registry, so it stays portable outside TENDER.",
                  },
                ]}
              />
            </DocSection>

            <DocSection
              id="architecture"
              num="04"
              title="Architecture"
              lede="Six components sit between an inbound payment and a receiver's wallet. None of them holds funds."
            >
              <DefList
                items={[
                  {
                    term: "HANDLE REGISTRY",
                    body: "On-chain identity. Resolves a handle to a receiver wallet and its current election. Standard-consuming, so a handle keeps working independently of TENDER.",
                  },
                  {
                    term: "ELECTION",
                    body: "A basis-point vector over eligible assets, summing to 100%. Updateable at any time by the handle owner; the version in force at receipt is the one that settles.",
                  },
                  {
                    term: "UNIVERSE GATE",
                    body: "The eligible-asset registry. Only listed, verified tokenised assets and stablecoins can be elected. Stakers govern what enters the universe.",
                  },
                  {
                    term: "QUOTE ENGINE",
                    body: "Dual provider - Jupiter Swap API V6 and Relay.link API V2 - producing a best route per leg under a slippage cap.",
                  },
                  {
                    term: "PRICE SANITY",
                    body: "A Pyth reference band checked before anything is signed. A quote outside the band is rejected rather than executed.",
                  },
                  {
                    term: "SETTLEMENT",
                    body: "One atomic transaction: N legs swapped and delivered straight to the receiver's wallet. Corporate actions on tokenised assets accrue afterwards through the issuer's Token-2022 Scaled UI multiplier.",
                  },
                ]}
              />

              <MonoBlock caption="FIG. 1 — INBOUND PAYMENT THROUGH THE RAIL">{`  SENDER  ·  SOL / USDC / ANY LISTED SPL
     |
     v
  +-------------------------------------------------+
  |  RESOLVE   handle  ->  election (bps = 10,000)  |
  |  GATE      eligible-asset universe check        |
  |  QUOTE     Jupiter V6  ·  Relay.link V2         |
  |  SANITY    Pyth reference band                  |
  |  EXECUTE   one atomic transaction               |
  +-------------------------------------------------+
     |
     +----------+-----------+-----------------------+
     v          v           v                       v
   60% SPYx   30% USDC   10% GLDx       BREACHING LEG -> USDC
                                         (+ on-chain notice)`}</MonoBlock>

              <Callout label="NON-CUSTODIAL BY CONSTRUCTION">
                There is no step in Fig. 1 where a TENDER-controlled account holds the payment.
                Custody isn't a policy we promise to keep - it's a state the design never enters.
              </Callout>
            </DocSection>

            <DocSection
              id="lifecycle"
              num="05"
              title="Settlement lifecycle"
              lede="Four steps, sub-second finality, and no point at which the payment sits anywhere other than the sender's wallet or the receiver's."
            >
              <DefList
                items={[
                  {
                    term: "01 · SENDER INITIATES",
                    body: "Pays @handle in any token they already hold. Zero conversion burden on the sender - they never see the election.",
                  },
                  {
                    term: "02 · ROUTER VALIDATES",
                    body: "Reads the election from the registry and checks every target against the eligible-asset universe.",
                  },
                  {
                    term: "03 · CONVERSION AT RECEIPT",
                    body: "Best-route quotes per leg, capped for slippage and sanity-checked against the Pyth reference band.",
                  },
                  {
                    term: "04 · DELIVERY",
                    body: "Elected assets land in the receiver's wallet. Atomic, non-custodial, one transaction.",
                  },
                ]}
              />
              <Para>
                Splits extend this lifecycle rather than replacing it: one payment resolves to N
                recipients, and each recipient's share settles against that recipient's own
                election. Payroll vaults extend it again along the time axis - a funded vault, a
                roster, a schedule, and a permissionless crank that anyone can trigger once a run is
                due.
              </Para>
            </DocSection>

            <DocSection
              id="risk"
              num="06"
              title="Risk controls"
              lede="What the rail does when the market, the route, or the wallet doesn't cooperate."
            >
              <DefList
                items={[
                  {
                    term: "SLIPPAGE CAPS",
                    body: "Every leg carries a bound. A route that cannot fill inside it is not executed at any price.",
                  },
                  {
                    term: "PRICE SANITY",
                    body: "Quotes are checked against a Pyth reference band before signing, so a thin or manipulated venue cannot define the fill.",
                  },
                  {
                    term: "SAFE-SETTLE FALLBACK",
                    body: "A breaching leg settles into USDC and emits an on-chain notice. The payment completes; the receiver holds a stable rather than a bad fill or nothing at all.",
                  },
                  {
                    term: "PARTIAL-PROGRESS PROTECTION",
                    body: "Where a multi-leg settlement needs more than one wallet approval, on-chain progress already made is preserved if a later prompt is declined. Nothing is re-run and nothing is lost.",
                  },
                  {
                    term: "ELIGIBILITY GATING",
                    body: "Only assets admitted to the universe can be elected, which bounds the issuer and liquidity risk any election is able to express.",
                  },
                  {
                    term: "NO CUSTODY SURFACE",
                    body: "With no pooled balance and no forwarding account, there is no honeypot to compromise and no withdrawal to halt.",
                  },
                ]}
              />
            </DocSection>

            <DocSection
              id="economics"
              num="07"
              title="Fee model & value flow"
              lede="Fees exist only where value is added. Where nothing converts, nothing is charged."
            >
              <FeeTable />

              <MonoBlock caption="FIG. 2 — WHERE A BASIS POINT GOES">{`  CONVERTED VOLUME  ->  PROTOCOL FEE  ->  OPEN-MARKET BUYBACK  ->  STAKER PAY`}</MonoBlock>

              <Para>
                The fee is taken on converted volume alone and bounded per transaction, so it cannot
                scale away with a payment that happens to need a long route. What the rail earns
                flows back through the protocol: an open-market buyback funded by fees, and a share
                paid to the stakers who secure the parameters and the eligible-asset registry.
              </Para>
            </DocSection>

            <DocSection
              id="interfaces"
              num="08"
              title="Interfaces"
              lede="A handle is payable from any standard Solana wallet. Everything else is a small REST surface."
            >
              <MonoBlock caption="BASE — https://api.tenderrwa.com">{`  GET   /health                     service status, version, timestamp
  GET   /api/v1/handles/:handle     registration + active election
  POST  /api/v1/handles/election    update target allocation (bps)
  POST  /api/v1/settle/quote        atomic route for an inbound payment`}</MonoBlock>
              <Para>
                Invoices and pay-links are Solana Pay compatible - a QR or link carrying amount,
                memo and expiry that any standard mobile wallet can pay. The receiver's election is
                applied on settlement, so a payer needs no TENDER-specific software at all.
              </Para>
            </DocSection>

            <DocSection
              id="limits"
              num="09"
              title="Scope & limitations"
              lede="What this document is not claiming."
            >
              <DefList
                items={[
                  {
                    term: "INFRASTRUCTURE, NOT A SUITE",
                    body: "TENDER moves assets on instruction. Reporting, withholding and tax obligations remain entirely with the user - it is not payroll, tax, or investment software.",
                  },
                  {
                    term: "MARKET RISK IS NOT REMOVED",
                    body: "An election expresses exposure to tokenised assets. Issuer, market and liquidity risk sit with the holder, and conversion depends on available on-chain liquidity at the moment of receipt.",
                  },
                  {
                    term: "DEPLOYED VS. INTENDED",
                    body: "This document describes the rail as built. Anything still ahead of us lives on the roadmap, marked by phase - and the order there is a commitment while the timing is not.",
                  },
                  {
                    term: "NOT AN OFFER",
                    body: "Nothing in this document is an offer, solicitation or recommendation to buy or sell any asset, nor investment advice of any kind.",
                  },
                ]}
              />

              <Reveal>
                <button
                  onClick={() => navigate("/roadmap")}
                  data-print-hide
                  className="group flex w-full items-center justify-between gap-6 rounded border border-hairline bg-card2 px-6 py-6 text-left transition-colors duration-300 hover:border-red md:px-8"
                >
                  <span className="flex flex-col gap-2">
                    <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted2">
                      NEXT DOCUMENT
                    </span>
                    <span className="font-display text-[24px] font-medium leading-[1.12] tracking-[-0.02em] text-ink md:text-[28px]">
                      The roadmap
                    </span>
                    <span className="font-body text-[15px] leading-relaxed text-secondary2">
                      Four phases, what ships in each, and how the order can change.
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
          </article>
        </div>
      </div>

      <CtaStrip
        heading="Read it. Then set your election."
        disclaimer="TENDER is settlement infrastructure - not payroll, tax, or investment software."
      />
    </>
  );
}
