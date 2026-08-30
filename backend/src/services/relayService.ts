import { config } from "../config";

export const SOLANA_CHAIN_ID = 792703809;
export const SOL_MINT = "11111111111111111111111111111111";

export interface RelayGetQuoteParams {
  user: string; // Solana base58 wallet address
  recipient?: string; // destination recipient wallet address
  originCurrency: string; // mint address
  destinationCurrency: string; // mint address
  amount: string; // base atomic units
  tradeType?: "EXACT_INPUT" | "EXACT_OUTPUT";
  slippageToleranceBps?: number;
  feeRecipient?: string;
  feeBps?: number;
}

export interface RelayStepItem {
  id: string;
  action: string;
  description: string;
  status: "incomplete" | "complete";
  kind: "transaction" | "signature";
  items: Array<{
    status: string;
    data: {
      instructions?: any[];
      addressLookupTableAddresses?: string[];
      from?: string;
      to?: string;
      data?: string;
      value?: string;
      chainId?: number;
    };
    check?: {
      endpoint: string;
      method: string;
    };
  }>;
  requestId?: string;
}

export interface RelayQuoteResponse {
  requestId: string;
  steps: RelayStepItem[];
  fees: {
    gas: any;
    relayer: any;
    relayerService: any;
    app: any;
  };
  details: {
    operation: string;
    sender: string;
    recipient: string;
    currencyIn: {
      amount: string;
      amountFormatted: string;
      amountUsd?: string;
      currency: {
        symbol: string;
        name: string;
        address: string;
        decimals: number;
      };
    };
    currencyOut: {
      amount: string;
      amountFormatted: string;
      amountUsd?: string;
      currency: {
        symbol: string;
        name: string;
        address: string;
        decimals: number;
      };
    };
    totalImpact?: { usd: string; percent: string };
    swapImpact?: { usd: string; percent: string };
    rate?: string;
    timeEstimate: number;
  };
}

export async function fetchRelayQuote(params: RelayGetQuoteParams): Promise<RelayQuoteResponse> {
  const body: Record<string, any> = {
    user: params.user || "11111111111111111111111111111111",
    recipient: params.recipient || params.user || "11111111111111111111111111111111",
    originChainId: SOLANA_CHAIN_ID,
    destinationChainId: SOLANA_CHAIN_ID,
    originCurrency: params.originCurrency,
    destinationCurrency: params.destinationCurrency,
    amount: params.amount,
    tradeType: params.tradeType || "EXACT_INPUT",
  };

  if (params.slippageToleranceBps !== undefined) {
    body.slippageTolerance = String(params.slippageToleranceBps);
  }

  if (params.feeRecipient && params.feeBps) {
    body.appFees = [
      {
        recipient: params.feeRecipient,
        fee: String(params.feeBps),
      },
    ];
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  if (config.relay.apiKey) {
    headers["x-api-key"] = config.relay.apiKey;
  }

  const res = await fetch("https://api.relay.link/quote/v2", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Relay quote failed (${res.status}): ${errorText}`);
  }

  return (await res.json()) as RelayQuoteResponse;
}

export async function getRelayIntentStatus(requestId: string): Promise<any> {
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (config.relay.apiKey) {
    headers["x-api-key"] = config.relay.apiKey;
  }

  const res = await fetch(
    `https://api.relay.link/intents/status/v2?requestId=${encodeURIComponent(requestId)}`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch Relay intent status: ${res.statusText}`);
  }

  return await res.json();
}
