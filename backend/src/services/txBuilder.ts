import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import { config } from "../config";
import { fetchJupiterSwapInstructions, type JupiterQuoteResponse } from "./jupiterService";
import type { DualQuoteResult, PortfolioQuoteResult } from "./dualQuoteEngine";

const connection = new Connection(config.solanaRpcUrl, "confirmed");

function deserializeInstruction(instruction: any): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((acc: any) => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
}

async function getAddressLookupTableAccounts(
  keys: string[]
): Promise<AddressLookupTableAccount[]> {
  if (!keys || keys.length === 0) return [];

  const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
    keys.map((key) => new PublicKey(key))
  );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }
    return acc;
  }, new Array<AddressLookupTableAccount>());
}

export async function buildAtomicJupiterSwapTx(params: {
  userWallet: string;
  quote: JupiterQuoteResponse;
  destinationTokenAccount?: string;
}): Promise<{ base64Transaction: string; addressLookupTableAddresses: string[] }> {
  const swapInstructions = await fetchJupiterSwapInstructions({
    quoteResponse: params.quote,
    userPublicKey: params.userWallet,
    destinationTokenAccount: params.destinationTokenAccount,
    wrapAndUnwrapSol: true,
  });

  const instructions: TransactionInstruction[] = [];

  // 1. Compute budget instructions
  if (swapInstructions.computeBudgetInstructions) {
    for (const ix of swapInstructions.computeBudgetInstructions) {
      instructions.push(deserializeInstruction(ix));
    }
  }

  // 2. Setup instructions
  if (swapInstructions.setupInstructions) {
    for (const ix of swapInstructions.setupInstructions) {
      instructions.push(deserializeInstruction(ix));
    }
  }

  // 3. Swap instruction
  if (swapInstructions.swapInstruction) {
    instructions.push(deserializeInstruction(swapInstructions.swapInstruction));
  }

  // 4. Cleanup instruction
  if (swapInstructions.cleanupInstruction) {
    instructions.push(deserializeInstruction(swapInstructions.cleanupInstruction));
  }

  // 5. Lookup tables
  const addressLookupTableAccounts = await getAddressLookupTableAccounts(
    swapInstructions.addressLookupTableAddresses || []
  );

  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const messageV0 = new TransactionMessage({
    payerKey: new PublicKey(params.userWallet),
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const transaction = new VersionedTransaction(messageV0);
  const serialized = Buffer.from(transaction.serialize()).toString("base64");

  return {
    base64Transaction: serialized,
    addressLookupTableAddresses: swapInstructions.addressLookupTableAddresses || [],
  };
}

export async function buildSettlementTxPlan(params: {
  userWallet: string;
  recipientWallet: string;
  quote: DualQuoteResult;
}): Promise<{
  provider: "jupiter" | "relay";
  base64Transaction?: string;
  relaySteps?: any[];
  details: {
    inAmount: string;
    outAmount: string;
    rate: string;
    priceImpactPct: number;
  };
}> {
  if (params.quote.winner === "jupiter" && params.quote.rawWinnerQuote.jupiterQuote) {
    const { base64Transaction } = await buildAtomicJupiterSwapTx({
      userWallet: params.userWallet,
      quote: params.quote.rawWinnerQuote.jupiterQuote,
    });

    return {
      provider: "jupiter",
      base64Transaction,
      details: {
        inAmount: params.quote.inAmount,
        outAmount: params.quote.outAmount,
        rate: params.quote.rate,
        priceImpactPct: params.quote.priceImpactPct,
      },
    };
  } else if (params.quote.winner === "relay" && params.quote.rawWinnerQuote.relayQuote) {
    return {
      provider: "relay",
      relaySteps: params.quote.rawWinnerQuote.relayQuote.steps,
      details: {
        inAmount: params.quote.inAmount,
        outAmount: params.quote.outAmount,
        rate: params.quote.rate,
        priceImpactPct: params.quote.priceImpactPct,
      },
    };
  }

  throw new Error("Unable to build transaction plan: missing raw quote payload");
}
