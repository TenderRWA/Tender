import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { encodeFunctionData, erc20Abi } from "viem";

import { useRail, useRailProfile, type RailId } from "@/lib/rail";
import { useWallet } from "@/lib/wallet/wallet-context";
import {
  DEMO_REASON,
  demoInvoices,
  demoSettlementHistory,
  demoWalletNfts,
} from "@/lib/demo/robinhood-demo";
import {
  assetsFromV1,
  assetsFromV2,
  electionQuoteFromV1,
  electionQuoteFromV2,
  handleFromV1,
  handleFromV2,
  invoiceFromV1,
  invoiceFromV2,
  nftFromV1,
  nftFromV2,
  nftKey,
  pendingFromV1,
  pendingFromV2,
  settlementFromV1,
  settlementFromV2,
  tokenFromV1,
  tokenFromV2,
} from "@/lib/rail-normalize";
import {
  buildNftTransferPlan,
  buildSettlementTx,
  checkHandle,
  confirmInvoicePayment,
  confirmPendingSettlement,
  confirmSettlement,
  createInvoice,
  dismissPendingSettlement,
  getAsset,
  getAssets,
  getElectionQuote,
  getHandle,
  getHandlesByOwner,
  getInvoice,
  getInvoices,
  getNftMetadata,
  getPendingSettlements,
  getSettlementHistory,
  getWalletNfts,
  getXAccount,
  registerHandle,
  updateElections,
} from "@/lib/tender-server-fns";
import {
  buildNftTransferPlanV2,
  checkHandleV2,
  confirmInvoicePaymentV2,
  confirmPendingSettlementV2,
  confirmSettlementV2,
  createInvoiceV2,
  dismissPendingSettlementV2,
  getAssetV2,
  getAssetsV2,
  getElectionQuoteV2,
  getHandleV2,
  getHandlesByOwnerV2,
  getInvoiceV2,
  getInvoicesV2,
  getNftMetadataV2,
  getPendingSettlementsV2,
  getSettlementHistoryV2,
  registerHandleV2,
  updateElectionsV2,
} from "@/lib/tender-v2-server-fns";
import type { V2Step } from "@/types/tender-v2";
import type {
  RailAssets,
  RailElectionInput,
  RailElectionQuote,
  RailHandle,
  RailHandleAvailability,
  RailInvoice,
  RailInvoiceDetails,
  RailMaybeDemo,
  RailNft,
  RailNftTransferResult,
  RailPendingSettlement,
  RailSettlementLeg,
  RailSettlementRecord,
  RailSettlementResult,
  RailToken,
  RailXAccount,
} from "@/types/rail";

/**
 * Every hook here goes through a TanStack Start server function, so the network
 * call to the TENDER API is made by our own server. The browser only ever talks
 * to its own origin and never triggers a CORS preflight.
 *
 * Each hook branches on the active rail inside its `queryFn` rather than being
 * duplicated per rail, and normalizes the response before returning it. That
 * keeps the rail out of the components: they read `address` where one rail says
 * `mint` and the other says `tokenAddress`, and `txId` where one says
 * `signature` and the other says `txHash`.
 */

export const cleanHandle = (handle: string) => handle.trim().replace(/^@/, "").toLowerCase();

/** Re-exported so components can reach rail-specific labels and explorers. */
export { useRail, useRailProfile, isSolanaAddress } from "@/lib/rail";
export { isEvmAddress } from "@/lib/robinhoodChain";

/** Truncates a mint, contract or hash for display. */
export const truncateAddress = (value: string, head = 4, tail = 4) =>
  value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;

/** Back-compat alias — the NFT panel and Pending list still call it this. */
export const truncateMint = truncateAddress;

export const solscanTokenUrl = (mint: string) => `https://solscan.io/token/${mint}`;

// -- Assets -----------------------------------------------------------------

export function useAssets(
  params: { q?: string; featured?: boolean; limit?: number; offset?: number } = {},
) {
  const rail = useRail();
  const { q = "", featured = false, limit, offset } = params;

  return useQuery<RailAssets>({
    queryKey: ["tender", rail, "assets", q, featured, limit ?? null, offset ?? null],
    queryFn: async () => {
      if (rail === "robinhood") {
        // V2 serves its whole registry in one response; there is no paging.
        return assetsFromV2(await getAssetsV2({ data: { q: q || undefined, featured } }));
      }
      return assetsFromV1(await getAssets({ data: { q: q || undefined, featured, limit, offset } }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAsset(symbolOrAddress: string) {
  const rail = useRail();
  return useQuery<RailToken>({
    queryKey: ["tender", rail, "asset", symbolOrAddress],
    queryFn: async () =>
      rail === "robinhood"
        ? tokenFromV2(await getAssetV2({ data: { symbolOrAddress } }))
        : tokenFromV1(await getAsset({ data: { symbolOrMint: symbolOrAddress } })),
    enabled: Boolean(symbolOrAddress),
    staleTime: 5 * 60 * 1000,
  });
}

// -- Handles & elections ----------------------------------------------------

export function useHandle(handle: string) {
  const rail = useRail();
  const clean = cleanHandle(handle);

  return useQuery<RailHandle>({
    queryKey: ["tender", rail, "handle", clean],
    queryFn: async () =>
      rail === "robinhood"
        ? handleFromV2(await getHandleV2({ data: { handle: clean } }))
        : handleFromV1(await getHandle({ data: { handle: clean } })),
    enabled: clean.length > 0,
    retry: false,
  });
}

/** Availability check for the claim flow — an unregistered handle resolves, it does not throw. */
export function useHandleAvailability(handle: string, enabled = true) {
  const rail = useRail();
  const clean = cleanHandle(handle);

  return useQuery<RailHandleAvailability>({
    queryKey: ["tender", rail, "handle-availability", clean],
    queryFn: async () => {
      if (rail === "robinhood") {
        const res = await checkHandleV2({ data: { handle: clean } });
        return {
          handle: res.handle,
          registered: res.registered,
          details: res.details ? handleFromV2(res.details) : null,
        };
      }
      const res = await checkHandle({ data: { handle: clean } });
      return {
        handle: res.handle,
        registered: res.registered,
        details: res.details ? handleFromV1(res.details) : null,
      };
    },
    enabled: enabled && clean.length >= 3,
    staleTime: 30 * 1000,
  });
}

/**
 * Handles registered to a wallet.
 *
 * Robinhood Chain has no `handles/owner/:wallet` route yet, so the switcher
 * falls back to placeholder rows flagged `isDemo`.
 */
export function useOwnerHandles(wallet: string | null | undefined) {
  const rail = useRail();
  const profile = useRailProfile();
  const clean = (wallet ?? "").trim();

  return useQuery<RailMaybeDemo<string[]>>({
    queryKey: ["tender", rail, "owner-handles", clean],
    queryFn: async () => {
      try {
        if (rail === "robinhood") {
          const res = await getHandlesByOwnerV2({ data: { wallet: clean } });
          return { data: res?.handles ?? [], isDemo: false };
        }
        const res = await getHandlesByOwner({ data: { wallet: clean } });
        return { data: res?.handles ?? [], isDemo: false };
      } catch {
        return { data: [], isDemo: false };
      }
    },
    enabled: profile.isAddress(clean),
    staleTime: 30 * 1000,
  });
}

export function useRegisterHandle() {
  const rail = useRail();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      handle: string;
      ownerWallet: string;
      xHandle?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: Record<string, any>;
      elections: RailElectionInput[];
    }) =>
      rail === "robinhood"
        ? registerHandleV2({
            data: {
              handle: input.handle,
              ownerWallet: input.ownerWallet,
              xHandle: input.xHandle,
              metadata: input.metadata,
              elections: input.elections.map((e) => ({
                symbol: e.symbol,
                tokenAddress: e.address,
                basisPoints: e.basisPoints,
              })),
            },
          })
        : registerHandle({
            data: {
              handle: input.handle,
              ownerWallet: input.ownerWallet,
              metadata: input.metadata,
              elections: input.elections.map((e) => ({
                symbol: e.symbol,
                mint: e.address,
                basisPoints: e.basisPoints,
              })),
            },
          }),
    onSuccess: (_data, variables) => {
      const clean = cleanHandle(variables.handle);
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "handle", clean] });
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "handle-availability", clean] });
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "owner-handles"] });
    },
  });
}

export function useUpdateElections() {
  const rail = useRail();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      handle: string;
      ownerWallet?: string;
      elections: RailElectionInput[];
    }) =>
      rail === "robinhood"
        ? updateElectionsV2({
            data: {
              handle: input.handle,
              ownerWallet: input.ownerWallet,
              elections: input.elections.map((e) => ({
                symbol: e.symbol,
                tokenAddress: e.address,
                basisPoints: e.basisPoints,
              })),
            },
          })
        : updateElections({
            data: {
              handle: input.handle,
              ownerWallet: input.ownerWallet,
              elections: input.elections.map((e) => ({
                symbol: e.symbol,
                mint: e.address,
                basisPoints: e.basisPoints,
              })),
            },
          }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tender", rail, "handle", cleanHandle(variables.handle)],
      });
    },
  });
}

// -- Quotes -----------------------------------------------------------------

export function useElectionQuote(params: {
  recipientHandle?: string;
  fromSymbolOrAddress: string;
  amountIn: number | string;
  userWallet?: string;
  slippageBps?: number;
}) {
  const rail = useRail();
  const clean = params.recipientHandle ? cleanHandle(params.recipientHandle) : "";
  const amount = Number(params.amountIn);
  const enabled = clean.length > 0 && Number.isFinite(amount) && amount > 0;

  return useQuery<RailElectionQuote>({
    queryKey: [
      "tender",
      rail,
      "election-quote",
      clean,
      params.fromSymbolOrAddress,
      params.amountIn,
      params.slippageBps ?? null,
    ],
    queryFn: async () => {
      if (rail === "robinhood") {
        return electionQuoteFromV2(
          await getElectionQuoteV2({
            data: {
              recipientHandle: clean,
              fromSymbolOrAddress: params.fromSymbolOrAddress,
              amountIn: amount,
              userWallet: params.userWallet || undefined,
              slippageBps: params.slippageBps,
            },
          }),
        );
      }
      return electionQuoteFromV1(
        await getElectionQuote({
          data: {
            recipientHandle: clean,
            fromSymbolOrMint: params.fromSymbolOrAddress,
            amountIn: amount,
            userWallet: params.userWallet || undefined,
            slippageBps: params.slippageBps,
          },
        }),
      );
    },
    enabled,
    retry: false,
    // Routes move; the spec asks for a live refresh while the composer is open.
    refetchInterval: enabled ? 15_000 : false,
  });
}

// -- Settlement -------------------------------------------------------------

export type SettlementLegResult = RailSettlementLeg;
export type SettlementResult = RailSettlementResult;

/**
 * Whether a V2 quote step carries a call the wallet can actually execute.
 *
 * The rail currently returns placeholder steps for some pairs — `to` set to the
 * recipient with empty calldata — which would broadcast a zero-value self-send
 * that moves nothing while looking like a successful settlement. An approval
 * step is the one legitimate case for empty calldata, because the arguments
 * arrive separately and are encoded client-side.
 */
const hasCalldata = (data: string | undefined) => Boolean(data) && data !== "0x" && data !== "0x0";
const hasValue = (val: string | undefined) => {
  if (!val) return false;
  try {
    return BigInt(val) > 0n;
  } catch {
    return false;
  }
};

export function isExecutableStep(step: V2Step): boolean {
  return step.items.some((item) => {
    if (step.id === "approve") return Boolean(item.data.args?.length) || hasCalldata(item.data.data);
    return hasCalldata(item.data.data) || hasValue(item.data.value);
  });
}

/** True when at least one leg of a Robinhood quote can be signed. */
export function quoteIsExecutable(quote: RailElectionQuote | undefined): boolean {
  if (!quote) return false;
  if (quote.rail !== "robinhood") return quote.legs.length > 0;
  return quote.legs.some((leg) => (leg.quote.raw?.steps ?? []).some(isExecutableStep));
}

/** Turns one V2 step item into a signable call, encoding approvals client-side. */
function stepToTx(step: V2Step, item: V2Step["items"][number]) {
  if (step.id === "approve" && !hasCalldata(item.data.data) && item.data.args?.length) {
    const [spender, amount] = item.data.args;
    return {
      to: item.data.to,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender as `0x${string}`, BigInt(amount)],
      }),
      value: "0",
    };
  }
  return { to: item.data.to, data: item.data.data, value: item.data.value };
}

/**
 * Builds, signs and records one settlement per election leg.
 *
 * The two rails execute differently and the branch is unavoidable. Solana asks
 * the backend to assemble a transaction per winning quote and signs that;
 * Robinhood gets pre-built steps inside the quote and sends each one, so an
 * approval and its swap are two wallet prompts rather than one.
 */
export function useSettlePortfolio() {
  const rail = useRail();
  const queryClient = useQueryClient();
  const { signAndSendBase64, sendTransaction } = useWallet();

  return useMutation<
    RailSettlementResult,
    Error,
    { quote: RailElectionQuote; userWallet: string; recipientHandle?: string }
  >({
    mutationFn: async ({ quote, userWallet, recipientHandle }) => {
      const legs = quote.legs ?? [];
      if (legs.length === 0) throw new Error("Quote has no settlement legs.");

      const results: RailSettlementLeg[] = [];

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];

        // Give the wallet popup time to settle cleanly between signatures.
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          const txId =
            rail === "robinhood"
              ? await settleLegOnRobinhood(leg, sendTransaction)
              : await settleLegOnSolana(leg, quote, userWallet, signAndSendBase64);

          if (!txId.id) {
            results.push({ symbol: leg.assetSymbol, skippedReason: txId.reason });
            continue;
          }

          await recordSettlement({
            rail,
            txId: txId.id,
            userWallet,
            recipientHandle,
            quote,
            leg,
          });

          results.push({ symbol: leg.assetSymbol, txId: txId.id });
        } catch (err) {
          console.error(`[useSettlePortfolio] leg ${leg.assetSymbol} failed:`, err);
          // Once a leg is on-chain, surface what did execute rather than
          // discarding it behind an error for the legs that did not.
          if (results.some((r) => r.txId)) break;
          throw err;
        }
      }

      return {
        legs: results,
        txIds: results.map((r) => r.txId).filter((t): t is string => Boolean(t)),
        rail,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "settlement-history"] });
    },
  });
}

type LegOutcome = { id: string | null; reason?: string };

async function settleLegOnSolana(
  leg: RailElectionQuote["legs"][number],
  quote: RailElectionQuote,
  userWallet: string,
  sign: (base64: string) => Promise<string>,
): Promise<LegOutcome> {
  const plan = await buildSettlementTx({
    data: { userWallet, recipientWallet: quote.recipientWallet, quote: leg.quote.raw },
  });

  if (!plan.base64Transaction) {
    return {
      id: null,
      reason: `${plan.provider} route returned steps, not a signable transaction`,
    };
  }
  return { id: await sign(plan.base64Transaction) };
}

async function settleLegOnRobinhood(
  leg: RailElectionQuote["legs"][number],
  send: (tx: { to: string; data?: string; value?: string }) => Promise<string>,
): Promise<LegOutcome> {
  const steps: V2Step[] = leg.quote.raw?.steps ?? [];
  const executable = steps.filter(isExecutableStep);

  if (executable.length === 0) {
    return {
      id: null,
      reason:
        "Uniswap V4 returned no executable route for this leg — the rail has not published an executable route yet",
    };
  }

  // The swap is the last executable step; approvals run ahead of it and their
  // hashes are not the settlement receipt.
  let last = "";
  for (const step of executable) {
    for (const item of step.items) {
      const tx = stepToTx(step, item);
      if (!hasCalldata(tx.data) && !hasValue(tx.value)) continue;
      last = await send(tx);
    }
  }
  return { id: last || null, reason: last ? undefined : "No step produced a transaction." };
}

async function recordSettlement({
  rail,
  txId,
  userWallet,
  recipientHandle,
  quote,
  leg,
}: {
  rail: RailId;
  txId: string;
  userWallet: string;
  recipientHandle?: string;
  quote: RailElectionQuote;
  leg: RailElectionQuote["legs"][number];
}) {
  const inputAmount = leg.allocatedInAmountFormatted || leg.allocatedInAmount;
  const outputBreakdown = [{ symbol: leg.assetSymbol, amount: leg.quote.amountOutFormatted }];

  if (rail === "robinhood") {
    await confirmSettlementV2({
      data: {
        txHash: txId,
        senderWallet: userWallet,
        recipientHandle: recipientHandle ? cleanHandle(recipientHandle) : undefined,
        recipientWallet: quote.recipientWallet,
        inputTokenSymbol: quote.inputToken?.symbol ?? leg.quote.fromToken?.symbol ?? "",
        inputAmount,
        outputBreakdown,
      },
    });
    return;
  }

  await confirmSettlement({
    data: {
      signature: txId,
      senderWallet: userWallet,
      recipientHandle: recipientHandle ? cleanHandle(recipientHandle) : undefined,
      recipientWallet: quote.recipientWallet,
      inputMint: quote.inputToken?.address ?? leg.quote.fromToken?.address ?? "",
      inputAmount,
      outputBreakdown,
    },
  });
}

/**
 * Confirmed settlement receipts.
 *
 * Robinhood Chain has no `settle/history` route yet, so the table shows
 * placeholder rows flagged `isDemo`.
 */
export function useSettlementHistory(
  params: { wallet?: string | null; handle?: string | null; limit?: number; offset?: number } = {},
) {
  const rail = useRail();
  const cleanWallet = (params.wallet ?? "").trim();
  const cleanHandleStr = cleanHandle(params.handle ?? "");

  return useQuery<RailMaybeDemo<RailSettlementRecord[]>>({
    queryKey: [
      "tender",
      rail,
      "settlement-history",
      cleanWallet,
      cleanHandleStr,
      params.limit,
      params.offset,
    ],
    queryFn: async () => {
      if (rail === "robinhood") {
        const res = await getSettlementHistoryV2({
          data: {
            wallet: cleanWallet || undefined,
            handle: cleanHandleStr || undefined,
            limit: params.limit,
            offset: params.offset,
          },
        });
        return { data: (res.settlements ?? []).map(settlementFromV2), isDemo: false };
      }
      const res = await getSettlementHistory({
        data: {
          wallet: cleanWallet || undefined,
          handle: cleanHandleStr || undefined,
          limit: params.limit,
          offset: params.offset,
        },
      });
      return { data: (res.settlements ?? []).map(settlementFromV1), isDemo: false };
    },
    staleTime: 15 * 1000,
  });
}

// -- Invoices ---------------------------------------------------------------

export function useCreateInvoice() {
  const rail = useRail();
  const queryClient = useQueryClient();

  return useMutation<
    RailInvoice,
    Error,
    {
      recipientHandle: string;
      amount: number | string;
      tokenAddress?: string;
      tokenSymbol?: string;
      memo?: string;
      expiryMinutes?: number;
      creatorWallet?: string;
      creatorHandle?: string;
    }
  >({
    mutationFn: async (input) => {
      if (rail === "robinhood") {
        return invoiceFromV2(
          await createInvoiceV2({
            data: {
              recipientHandle: input.recipientHandle,
              targetAmount: input.amount,
              targetTokenSymbol: input.tokenSymbol,
              targetTokenAddress: input.tokenAddress,
              memo: input.memo,
              expiryMinutes: input.expiryMinutes,
              creatorWallet: input.creatorWallet,
              creatorHandle: input.creatorHandle,
            },
          }),
        );
      }
      return invoiceFromV1(
        await createInvoice({
          data: {
            recipientHandle: input.recipientHandle,
            amount: input.amount,
            tokenMint: input.tokenAddress,
            tokenSymbol: input.tokenSymbol,
            memo: input.memo,
            expiryMinutes: input.expiryMinutes,
            creatorWallet: input.creatorWallet,
            creatorHandle: input.creatorHandle,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "invoices"] });
    },
  });
}

export function useInvoice(invoiceId: string | null | undefined) {
  const rail = useRail();
  const cleanId = (invoiceId ?? "").trim();

  return useQuery<RailInvoiceDetails>({
    queryKey: ["tender", rail, "invoice", cleanId],
    queryFn: async () => {
      if (rail === "robinhood") {
        const res = await getInvoiceV2({ data: { id: cleanId } });
        return {
          invoice: invoiceFromV2(res.invoice),
          elections: (res.elections ?? []).map((e) => ({
            symbol: e.symbol,
            address: e.tokenAddress,
            basisPoints: e.basisPoints,
          })),
        };
      }
      const res = await getInvoice({ data: { id: cleanId } });
      return {
        invoice: invoiceFromV1(res.invoice),
        elections: (res.elections ?? []).map((e) => ({
          symbol: e.symbol,
          address: e.mint,
          basisPoints: e.basisPoints,
        })),
      };
    },
    enabled: cleanId.length > 0,
    staleTime: 10 * 1000,
  });
}

/**
 * Invoices for a handle or wallet.
 *
 * Robinhood Chain serves a single invoice by id but has no list route, so the
 * table shows placeholder rows flagged `isDemo`.
 */
export function useInvoices(
  params: { handle?: string | null; wallet?: string | null; status?: string } = {},
) {
  const rail = useRail();
  const profile = useRailProfile();
  const cleanHandleStr = cleanHandle(params.handle ?? "");
  const cleanWallet = (params.wallet ?? "").trim();

  return useQuery<RailMaybeDemo<RailInvoice[]>>({
    queryKey: ["tender", rail, "invoices", cleanHandleStr, cleanWallet, params.status ?? "all"],
    queryFn: async () => {
      if (rail === "robinhood") {
        const res = await getInvoicesV2({
          data: {
            handle: cleanHandleStr || undefined,
            recipientWallet: cleanWallet || undefined,
            status: params.status || undefined,
          },
        });
        return { data: (res.invoices ?? []).map(invoiceFromV2), isDemo: false };
      }
      const res = await getInvoices({
        data: {
          handle: cleanHandleStr || undefined,
          wallet: cleanWallet || undefined,
          status: params.status || undefined,
        },
      });
      return { data: (res.invoices ?? []).map(invoiceFromV1), isDemo: false };
    },
    enabled: cleanHandleStr.length > 0 || profile.isAddress(cleanWallet),
    staleTime: 15 * 1000,
  });
}

export function useConfirmInvoicePayment() {
  const rail = useRail();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; txId: string; payerWallet?: string }) =>
      rail === "robinhood"
        ? confirmInvoicePaymentV2({
            data: { id: input.id, txHash: input.txId, payerWallet: input.payerWallet },
          })
        : confirmInvoicePayment({
            data: { id: input.id, signature: input.txId, payerWallet: input.payerWallet },
          }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "invoice", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "settlement-history"] });
    },
  });
}

// -- X (Twitter) account binding --------------------------------------------

/**
 * The X identity bound to a wallet.
 *
 * Robinhood Chain has no `auth/x/account` route yet — the OAuth flow is keyed on
 * Solana wallets — so the gate opens on a placeholder flagged `isDemo`.
 */
export function useXAccount(wallet?: string | null) {
  const rail = useRail();
  const profile = useRailProfile();
  const cleanWallet = (wallet ?? "").trim();

  return useQuery<RailMaybeDemo<{ linked: boolean; account: RailXAccount | null }>>({
    queryKey: ["tender", rail, "x-account", cleanWallet],
    queryFn: async () => {
      try {
        const res = await getXAccount({ data: { wallet: cleanWallet } });
        return {
          data: {
            linked: Boolean(res?.linked),
            account: res?.account
              ? {
                  walletAddress: res.account.walletAddress,
                  xUserId: res.account.xUserId,
                  xUsername: res.account.xUsername,
                  linkedAt: res.account.linkedAt,
                }
              : null,
          },
          isDemo: false,
        };
      } catch {
        return {
          data: { linked: false, account: null },
          isDemo: false,
        };
      }
    },
    enabled: profile.isAddress(cleanWallet),
    staleTime: 30 * 1000,
  });
}

// -- Bot pending queue ------------------------------------------------------

export function usePendingSettlements(params: {
  handle?: string;
  status?: string;
  limit?: number;
}) {
  const rail = useRail();
  const clean = params.handle ? cleanHandle(params.handle) : "";

  return useQuery<RailPendingSettlement[]>({
    queryKey: ["tender", rail, "pending-settlements", clean, params.status || "all"],
    queryFn: async () => {
      const data = {
        handle: clean || undefined,
        status: params.status || undefined,
        limit: params.limit,
      };
      if (rail === "robinhood") {
        const res = await getPendingSettlementsV2({ data });
        return (res.pendingSettlements ?? []).map(pendingFromV2);
      }
      const res = await getPendingSettlements({ data });
      return (res.pendingSettlements ?? []).map(pendingFromV1);
    },
    refetchInterval: 10_000,
  });
}

export function useConfirmPendingSettlement() {
  const rail = useRail();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; txId: string; payerWallet?: string }) =>
      rail === "robinhood"
        ? confirmPendingSettlementV2({
            data: { id: input.id, txHash: input.txId, payerWallet: input.payerWallet },
          })
        : confirmPendingSettlement({
            data: { id: input.id, signature: input.txId, payerWallet: input.payerWallet },
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "pending-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "settlement-history"] });
    },
  });
}

export function useDismissPendingSettlement() {
  const rail = useRail();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string }) =>
      rail === "robinhood"
        ? dismissPendingSettlementV2({ data: input })
        : dismissPendingSettlement({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "pending-settlements"] });
    },
  });
}

// -- Collectibles (sovereign direct transfers) ------------------------------

/**
 * Feature flag: Sovereign NFT Transfers.
 * Gated behind VITE_ENABLE_NFT=true or VITE_NFT_ENABLED=true in the environment.
 */
export const isNftFeatureEnabled = (): boolean => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const v =
      import.meta.env.VITE_ENABLE_NFT ??
      import.meta.env.VITE_NFT_ENABLED ??
      import.meta.env.ENABLE_NFT;
    if (v === "true" || v === "1" || v === true) return true;
  }
  if (typeof process !== "undefined" && process.env) {
    const p = process.env.VITE_ENABLE_NFT ?? process.env.VITE_NFT_ENABLED ?? process.env.ENABLE_NFT;
    if (p === "true" || p === "1") return true;
  }
  return false;
};

export const useIsNftEnabled = () => isNftFeatureEnabled();

/** A collectible reference: a mint on Solana, a contract plus token id on Robinhood. */
export interface NftRef {
  address: string;
  tokenId?: string;
}

/** Whether a reference is complete enough to resolve on the active rail. */
export function useIsNftRefValid() {
  const rail = useRail();
  const profile = useRailProfile();
  return (ref: NftRef | null | undefined) => {
    if (!ref?.address || !profile.isAddress(ref.address)) return false;
    // An ERC-721 contract addresses a whole collection; without the id there is
    // nothing to resolve.
    return rail === "robinhood" ? Boolean(ref.tokenId?.trim()) : true;
  };
}

export function useNftMetadata(ref: NftRef | null | undefined) {
  const rail = useRail();
  const profile = useRailProfile();
  const address = (ref?.address ?? "").trim();
  const tokenId = (ref?.tokenId ?? "").trim();

  const valid =
    profile.isAddress(address) && (rail === "robinhood" ? tokenId.length > 0 : true);

  return useQuery<RailNft>({
    queryKey: ["tender", rail, "nft", address, tokenId],
    queryFn: async () => {
      if (rail === "robinhood") {
        return nftFromV2(
          await getNftMetadataV2({ data: { contractAddress: address, tokenId } }),
        );
      }
      const res = await getNftMetadata({ data: { mint: address } });
      return nftFromV1(res.nft);
    },
    enabled: valid,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Collectibles held by a wallet, for the picker grid.
 *
 * Robinhood Chain has no `nft/wallet/:wallet` scan yet — indexing ERC-721
 * holdings needs a service the rail does not run — so the grid shows
 * placeholder cards flagged `isDemo`.
 */
export function useWalletNfts(wallet: string | null | undefined) {
  const rail = useRail();
  const profile = useRailProfile();
  const clean = (wallet ?? "").trim();

  return useQuery<RailMaybeDemo<RailNft[]>>({
    queryKey: ["tender", rail, "wallet-nfts", clean],
    queryFn: async () => {
      if (rail === "robinhood") {
        return { data: demoWalletNfts(), isDemo: true, demoReason: DEMO_REASON };
      }
      const res = await getWalletNfts({ data: { wallet: clean } });
      return { data: (res.nfts ?? []).map(nftFromV1), isDemo: false };
    },
    enabled: profile.isAddress(clean),
    retry: false,
    staleTime: 60 * 1000,
  });
}

/**
 * Builds, signs and sends one direct collectible transfer.
 *
 * Deliberately never touches the quote engine: a collectible is delivered 1:1
 * and never routed through a DEX, so there is no election to slice and no route
 * to price. Both rails bake recipient setup into the transaction the backend
 * returns, which is why this is a single signature rather than a leg loop.
 */
export function useTransferNft() {
  const rail = useRail();
  const queryClient = useQueryClient();
  const { signAndSendBase64, sendTransaction } = useWallet();

  return useMutation<
    RailNftTransferResult,
    Error,
    { userWallet: string; nft: NftRef; recipientTag?: string; recipientWallet?: string }
  >({
    mutationFn: async ({ userWallet, nft, recipientTag, recipientWallet }) => {
      if (rail === "robinhood") {
        if (!nft.tokenId) {
          throw new Error("A token id is required to transfer an ERC-721 collectible.");
        }
        const target = recipientTag ? `@${cleanHandle(recipientTag)}` : recipientWallet;
        if (!target) throw new Error("A recipient tag or wallet is required.");

        const plan = await buildNftTransferPlanV2({
          data: {
            fromWallet: userWallet,
            target,
            contractAddress: nft.address,
            tokenId: nft.tokenId,
          },
        });

        const txId = await sendTransaction({
          to: plan.transaction.to,
          data: plan.transaction.data,
          value: plan.transaction.value,
        });

        return {
          txId,
          nft: {
            address: plan.token.contractAddress,
            tokenId: plan.token.tokenId,
            name: plan.token.name,
            symbol: plan.token.symbol,
            image: plan.token.image,
            rail: "robinhood",
          },
          recipientWallet: plan.recipient.walletAddress,
          recipientHandle: plan.recipient.handle,
        };
      }

      const plan = await buildNftTransferPlan({
        data: {
          userWallet,
          nftMint: nft.address,
          recipientTag: recipientTag ? cleanHandle(recipientTag) : undefined,
          recipientWallet: recipientWallet || undefined,
        },
      });

      if (!plan.base64Transaction) {
        throw new Error("The rail returned no signable transaction for this collectible.");
      }

      return {
        txId: await signAndSendBase64(plan.base64Transaction),
        nft: nftFromV1(plan.nft),
        recipientWallet: plan.recipientWallet,
        recipientHandle: plan.recipientHandle,
      };
    },
    onSuccess: (_result, variables) => {
      // The sender no longer holds it, so the picker has to forget it.
      queryClient.invalidateQueries({
        queryKey: ["tender", rail, "wallet-nfts", variables.userWallet],
      });
      queryClient.invalidateQueries({ queryKey: ["tender", rail, "settlement-history"] });
    },
  });
}

export { nftKey } from "@/lib/rail-normalize";
