import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { config } from "../config";
import { fetchJupiterSwapInstructions, type JupiterQuoteResponse } from "./jupiterService";
import type { DualQuoteResult, PortfolioQuoteResult } from "./dualQuoteEngine";

const connection = new Connection(config.solanaRpcUrl, "confirmed");

export async function resolveTokenProgramId(mint: PublicKey): Promise<PublicKey> {
  try {
    const info = await connection.getAccountInfo(mint);
    if (info?.owner && info.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      return TOKEN_2022_PROGRAM_ID;
    }
  } catch (err) {
    console.warn("Could not query mint program ID, defaulting to standard:", err);
  }
  return TOKEN_PROGRAM_ID;
}

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
  prependInstructions?: TransactionInstruction[];
}): Promise<{ base64Transaction: string; addressLookupTableAddresses: string[] }> {
  const swapInstructions = await fetchJupiterSwapInstructions({
    quoteResponse: params.quote,
    userPublicKey: params.userWallet,
    destinationTokenAccount: params.destinationTokenAccount,
    wrapAndUnwrapSol: true,
  });

  const instructions: TransactionInstruction[] = [];

  // 0. Prepend instructions (e.g. creating recipient's ATA)
  if (params.prependInstructions && params.prependInstructions.length > 0) {
    instructions.push(...params.prependInstructions);
  }

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

export async function buildDirectTransferTx(params: {
  userWallet: string;
  recipientWallet: string;
  tokenMint: string;
  amount: string;
  decimals: number;
}): Promise<{ base64Transaction: string }> {
  const userPubkey = new PublicKey(params.userWallet);
  const recipientPubkey = new PublicKey(params.recipientWallet);
  const instructions: TransactionInstruction[] = [];

  const isNativeSol =
    params.tokenMint === "11111111111111111111111111111111" ||
    params.tokenMint === "So11111111111111111111111111111111111111112";

  if (isNativeSol) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: recipientPubkey,
        lamports: BigInt(params.amount),
      })
    );
  } else {
    const mintPubkey = new PublicKey(params.tokenMint);
    const tokenProgramId = await resolveTokenProgramId(mintPubkey);
    const sourceAta = getAssociatedTokenAddressSync(mintPubkey, userPubkey, false, tokenProgramId);
    const destAta = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey, true, tokenProgramId);

    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        userPubkey,
        destAta,
        recipientPubkey,
        mintPubkey,
        tokenProgramId
      )
    );

    instructions.push(
      createTransferCheckedInstruction(
        sourceAta,
        mintPubkey,
        destAta,
        userPubkey,
        BigInt(params.amount),
        params.decimals,
        [],
        tokenProgramId
      )
    );
  }

  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const messageV0 = new TransactionMessage({
    payerKey: userPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  const serialized = Buffer.from(transaction.serialize()).toString("base64");

  return { base64Transaction: serialized };
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
  const inMint = params.quote.inputToken?.mint;
  const outMint = params.quote.outputToken?.mint;

  // 1. Direct same-asset transfer (e.g. USDC -> USDC or SOL -> SOL)
  if (inMint && outMint && inMint === outMint) {
    const { base64Transaction } = await buildDirectTransferTx({
      userWallet: params.userWallet,
      recipientWallet: params.recipientWallet,
      tokenMint: inMint,
      amount: params.quote.inAmount,
      decimals: params.quote.inputToken?.decimals ?? 6,
    });

    return {
      provider: "jupiter",
      base64Transaction,
      details: {
        inAmount: params.quote.inAmount,
        outAmount: params.quote.outAmount,
        rate: params.quote.rate,
        priceImpactPct: 0,
      },
    };
  }

  // 2. Jupiter atomic swap with direct destination ATA routing
  if (params.quote.winner === "jupiter" && params.quote.rawWinnerQuote.jupiterQuote) {
    const userPubkey = new PublicKey(params.userWallet);
    const recipientPubkey = new PublicKey(params.recipientWallet);
    const resolvedOutMint = new PublicKey(
      outMint || params.quote.rawWinnerQuote.jupiterQuote.outputMint
    );

    const tokenProgramId = await resolveTokenProgramId(resolvedOutMint);
    const recipientAta = getAssociatedTokenAddressSync(
      resolvedOutMint,
      recipientPubkey,
      true,
      tokenProgramId
    );

    // Prepend idempotent ATA creation for recipient so Jupiter has an existing destination ATA
    const prependInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        userPubkey,
        recipientAta,
        recipientPubkey,
        resolvedOutMint,
        tokenProgramId
      ),
    ];

    const { base64Transaction } = await buildAtomicJupiterSwapTx({
      userWallet: params.userWallet,
      quote: params.quote.rawWinnerQuote.jupiterQuote,
      destinationTokenAccount: recipientAta.toBase58(),
      prependInstructions,
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
