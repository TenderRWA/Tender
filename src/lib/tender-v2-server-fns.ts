/**
 * Server functions wrapping the TENDER V2 (Robinhood Chain) API.
 *
 * Same contract as the V1 file next door: the browser calls these over the
 * same-origin TanStack Start RPC endpoint and the fetch to api.tenderrwa.com
 * happens in the server runtime, so no component ever issues a cross-origin
 * request and CORS never applies.
 *
 * Only routes verified to exist on `/api/v2` are wrapped here. The five reads
 * the rail does not serve yet — settlement history, handles-by-owner, the
 * invoice list, the X account binding and the wallet NFT scan — are listed in
 * for-nzube.md and are served from src/lib/demo/robinhood-demo.ts until the
 * backend ships them.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
  V2AssetResponse,
  V2AssetsResponse,
  V2ConfirmResponse,
  V2ElectionQuoteResponse,
  V2HandleResponse,
  V2Invoice,
  V2InvoiceCreateResponse,
  V2InvoiceDetailsResponse,
  V2NftMetadataResponse,
  V2NftTransferPlanResponse,
  V2PendingResponse,
  V2Quote,
  V2RegisterResponse,
  V2ResolveTargetResponse,
  V2Token,
  V2UpdateElectionsResponse,
} from "@/types/tender-v2";

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

const evmAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Not a valid EVM address");

const electionInputSchema = z.object({
  symbol: z.string().trim().min(1),
  tokenAddress: evmAddressSchema.optional(),
  basisPoints: z.number().int().min(0).max(10_000),
});

type ElectionInputSchema = z.infer<typeof electionInputSchema>;
type ResolvedElection = { symbol: string; tokenAddress: string; basisPoints: number };

/**
 * Elections may arrive symbol-only. Resolving the contract is another
 * server-side hop, which keeps the client from having to hold the registry.
 */
async function resolveElections(elections: ElectionInputSchema[]): Promise<ResolvedElection[]> {
  return Promise.all(
    elections.map(async (election) => {
      if (election.tokenAddress) {
        return {
          symbol: election.symbol,
          tokenAddress: election.tokenAddress,
          basisPoints: election.basisPoints,
        };
      }
      const res = await tenderFetch<V2AssetResponse>(
        `/api/v2/assets/${encodeURIComponent(election.symbol)}`,
      );
      return {
        symbol: res.token.symbol,
        tokenAddress: res.token.address,
        basisPoints: election.basisPoints,
      };
    }),
  );
}

// -- Asset registry ---------------------------------------------------------

export const getAssetsV2 = createServerFn({ method: "GET" })
  .validator(
    z.object({
      q: z.string().trim().optional(),
      featured: z.boolean().optional(),
    }),
  )
  .handler(({ data }): Promise<V2AssetsResponse> =>
    proxy(() =>
      tenderFetch<V2AssetsResponse>("/api/v2/assets", {
        query: {
          q: data.q || undefined,
          featured: data.featured ? "true" : undefined,
        },
      }),
    ),
  );

export const getAssetV2 = createServerFn({ method: "GET" })
  .validator(z.object({ symbolOrAddress: z.string().trim().min(1) }))
  .handler(({ data }): Promise<V2Token> =>
    proxy(async () => {
      const res = await tenderFetch<V2AssetResponse>(
        `/api/v2/assets/${encodeURIComponent(data.symbolOrAddress)}`,
      );
      return res.token;
    }),
  );

// -- Handles & elections ----------------------------------------------------

export const getHandleV2 = createServerFn({ method: "GET" })
  .validator(z.object({ handle: handleSchema }))
  .handler(({ data }): Promise<V2HandleResponse> =>
    proxy(() =>
      tenderFetch<V2HandleResponse>(`/api/v2/handles/${encodeURIComponent(data.handle)}`),
    ),
  );

/** Availability probe: a 404 is the "free to claim" answer, not a failure. */
export const checkHandleV2 = createServerFn({ method: "GET" })
  .validator(z.object({ handle: handleSchema }))
  .handler(
    async ({
      data,
    }): Promise<{ handle: string; registered: boolean; details: V2HandleResponse | null }> => {
      try {
        const details = await tenderFetch<V2HandleResponse>(
          `/api/v2/handles/${encodeURIComponent(data.handle)}`,
        );
        return { handle: data.handle, registered: true, details };
      } catch (err) {
        if (err instanceof TenderApiError && err.status === 404) {
          return { handle: data.handle, registered: false, details: null };
        }
        throw err instanceof TenderApiError ? new Error(err.message) : err;
      }
    },
  );

export const registerHandleV2 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      handle: handleSchema,
      ownerWallet: evmAddressSchema,
      xHandle: z.string().trim().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      elections: z.array(electionInputSchema).min(1),
    }),
  )
  .handler(({ data }): Promise<V2RegisterResponse> =>
    proxy(async () =>
      tenderFetch<V2RegisterResponse>("/api/v2/handles/register", {
        method: "POST",
        body: {
          handle: data.handle,
          ownerWallet: data.ownerWallet,
          xHandle: data.xHandle,
          metadata: data.metadata ?? {},
          elections: await resolveElections(data.elections),
        },
      }),
    ),
  );

export const updateElectionsV2 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      handle: handleSchema,
      ownerWallet: evmAddressSchema.optional(),
      elections: z.array(electionInputSchema).min(1),
    }),
  )
  .handler(({ data }): Promise<V2UpdateElectionsResponse> =>
    proxy(async () =>
      tenderFetch<V2UpdateElectionsResponse>(
        `/api/v2/handles/${encodeURIComponent(data.handle)}/elections`,
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

// -- Quoting & settlement ---------------------------------------------------

export const getSettleQuoteV2 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fromSymbolOrAddress: z.string().trim().min(1),
      toSymbolOrAddress: z.string().trim().min(1),
      amountIn: z.union([z.number().positive(), z.string().min(1)]),
      userWallet: evmAddressSchema.optional(),
      recipientWallet: evmAddressSchema.optional(),
      slippageBps: z.number().int().min(0).max(10_000).optional(),
    }),
  )
  .handler(({ data }): Promise<V2Quote> =>
    proxy(() => tenderFetch<V2Quote>("/api/v2/settle/quote", { method: "POST", body: data })),
  );

export const getElectionQuoteV2 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      recipientHandle: handleSchema.optional(),
      fromSymbolOrAddress: z.string().trim().min(1),
      amountIn: z.union([z.number().positive(), z.string().min(1)]),
      customElections: z.array(electionInputSchema).optional(),
      userWallet: evmAddressSchema.optional(),
      slippageBps: z.number().int().min(0).max(10_000).optional(),
    }),
  )
  .handler(({ data }): Promise<V2ElectionQuoteResponse> =>
    proxy(async () =>
      tenderFetch<V2ElectionQuoteResponse>("/api/v2/settle/election-quote", {
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

/**
 * Records a broadcast transaction against the rail's ledger.
 *
 * Unlike V1 there is no build-tx hop: the quote already carries signable steps,
 * so the client signs from the quote and only reports the hash back here.
 */
export const confirmSettlementV2 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      txHash: z.string().trim().min(1),
      senderWallet: evmAddressSchema,
      recipientHandle: handleSchema.optional(),
      recipientWallet: evmAddressSchema,
      inputTokenSymbol: z.string().trim().min(1),
      inputAmount: z.string().trim().min(1),
      outputBreakdown: z.array(z.object({ symbol: z.string(), amount: z.string() })).optional(),
    }),
  )
  .handler(({ data }): Promise<V2ConfirmResponse> =>
    proxy(() =>
      tenderFetch<V2ConfirmResponse>("/api/v2/settle/confirm", { method: "POST", body: data }),
    ),
  );

// -- Invoices ---------------------------------------------------------------

export const createInvoiceV2 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      recipientHandle: handleSchema,
      targetAmount: z.union([z.number().positive(), z.string().min(1)]),
      targetTokenSymbol: z.string().trim().optional(),
      targetTokenAddress: evmAddressSchema.optional(),
      memo: z.string().trim().optional(),
      expiryMinutes: z.number().int().positive().optional(),
      creatorWallet: evmAddressSchema.optional(),
      creatorHandle: z.string().trim().optional(),
    }),
  )
  .handler(({ data }): Promise<V2Invoice> =>
    proxy(async () => {
      const res = await tenderFetch<V2InvoiceCreateResponse | V2Invoice>("/api/v2/invoices", {
        method: "POST",
        body: data,
      });
      // The route has shipped both shapes; accept either rather than guess.
      return "invoice" in res ? res.invoice : res;
    }),
  );

export const getInvoiceV2 = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().trim().min(1) }))
  .handler(({ data }): Promise<V2InvoiceDetailsResponse> =>
    proxy(() =>
      tenderFetch<V2InvoiceDetailsResponse>(`/api/v2/invoices/${encodeURIComponent(data.id)}`),
    ),
  );

export const confirmInvoicePaymentV2 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().trim().min(1),
      txHash: z.string().trim().min(1),
      payerWallet: evmAddressSchema.optional(),
    }),
  )
  .handler(({ data }): Promise<{ message?: string; invoice: V2Invoice }> =>
    proxy(() =>
      tenderFetch<{ message?: string; invoice: V2Invoice }>(
        `/api/v2/invoices/${encodeURIComponent(data.id)}/confirm`,
        { method: "POST", body: { txHash: data.txHash, payerWallet: data.payerWallet } },
      ),
    ),
  );

// -- Bot pending queue ------------------------------------------------------

export const getPendingSettlementsV2 = createServerFn({ method: "GET" })
  .validator(
    z.object({
      handle: z.string().trim().optional(),
      status: z.string().trim().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
  )
  .handler(({ data }): Promise<V2PendingResponse> =>
    proxy(() =>
      tenderFetch<V2PendingResponse>("/api/v2/bot/pending", {
        query: {
          handle: data.handle,
          status: data.status,
          limit: data.limit ? String(data.limit) : undefined,
        },
      }),
    ),
  );

export const confirmPendingSettlementV2 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().trim().min(1),
      txHash: z.string().trim().min(1),
      payerWallet: evmAddressSchema.optional(),
    }),
  )
  .handler(({ data }): Promise<{ success: boolean }> =>
    proxy(() =>
      tenderFetch<{ success: boolean }>(
        `/api/v2/bot/pending/${encodeURIComponent(data.id)}/confirm`,
        // The route reads the hash from `signature`; `txHash` is sent alongside
        // so it keeps working once the column is renamed.
        { method: "POST", body: { signature: data.txHash, txHash: data.txHash, payerWallet: data.payerWallet } },
      ),
    ),
  );

export const dismissPendingSettlementV2 = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().trim().min(1) }))
  .handler(({ data }): Promise<{ success: boolean }> =>
    proxy(() =>
      tenderFetch<{ success: boolean }>(
        `/api/v2/bot/pending/${encodeURIComponent(data.id)}/dismiss`,
        { method: "POST" },
      ),
    ),
  );

// -- Sovereign NFT rail (ERC-721) -------------------------------------------

/** Resolves `0x…` or `@handle` to the wallet an NFT should be delivered to. */
export const resolveNftTargetV2 = createServerFn({ method: "GET" })
  .validator(z.object({ target: z.string().trim().min(1) }))
  .handler(({ data }): Promise<V2ResolveTargetResponse> =>
    proxy(() =>
      tenderFetch<V2ResolveTargetResponse>(
        `/api/v2/nft/resolve-target/${encodeURIComponent(data.target)}`,
      ),
    ),
  );

export const getNftMetadataV2 = createServerFn({ method: "GET" })
  .validator(
    z.object({
      contractAddress: evmAddressSchema,
      tokenId: z.string().trim().min(1),
    }),
  )
  .handler(({ data }): Promise<V2NftMetadataResponse> =>
    proxy(() =>
      tenderFetch<V2NftMetadataResponse>(
        `/api/v2/nft/${encodeURIComponent(data.contractAddress)}/${encodeURIComponent(data.tokenId)}`,
      ),
    ),
  );

/** Builds the unsigned `safeTransferFrom(from, to, tokenId)` call. */
export const buildNftTransferPlanV2 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fromWallet: evmAddressSchema,
      target: z.string().trim().min(1),
      contractAddress: evmAddressSchema,
      tokenId: z.union([z.number().int().min(0), z.string().trim().min(1)]),
    }),
  )
  .handler(({ data }): Promise<V2NftTransferPlanResponse> =>
    proxy(() =>
      tenderFetch<V2NftTransferPlanResponse>("/api/v2/nft/transfer-plan", {
        method: "POST",
        body: data,
      }),
    ),
  );
