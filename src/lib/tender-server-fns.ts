/**
 * Server functions wrapping the TENDER API.
 *
 * The browser calls these over the same-origin RPC endpoint of TanStack Start;
 * the actual fetch to api.tenderrwa.com happens in the server runtime (see
 * src/server/tender-api.ts, which the build strips from the client bundle).
 * That is what keeps the app free of CORS: no component ever fetches the API
 * host directly.
 *
 * This file lives outside src/server/ because client code imports the RPC
 * stubs; the plugin that guards src/server/** denies that.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
  AssetsResponse,
  BuildTxPlanResponse,
  ConfirmSettlementResponse,
  DualQuoteResponse,
  ElectionQuoteResponse,
  HandleAvailability,
  HandleDetailsResponse,
  InvoiceDetailsResponse,
  InvoiceListResponse,
  InvoiceResponse,
  OwnerHandlesResponse,
  RegisterHandleResponse,
  SettlementHistoryResponse,
  SolanaTokenInfo,
  UpdateElectionsResponse,
  XAccountResponse,
} from "@/types/tender";

import { TenderApiError, tenderFetch } from "@/server/tender-api";

/** Collapse upstream errors into a plain Error so the message survives RPC serialization. */
async function proxy<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (err instanceof TenderApiError) {
      throw new Error(err.details ? `${err.message} (${err.details})` : err.message);
    }
    throw err;
  }
}

const handleSchema = z
  .string()
  .trim()
  .transform((h) => h.replace(/^@/, "").toLowerCase())
  .pipe(z.string().min(1, "handle is required"));

const electionInputSchema = z.object({
  symbol: z.string().trim().min(1),
  mint: z.string().trim().min(32).optional(),
  basisPoints: z.number().int().min(0).max(10_000),
});

type ElectionInputSchema = z.infer<typeof electionInputSchema>;
type ResolvedElection = { symbol: string; mint: string; basisPoints: number };

/** Elections may arrive symbol-only; the mint lookup is another server-side hop. */
async function resolveElections(elections: ElectionInputSchema[]): Promise<ResolvedElection[]> {
  return Promise.all(
    elections.map(async (election) => {
      if (election.mint) return { ...election, mint: election.mint };
      const token = await tenderFetch<SolanaTokenInfo>(
        `/api/v1/assets/${encodeURIComponent(election.symbol)}`,
      );
      return { symbol: token.symbol, mint: token.mint, basisPoints: election.basisPoints };
    }),
  );
}

// -- Asset registry ---------------------------------------------------------

export const getAssets = createServerFn({ method: "GET" })
  .validator(
    z.object({
      q: z.string().trim().optional(),
      featured: z.boolean().optional(),
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().min(0).optional(),
    }),
  )
  .handler(({ data }): Promise<AssetsResponse> =>
    proxy(() =>
      tenderFetch<AssetsResponse>("/api/v1/assets", {
        query: {
          q: data.q || undefined,
          featured: data.featured ? "true" : undefined,
          limit: data.limit,
          offset: data.offset,
        },
      }),
    ),
  );

export const getAsset = createServerFn({ method: "GET" })
  .validator(z.object({ symbolOrMint: z.string().trim().min(1) }))
  .handler(({ data }): Promise<SolanaTokenInfo> =>
    proxy(() =>
      tenderFetch<SolanaTokenInfo>(`/api/v1/assets/${encodeURIComponent(data.symbolOrMint)}`),
    ),
  );

// -- Handles & elections ----------------------------------------------------

export const getHandle = createServerFn({ method: "GET" })
  .validator(z.object({ handle: handleSchema }))
  .handler(({ data }): Promise<HandleDetailsResponse> =>
    proxy(() =>
      tenderFetch<HandleDetailsResponse>(`/api/v1/handles/${encodeURIComponent(data.handle)}`),
    ),
  );

/** Availability probe: a 404 is the "free to claim" answer, not a failure. */
export const checkHandle = createServerFn({ method: "GET" })
  .validator(z.object({ handle: handleSchema }))
  .handler(async ({ data }): Promise<HandleAvailability> => {
    try {
      const details = await tenderFetch<HandleDetailsResponse>(
        `/api/v1/handles/${encodeURIComponent(data.handle)}`,
      );
      return { handle: data.handle, registered: true, details };
    } catch (err) {
      if (err instanceof TenderApiError && err.status === 404) {
        return { handle: data.handle, registered: false, details: null };
      }
      throw err instanceof TenderApiError ? new Error(err.message) : err;
    }
  });

export const getHandlesByOwner = createServerFn({ method: "GET" })
  .validator(z.object({ wallet: z.string().trim().min(32) }))
  .handler(({ data }): Promise<OwnerHandlesResponse> =>
    proxy(() =>
      tenderFetch<OwnerHandlesResponse>(`/api/v1/handles/owner/${encodeURIComponent(data.wallet)}`)
    ),
  );

export const registerHandle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      handle: handleSchema,
      ownerWallet: z.string().trim().min(32, "a Solana wallet address is required"),
      metadata: z.record(z.string(), z.any()).optional(),
      elections: z.array(electionInputSchema).min(1),
    }),
  )
  .handler(({ data }): Promise<RegisterHandleResponse> =>
    proxy(async () =>
      tenderFetch<RegisterHandleResponse>("/api/v1/handles/register", {
        method: "POST",
        body: {
          handle: data.handle,
          ownerWallet: data.ownerWallet,
          metadata: data.metadata ?? {},
          elections: await resolveElections(data.elections),
        },
      }),
    ),
  );

export const updateElections = createServerFn({ method: "POST" })
  .validator(
    z.object({
      handle: handleSchema,
      ownerWallet: z.string().trim().min(32).optional(),
      elections: z.array(electionInputSchema).min(1),
    }),
  )
  .handler(({ data }): Promise<UpdateElectionsResponse> =>
    proxy(async () =>
      tenderFetch<UpdateElectionsResponse>(
        `/api/v1/handles/${encodeURIComponent(data.handle)}/elections`,
        {
          method: "PUT",
          body: {
            ownerWallet: data.ownerWallet,
            elections: await resolveElections(data.elections),
          },
        },
      ),
    ),
  );

// -- Dual-provider routing & settlement -------------------------------------

export const getSettleQuote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fromSymbolOrMint: z.string().trim().min(1),
      toSymbolOrMint: z.string().trim().min(1),
      amountIn: z.union([z.number().positive(), z.string().min(1)]),
      userWallet: z.string().trim().optional(),
      recipientWallet: z.string().trim().optional(),
      slippageBps: z.number().int().min(0).max(10_000).optional(),
    }),
  )
  .handler(({ data }): Promise<DualQuoteResponse> =>
    proxy(() =>
      tenderFetch<DualQuoteResponse>("/api/v1/settle/quote", { method: "POST", body: data }),
    ),
  );

export const getElectionQuote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      recipientHandle: handleSchema.optional(),
      fromSymbolOrMint: z.string().trim().min(1),
      amountIn: z.union([z.number().positive(), z.string().min(1)]),
      customElections: z.array(electionInputSchema).optional(),
      userWallet: z.string().trim().optional(),
      slippageBps: z.number().int().min(0).max(10_000).optional(),
    }),
  )
  .handler(({ data }): Promise<ElectionQuoteResponse> =>
    proxy(async () =>
      tenderFetch<ElectionQuoteResponse>("/api/v1/settle/election-quote", {
        method: "POST",
        body: {
          ...data,
          customElections: data.customElections
            ? await resolveElections(data.customElections)
            : undefined,
        },
      }),
    ),
  );

export const buildSettlementTx = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userWallet: z.string().trim().min(32),
      recipientWallet: z.string().trim().min(32).optional(),
      quote: z.any(),
    }),
  )
  .handler(({ data }): Promise<BuildTxPlanResponse> =>
    proxy(() =>
      tenderFetch<BuildTxPlanResponse>("/api/v1/settle/build-tx", { method: "POST", body: data }),
    ),
  );

export const confirmSettlement = createServerFn({ method: "POST" })
  .validator(
    z.object({
      signature: z.string().trim().min(1),
      senderWallet: z.string().trim().min(32),
      recipientHandle: handleSchema.optional(),
      recipientWallet: z.string().trim().min(32),
      inputMint: z.string().trim().min(32),
      inputAmount: z.string().trim().min(1),
      outputBreakdown: z.array(z.object({ symbol: z.string(), amount: z.string() })).optional(),
    }),
  )
  .handler(({ data }): Promise<ConfirmSettlementResponse> =>
    proxy(() =>
      tenderFetch<ConfirmSettlementResponse>("/api/v1/settle/confirm", {
        method: "POST",
        body: data,
      }),
    ),
  );

export const getSettlementHistory = createServerFn({ method: "GET" })
  .validator(
    z.object({
      wallet: z.string().trim().optional(),
      handle: z.string().trim().optional(),
      limit: z.number().int().positive().max(100).optional(),
      offset: z.number().int().min(0).optional(),
    }),
  )
  .handler(({ data }): Promise<SettlementHistoryResponse> =>
    proxy(() =>
      tenderFetch<SettlementHistoryResponse>("/api/v1/settle/history", {
        query: {
          wallet: data.wallet || undefined,
          handle: data.handle || undefined,
          limit: data.limit,
          offset: data.offset,
        },
      }),
    ),
  );

// -- Invoices ---------------------------------------------------------------

export const createInvoice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      recipientHandle: handleSchema,
      amount: z.union([z.number().positive(), z.string().min(1)]),
      tokenMint: z.string().trim().min(32).optional(),
      memo: z.string().trim().optional(),
      expiryMinutes: z.number().int().positive().optional(),
      creatorWallet: z.string().trim().optional(),
      creatorHandle: z.string().trim().optional(),
    }),
  )
  .handler(({ data }): Promise<InvoiceResponse> =>
    proxy(() => tenderFetch<InvoiceResponse>("/api/v1/invoices", { method: "POST", body: data })),
  );

export const getInvoice = createServerFn({ method: "GET" })
  .validator(
    z.object({
      id: z.string().trim().min(1),
    }),
  )
  .handler(({ data }): Promise<InvoiceDetailsResponse> =>
    proxy(() =>
      tenderFetch<InvoiceDetailsResponse>(`/api/v1/invoices/${encodeURIComponent(data.id)}`),
    ),
  );

export const getInvoices = createServerFn({ method: "GET" })
  .validator(
    z.object({
      handle: z.string().trim().optional(),
      wallet: z.string().trim().optional(),
      status: z.string().trim().optional(),
    }),
  )
  .handler(({ data }): Promise<InvoiceListResponse> =>
    proxy(() =>
      tenderFetch<InvoiceListResponse>("/api/v1/invoices", {
        query: {
          handle: data.handle || undefined,
          wallet: data.wallet || undefined,
          status: data.status || undefined,
        },
      }),
    ),
  );

export const confirmInvoicePayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().trim().min(1),
      signature: z.string().trim().min(32),
      payerWallet: z.string().trim().optional(),
    }),
  )
  .handler(({ data }): Promise<{ message: string; invoice: InvoiceResponse }> =>
    proxy(() =>
      tenderFetch<{ message: string; invoice: InvoiceResponse }>(
        `/api/v1/invoices/${encodeURIComponent(data.id)}/confirm`,
        {
          method: "POST",
          body: {
            signature: data.signature,
            payerWallet: data.payerWallet,
          },
        },
      ),
    ),
  );

// ── X (Twitter) Account ───────────────────────────────────────────────────

export const getXAccount = createServerFn({ method: "GET" })
  .validator(
    z.object({
      wallet: z.string().trim().min(32, "wallet address required"),
    }),
  )
  .handler(({ data }): Promise<XAccountResponse> =>
    proxy(() =>
      tenderFetch<XAccountResponse>("/api/v1/auth/x/account", {
        query: { wallet: data.wallet },
      }),
    ),
  );
