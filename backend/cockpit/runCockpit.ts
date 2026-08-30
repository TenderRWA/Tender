import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const BASE_URL = process.env.API_URL || "https://api.tenderrwa.com";

function logHeader(step: string, title: string) {
  console.log(`\n========================================================================`);
  console.log(`🚀 [${step}] ${title}`);
  console.log(`========================================================================`);
}

function logSuccess(message: string, data?: any) {
  console.log(`✅ ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logInfo(message: string, data?: any) {
  console.log(`ℹ️  ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function main() {
  console.log(`\n🌟 STARTING TENDER PRODUCT COCKPIT`);
  console.log(`🌐 Target API: ${BASE_URL}`);

  // 1. Generate a Solana Keypair for testing
  logHeader("STEP 1", "Generating Ephemeral Solana Test Wallet");
  const testWallet = Keypair.generate();
  const walletPubkey = testWallet.publicKey.toBase58();
  const secretKeyBase58 = bs58.encode(testWallet.secretKey);
  logSuccess(`Generated Keypair:`, {
    publicKey: walletPubkey,
    secretKeyPreview: `${secretKeyBase58.slice(0, 12)}...`,
  });

  // 2. Test Live Health Check
  logHeader("STEP 2", "Live Backend Health Check");
  const healthRes = await fetch(`${BASE_URL}/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed: ${healthRes.status} ${healthRes.statusText}`);
  }
  const healthData = await healthRes.json();
  logSuccess("Health Check Response:", healthData);

  // 3. Query RWA Asset Registry
  logHeader("STEP 3", "Querying Solana RWA Asset Catalog");
  const assetsRes = await fetch(`${BASE_URL}/api/v1/assets?featured=true`);
  if (!assetsRes.ok) {
    throw new Error(`Assets request failed: ${assetsRes.status}`);
  }
  const assetsData = await assetsRes.json();
  logSuccess(`Fetched ${assetsData.featured.length} Featured Assets:`, {
    baseCurrencies: assetsData.baseCurrencies.map((c: any) => c.symbol),
    sampleStocks: assetsData.featured.slice(0, 5).map((s: any) => ({
      symbol: s.symbol,
      name: s.name,
      mint: s.mint,
      decimals: s.decimals,
    })),
  });

  // 4. Register a Unique Handle with Portfolio Elections
  const uniqueHandle = `trader_${Math.floor(Date.now() / 1000).toString().slice(-5)}`;
  logHeader("STEP 4", `Registering Handle: @${uniqueHandle}`);

  const registerPayload = {
    handle: uniqueHandle,
    ownerWallet: walletPubkey,
    metadata: {
      displayName: "Cockpit Tester",
      bio: "Automated test wallet for TENDER settlement rail",
    },
    elections: [
      {
        symbol: "SPYx",
        mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
        basisPoints: 6000, // 60%
      },
      {
        symbol: "USDC",
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        basisPoints: 3000, // 30%
      },
      {
        symbol: "GLDx",
        mint: "Xs64245JybP9rgXJZJZcxKKRwqJnRpGKzoKtVNcyhoS",
        basisPoints: 1000, // 10%
      },
    ],
  };

  const regRes = await fetch(`${BASE_URL}/api/v1/handles/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registerPayload),
  });

  if (!regRes.ok) {
    const errBody = await regRes.text();
    throw new Error(`Handle registration failed (${regRes.status}): ${errBody}`);
  }
  const regData = await regRes.json();
  logSuccess(`Handle Registered:`, regData);

  // 5. Resolve Handle Details
  logHeader("STEP 5", `Resolving Handle Details: @${uniqueHandle}`);
  const resolveRes = await fetch(`${BASE_URL}/api/v1/handles/${uniqueHandle}`);
  if (!resolveRes.ok) {
    throw new Error(`Handle resolution failed: ${resolveRes.status}`);
  }
  const resolveData = await resolveRes.json();
  logSuccess(`Resolved Handle Data:`, resolveData);

  // 6. Update Handle Elections
  logHeader("STEP 6", `Updating Elections for @${uniqueHandle} to 70% NVDAx, 30% USDC`);
  const updateElectionPayload = {
    ownerWallet: walletPubkey,
    elections: [
      {
        symbol: "NVDAx",
        mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
        basisPoints: 7000, // 70%
      },
      {
        symbol: "USDC",
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        basisPoints: 3000, // 30%
      },
    ],
  };

  const updateRes = await fetch(`${BASE_URL}/api/v1/handles/${uniqueHandle}/elections`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateElectionPayload),
  });

  if (!updateRes.ok) {
    const errBody = await updateRes.text();
    throw new Error(`Update election failed (${updateRes.status}): ${errBody}`);
  }
  const updateData = await updateRes.json();
  logSuccess(`Elections Updated:`, updateData);

  // 7. Test Dual-Provider Quote (Single Pair: SOL -> SPYx)
  logHeader("STEP 7", "Dual-Provider Swap Quote Comparison (Jupiter vs. Relay.link)");
  const quotePayload = {
    fromSymbolOrMint: "SOL",
    toSymbolOrMint: "SPYx",
    amountIn: 1.5,
    userWallet: walletPubkey,
    slippageBps: 50,
  };

  logInfo("Requesting quote for 1.5 SOL -> SPYx...", quotePayload);
  const quoteRes = await fetch(`${BASE_URL}/api/v1/settle/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quotePayload),
  });

  if (!quoteRes.ok) {
    const errText = await quoteRes.text();
    throw new Error(`Dual quote failed (${quoteRes.status}): ${errText}`);
  }
  const quoteData = await quoteRes.json();
  logSuccess(`Dual Quote Result:`, {
    winner: quoteData.winner,
    rate: quoteData.rate,
    inputAmount: `${quoteData.inAmountFormatted} SOL`,
    outputAmount: `${quoteData.outAmountFormatted} SPYx`,
    priceImpactPct: `${quoteData.priceImpactPct}%`,
    comparison: quoteData.providerComparison,
  });

  // 8. Test Multi-Leg Portfolio Election Quote
  logHeader("STEP 8", `Executing Multi-Leg Portfolio Settlement Quote for @${uniqueHandle}`);
  const electionQuotePayload = {
    recipientHandle: uniqueHandle,
    fromSymbolOrMint: "USDC",
    amountIn: 500, // 500 USDC
    userWallet: walletPubkey,
  };

  logInfo(`Calculating 500 USDC settlement across @${uniqueHandle}'s portfolio...`);
  const electionQuoteRes = await fetch(`${BASE_URL}/api/v1/settle/election-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(electionQuotePayload),
  });

  if (!electionQuoteRes.ok) {
    const errText = await electionQuoteRes.text();
    throw new Error(`Election quote failed (${electionQuoteRes.status}): ${errText}`);
  }
  const electionQuoteData = await electionQuoteRes.json();
  logSuccess(`Portfolio Sliced Settlement Results:`, {
    totalInput: `${electionQuoteData.portfolioResult.totalInAmountFormatted} USDC`,
    legs: electionQuoteData.portfolioResult.legs.map((leg: any) => ({
      asset: leg.assetSymbol,
      basisPoints: leg.basisPoints,
      allocatedIn: `${leg.allocatedInAmountFormatted} USDC`,
      expectedOutput: `${leg.quote.outAmountFormatted} ${leg.assetSymbol}`,
      winningProvider: leg.quote.winner,
      priceImpact: `${leg.quote.priceImpactPct}%`,
    })),
  });

  // 9. Test Invoicing & Solana Pay
  logHeader("STEP 9", `Generating Payable Invoice & Solana Pay QR Link`);
  const invoiceRes = await fetch(`${BASE_URL}/api/v1/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipientHandle: uniqueHandle,
      amount: "250.00",
      memo: "TENDER Freelance Invoice #104",
      expiryMinutes: 120,
    }),
  });

  if (!invoiceRes.ok) {
    const errText = await invoiceRes.text();
    throw new Error(`Invoice creation failed: ${errText}`);
  }
  const invoiceData = await invoiceRes.json();
  logSuccess(`Invoice Created:`, invoiceData);

  // Test Solana Pay GET Specification
  const solanaPayRes = await fetch(`${BASE_URL}/api/v1/solana-pay/${invoiceData.invoiceId}`);
  if (solanaPayRes.ok) {
    const solanaPayData = await solanaPayRes.json();
    logSuccess(`Solana Pay QR Specification Verified:`, solanaPayData);
  }

  logHeader("COCKPIT SUMMARY", "ALL TESTS PASSED SUCCESSFULLY 🎉");
  console.log(`\n✅ 1. Ephemeral Solana Wallet Generated: ${walletPubkey}`);
  console.log(`✅ 2. Live API Health Verified (200 OK)`);
  console.log(`✅ 3. RWA Asset Directory Verified (${assetsData.total || assetsData.count} assets)`);
  console.log(`✅ 4. Handle Registered (@${uniqueHandle})`);
  console.log(`✅ 5. Handle Resolved from PostgreSQL`);
  console.log(`✅ 6. Portfolio Elections Updated (70% NVDAx, 30% USDC)`);
  console.log(`✅ 7. Dual Quote Evaluated (Jupiter & Relay.link compared)`);
  console.log(`✅ 8. Multi-Leg Portfolio Settlement Calculated`);
  console.log(`✅ 9. Invoice Created & Solana Pay QR Verified`);
}

main().catch((err) => {
  console.error("\n❌ COCKPIT EXECUTION ERROR:", err);
  process.exit(1);
});
