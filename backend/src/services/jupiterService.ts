import { config } from "../config";

export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const SOL_NATIVE_MINT = "11111111111111111111111111111111";

export interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string | number; // base atomic units
  slippageBps?: number;
  onlyDirectRoutes?: boolean;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
  contextSlot?: number;
  timeTaken?: number;
}

export interface JupiterSwapInstructionResponse {
  tokenLedgerInstruction?: any;
  computeBudgetInstructions: any[];
  setupInstructions: any[];
  swapInstruction: any;
  cleanupInstruction?: any;
  addressLookupTableAddresses: string[];
}

function normalizeMintForJupiter(mint: string): string {
  if (mint === SOL_NATIVE_MINT) {
    return WSOL_MINT;
  }
  return mint;
}

export async function fetchJupiterQuote(params: JupiterQuoteParams): Promise<JupiterQuoteResponse> {
  const inputMint = normalizeMintForJupiter(params.inputMint);
  const outputMint = normalizeMintForJupiter(params.outputMint);
  const slippageBps = params.slippageBps ?? 50;

  const url = new URL("https://api.jup.ag/swap/v6/quote");
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", String(params.amount));
  url.searchParams.set("slippageBps", String(slippageBps));
  url.searchParams.set("swapMode", "ExactIn");

  if (params.onlyDirectRoutes) {
    url.searchParams.set("onlyDirectRoutes", "true");
  }

  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (config.jupiter.apiKey) {
    headers["x-api-key"] = config.jupiter.apiKey;
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Jupiter quote failed (${res.status}): ${errText}`);
  }

  return (await res.json()) as JupiterQuoteResponse;
}

export async function fetchJupiterSwapInstructions(params: {
  quoteResponse: JupiterQuoteResponse;
  userPublicKey: string;
  destinationTokenAccount?: string;
  wrapAndUnwrapSol?: boolean;
}): Promise<JupiterSwapInstructionResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (config.jupiter.apiKey) {
    headers["x-api-key"] = config.jupiter.apiKey;
  }

  const body = {
    quoteResponse: params.quoteResponse,
    userPublicKey: params.userPublicKey,
    destinationTokenAccount: params.destinationTokenAccount,
    wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
    useSharedAccounts: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: "auto",
  };

  const res = await fetch("https://api.jup.ag/swap/v6/swap-instructions", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Jupiter swap-instructions failed (${res.status}): ${errText}`);
  }

  return (await res.json()) as JupiterSwapInstructionResponse;
}
