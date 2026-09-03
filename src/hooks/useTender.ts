import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useWallet } from "@/lib/wallet/wallet-context";
import {
  buildSettlementTx,
  checkHandle,
  confirmInvoicePayment,
  confirmSettlement,
  createInvoice,
  getAsset,
  getAssets,
  getElectionQuote,
  getHandle,
  getHandlesByOwner,
  getInvoice,
  getInvoices,
  getSettlementHistory,
  getXAccount,
  getPendingSettlements,
  confirmPendingSettlement,
  dismissPendingSettlement,
  registerHandle,
  updateElections,
} from "@/lib/tender-server-fns";
import type {
  AssetsResponse,
  ElectionInput,
  ElectionQuoteResponse,
  HandleAvailability,
  HandleDetailsResponse,
  InvoiceDetailsResponse,
  InvoiceListResponse,
  InvoiceResponse,
  OwnerHandlesResponse,
  PortfolioQuoteLeg,
  SettlementHistoryResponse,
  SolanaTokenInfo,
  XAccountResponse,
  PendingSettlementsResponse,
} from "@/types/tender";

/**
 * Every hook here goes through a TanStack Start server function, so the network
 * call to the TENDER API is made by our own server. The browser only ever talks
 * to its own origin and never triggers a CORS preflight.
 */

const cleanHandle = (handle: string) => handle.trim().replace(/^@/, "").toLowerCase();

// -- Assets -----------------------------------------------------------------

export function useAssets(
  params: { q?: string; featured?: boolean; limit?: number; offset?: number } = {},
) {
  const { q = "", featured = false, limit, offset } = params;
  return useQuery<AssetsResponse>({
    queryKey: ["tender", "assets", q, featured, limit ?? null, offset ?? null],
    queryFn: () => getAssets({ data: { q: q || undefined, featured, limit, offset } }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAsset(symbolOrMint: string) {
  return useQuery<SolanaTokenInfo>({
    queryKey: ["tender", "asset", symbolOrMint],
    queryFn: () => getAsset({ data: { symbolOrMint } }),
    enabled: Boolean(symbolOrMint),
    staleTime: 5 * 60 * 1000,
  });
}

// -- Handles & elections ----------------------------------------------------

export function useHandle(handle: string) {
  const clean = cleanHandle(handle);
  return useQuery<HandleDetailsResponse>({
    queryKey: ["tender", "handle", clean],
    queryFn: () => getHandle({ data: { handle: clean } }),
    enabled: clean.length > 0,
    retry: false,
  });
}

/** Availability check for the claim flow — an unregistered handle resolves, it does not throw. */
export function useHandleAvailability(handle: string, enabled = true) {
  const clean = cleanHandle(handle);
  return useQuery<HandleAvailability>({
    queryKey: ["tender", "handle-availability", clean],
    queryFn: () => checkHandle({ data: { handle: clean } }),
    enabled: enabled && clean.length >= 3,
    staleTime: 30 * 1000,
  });
}

export function useOwnerHandles(wallet: string | null | undefined) {
  const clean = (wallet ?? "").trim();
  return useQuery<OwnerHandlesResponse>({
    queryKey: ["tender", "owner-handles", clean],
    queryFn: () => getHandlesByOwner({ data: { wallet: clean } }),
    enabled: clean.length >= 32,
    staleTime: 30 * 1000,
  });
}

export function useRegisterHandle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      handle: string;
      ownerWallet: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: Record<string, any>;
      elections: ElectionInput[];
    }) => registerHandle({ data: input }),
    onSuccess: (_data, variables) => {
      const clean = cleanHandle(variables.handle);
      queryClient.invalidateQueries({ queryKey: ["tender", "handle", clean] });
      queryClient.invalidateQueries({ queryKey: ["tender", "handle-availability", clean] });
      queryClient.invalidateQueries({ queryKey: ["tender", "owner-handles", variables.ownerWallet] });
    },
  });
}

export function useUpdateElections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { handle: string; ownerWallet?: string; elections: ElectionInput[] }) =>
      updateElections({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tender", "handle", cleanHandle(variables.handle)],
      });
    },
  });
}

// -- Quotes -----------------------------------------------------------------

export function useElectionQuote(params: {
  recipientHandle?: string;
  fromSymbolOrMint: string;
  amountIn: number | string;
  userWallet?: string;
  slippageBps?: number;
}) {
  const clean = params.recipientHandle ? cleanHandle(params.recipientHandle) : "";
  const amount = Number(params.amountIn);
  const enabled = clean.length > 0 && Number.isFinite(amount) && amount > 0;

  return useQuery<ElectionQuoteResponse>({
    queryKey: [
      "tender",
      "election-quote",
      clean,
      params.fromSymbolOrMint,
      params.amountIn,
      params.slippageBps ?? null,
    ],
    queryFn: () =>
      getElectionQuote({
        data: {
          recipientHandle: clean,
          fromSymbolOrMint: params.fromSymbolOrMint,
          amountIn: amount,
          userWallet: params.userWallet || undefined,
          slippageBps: params.slippageBps,
        },
      }),
    enabled,
    retry: false,
    // Routes move; the spec asks for a live refresh while the composer is open.
    refetchInterval: enabled ? 15_000 : false,
  });
}

// -- Settlement -------------------------------------------------------------

export interface SettlementLegResult {
  symbol: string;
  signature?: string;
  /** Set when the winning route was Relay, which returns steps instead of a signable tx. */
  skippedReason?: string;
}

export interface SettlementResult {
  legs: SettlementLegResult[];
  signatures: string[];
}

/**
 * Builds, signs and records one transaction per election leg.
 *
 * The backend assembles a transaction per winning quote (see
 * backend/src/services/txBuilder.ts), so a three-asset election means three
 * wallet signatures. Relay-routed legs return steps rather than a signable
 * transaction and are reported back untouched.
 */
export function useSettlePortfolio() {
  const queryClient = useQueryClient();
  const { signAndSendBase64 } = useWallet();

  return useMutation<
    SettlementResult,
    Error,
    { quote: ElectionQuoteResponse; userWallet: string; recipientHandle?: string }
  >({
    mutationFn: async ({ quote, userWallet, recipientHandle }) => {
      const legs: PortfolioQuoteLeg[] = quote.portfolioResult.legs ?? [];
      if (legs.length === 0) throw new Error("Quote has no settlement legs.");

      const results: SettlementLegResult[] = [];

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];

        // Give wallet extension popup time to cleanly settle between multi-leg signatures
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const plan = await buildSettlementTx({
          data: {
            userWallet,
            recipientWallet: quote.recipientWallet,
            quote: leg.quote,
          },
        });

        if (!plan.base64Transaction) {
          results.push({
            symbol: leg.assetSymbol,
            skippedReason: `${plan.provider} route returned steps, not a signable transaction`,
          });
          continue;
        }

        try {
          const signature = await signAndSendBase64(plan.base64Transaction);

          await confirmSettlement({
            data: {
              signature,
              senderWallet: userWallet,
              recipientHandle: recipientHandle ? cleanHandle(recipientHandle) : undefined,
              recipientWallet: quote.recipientWallet,
              inputMint: quote.portfolioResult.inputToken?.mint ?? leg.quote.inputToken?.mint ?? "",
              inputAmount: leg.allocatedInAmountFormatted || leg.allocatedInAmount,
              outputBreakdown: [{ symbol: leg.assetSymbol, amount: leg.quote.outAmountFormatted }],
            },
          });

          results.push({ symbol: leg.assetSymbol, signature });
        } catch (err: any) {
          console.error(`[useSettlePortfolio] Error executing leg ${leg.assetSymbol}:`, err);
          // If at least one leg already executed on-chain, return the executed signatures rather than discarding progress
          if (results.some((r) => r.signature)) {
            break;
          }
          throw err;
        }
      }

      return {
        legs: results,
        signatures: results.map((r) => r.signature).filter((s): s is string => Boolean(s)),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender", "settlement-history"] });
    },
  });
}

export function useSettlementHistory(params: {
  wallet?: string | null;
  handle?: string | null;
  limit?: number;
  offset?: number;
} = {}) {
  const cleanWallet = (params.wallet ?? "").trim();
  const cleanHandleStr = (params.handle ?? "").trim().replace(/^@/, "").toLowerCase();

  return useQuery<SettlementHistoryResponse>({
    queryKey: ["tender", "settlement-history", cleanWallet, cleanHandleStr, params.limit, params.offset],
    queryFn: () =>
      getSettlementHistory({
        data: {
          wallet: cleanWallet || undefined,
          handle: cleanHandleStr || undefined,
          limit: params.limit,
          offset: params.offset,
        },
      }),
    staleTime: 15 * 1000,
  });
}

// -- Invoices ---------------------------------------------------------------

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      recipientHandle: string;
      amount: number | string;
      tokenMint?: string;
      tokenSymbol?: string;
      memo?: string;
      expiryMinutes?: number;
      creatorWallet?: string;
      creatorHandle?: string;
    }) => createInvoice({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender", "invoices"] });
    },
  });
}

export function useInvoice(invoiceId: string | null | undefined) {
  const cleanId = (invoiceId ?? "").trim();
  return useQuery<InvoiceDetailsResponse>({
    queryKey: ["tender", "invoice", cleanId],
    queryFn: () => getInvoice({ data: { id: cleanId } }),
    enabled: cleanId.length > 0,
    staleTime: 10 * 1000,
  });
}

export function useInvoices(params: { handle?: string | null; wallet?: string | null; status?: string } = {}) {
  const cleanHandle = (params.handle ?? "").trim().replace(/^@/, "").toLowerCase();
  const cleanWallet = (params.wallet ?? "").trim();

  return useQuery<InvoiceListResponse>({
    queryKey: ["tender", "invoices", cleanHandle, cleanWallet, params.status ?? "all"],
    queryFn: () =>
      getInvoices({
        data: {
          handle: cleanHandle || undefined,
          wallet: cleanWallet || undefined,
          status: params.status || undefined,
        },
      }),
    enabled: cleanHandle.length > 0 || cleanWallet.length >= 32,
    staleTime: 15 * 1000,
  });
}

export function useConfirmInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; signature: string; payerWallet?: string }) =>
      confirmInvoicePayment({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tender", "invoice", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["tender", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["tender", "settlement-history"] });
    },
  });
}

// -- X (Twitter) Account Binding --------------------------------------------

export function useXAccount(wallet?: string | null) {
  const cleanWallet = (wallet ?? "").trim();
  return useQuery<XAccountResponse>({
    queryKey: ["tender", "x-account", cleanWallet],
    queryFn: () => getXAccount({ data: { wallet: cleanWallet } }),
    enabled: Boolean(cleanWallet && cleanWallet.length >= 32),
    staleTime: 30 * 1000,
  });
}

// -- Bot Pending Settlements ------------------------------------------------

export function usePendingSettlements(params: {
  handle?: string;
  status?: string;
  limit?: number;
}) {
  const clean = params.handle ? cleanHandle(params.handle) : "";
  return useQuery<PendingSettlementsResponse>({
    queryKey: ["tender", "pending-settlements", clean, params.status || "all"],
    queryFn: () =>
      getPendingSettlements({
        data: {
          handle: clean || undefined,
          status: params.status || undefined,
          limit: params.limit,
        },
      }),
    refetchInterval: 10_000,
  });
}

export function useConfirmPendingSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; signature: string; payerWallet?: string }) =>
      confirmPendingSettlement({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender", "pending-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["tender", "settlement-history"] });
    },
  });
}

export function useDismissPendingSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string }) => dismissPendingSettlement({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender", "pending-settlements"] });
    },
  });
}

