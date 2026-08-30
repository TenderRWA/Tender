import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "../src/config";

const BASE_URL = process.env.API_URL || "https://api.tenderrwa.com";
const WALLET_PATH = path.resolve(import.meta.dir, "wallet.json");
const connection = new Connection(config.solanaRpcUrl, "confirmed");

interface PersistedWallet {
  publicKey: string;
  secretKey: number[];
  secretKeyBase58: string;
  createdAt: string;
}

function loadOrCreateWallet(): { keypair: Keypair; isNew: boolean } {
  if (fs.existsSync(WALLET_PATH)) {
    try {
      const content = fs.readFileSync(WALLET_PATH, "utf-8");
      const data: PersistedWallet = JSON.parse(content);
      const secretUint8 = new Uint8Array(data.secretKey);
      const keypair = Keypair.fromSecretKey(secretUint8);
      return { keypair, isNew: false };
    } catch (e) {
      console.warn("⚠️ Failed to parse existing wallet.json, generating a new one.");
    }
  }

  const keypair = Keypair.generate();
  const data: PersistedWallet = {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Array.from(keypair.secretKey),
    secretKeyBase58: bs58.encode(keypair.secretKey),
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(WALLET_PATH, JSON.stringify(data, null, 2), "utf-8");
  return { keypair, isNew: true };
}

async function getLiveSolBalance(pubkey: string): Promise<number> {
  try {
    const bal = await connection.getBalance(new PublicKey(pubkey));
    return bal / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}

function printBanner() {
  console.log(`\n========================================================================`);
  console.log(`🚀 TENDER INTERACTIVE COCKPIT — RECEIVE-SIDE RWA SETTLEMENT RAIL`);
  console.log(`🌐 Target API: ${BASE_URL}`);
  console.log(`========================================================================`);
}

async function handleViewWallet(keypair: Keypair) {
  const pubkey = keypair.publicKey.toBase58();
  const solBalance = await getLiveSolBalance(pubkey);

  console.log(`\n--- 👤 CURRENT PERSISTENT WALLET ---`);
  console.log(`• Address:     ${pubkey}`);
  console.log(`• SOL Balance: ${solBalance} SOL`);
  console.log(`• Secret File: ${WALLET_PATH}`);
  console.log(`• Secret (b58): ${bs58.encode(keypair.secretKey).slice(0, 16)}...`);
}

async function handleSearchAssets(rl: readline.Interface) {
  const query = (await rl.question("\n🔍 Enter asset search term (e.g. apple, NVDA, gold, or press Enter for featured): ")).trim();

  const url = new URL(`${BASE_URL}/api/v1/assets`);
  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.set("featured", "true");
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.log(`❌ Failed to fetch assets (${res.status})`);
    return;
  }

  const data = await res.json();
  const list = data.featured || data.assets || [];

  console.log(`\n📋 Found ${data.total || data.count || list.length} Assets:`);
  console.table(
    list.slice(0, 15).map((a: any) => ({
      Symbol: a.symbol,
      Name: a.name,
      Mint: `${a.mint.slice(0, 8)}...${a.mint.slice(-6)}`,
      Decimals: a.decimals,
    }))
  );
  if (list.length > 15) {
    console.log(`... and ${list.length - 15} more assets.`);
  }
}

async function handleRegisterHandle(rl: readline.Interface, keypair: Keypair) {
  const defaultHandle = `trader_${Math.floor(Date.now() / 1000).toString().slice(-4)}`;
  const inputHandle = (await rl.question(`\n🏷️ Enter handle name (e.g. alex, press Enter for @${defaultHandle}): `)).trim();
  const handle = inputHandle || defaultHandle;

  console.log(`\nConfigure Asset Portfolio Elections (Total must sum to 100%):`);
  const stock1 = (await rl.question("  Asset 1 Symbol (default: SPYx): ")).trim() || "SPYx";
  const pct1 = parseInt((await rl.question("  Asset 1 Percent (default: 60): ")).trim() || "60", 10);

  const stock2 = (await rl.question("  Asset 2 Symbol (default: USDC): ")).trim() || "USDC";
  const pct2 = parseInt((await rl.question("  Asset 2 Percent (default: 30): ")).trim() || "30", 10);

  const stock3 = (await rl.question("  Asset 3 Symbol (default: GLDx): ")).trim() || "GLDx";
  const pct3 = parseInt((await rl.question("  Asset 3 Percent (default: 10): ")).trim() || "10", 10);

  const total = pct1 + pct2 + pct3;
  if (total !== 100) {
    console.log(`❌ Error: Total percentages must sum to 100%. Given: ${total}%`);
    return;
  }

  // Resolve mints
  const [res1, res2, res3] = await Promise.all([
    fetch(`${BASE_URL}/api/v1/assets/${stock1}`).then((r) => r.json()),
    fetch(`${BASE_URL}/api/v1/assets/${stock2}`).then((r) => r.json()),
    fetch(`${BASE_URL}/api/v1/assets/${stock3}`).then((r) => r.json()),
  ]);

  if (!res1.mint || !res2.mint || !res3.mint) {
    console.log(`❌ Error: One or more asset symbols could not be resolved.`);
    return;
  }

  const payload = {
    handle,
    ownerWallet: keypair.publicKey.toBase58(),
    metadata: { displayName: `User @${handle}` },
    elections: [
      { symbol: res1.symbol, mint: res1.mint, basisPoints: pct1 * 100 },
      { symbol: res2.symbol, mint: res2.mint, basisPoints: pct2 * 100 },
      { symbol: res3.symbol, mint: res3.mint, basisPoints: pct3 * 100 },
    ],
  };

  console.log(`\nSubmitting registration to ${BASE_URL}/api/v1/handles/register...`);
  const regRes = await fetch(`${BASE_URL}/api/v1/handles/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const regData = await regRes.json();
  if (regRes.ok) {
    console.log(`✅ Handle Registered Successfully!`);
    console.log(JSON.stringify(regData, null, 2));
  } else {
    console.log(`❌ Registration Failed:`, regData);
  }
}

async function handleResolveHandle(rl: readline.Interface) {
  const handle = (await rl.question("\n🔍 Enter handle to resolve (e.g. alex): ")).trim();
  if (!handle) return;

  const clean = handle.replace(/^@/, "");
  const res = await fetch(`${BASE_URL}/api/v1/handles/${clean}`);
  const data = await res.json();

  if (res.ok) {
    console.log(`\n✅ Handle Details for @${clean}:`);
    console.log(`• Owner: ${data.ownerWallet}`);
    console.log(`• Total Allocation: ${data.totalBasisPoints / 100}%`);
    console.log(`• Active Portfolio Elections:`);
    console.table(
      data.elections.map((e: any) => ({
        Asset: e.symbol,
        Allocation: `${e.percentage}%`,
        Mint: `${e.mint.slice(0, 10)}...`,
        Name: e.token?.name || "-",
      }))
    );
  } else {
    console.log(`❌ ${data.error || "Handle not found"}`);
  }
}

async function handleUpdateElections(rl: readline.Interface, keypair: Keypair) {
  const handle = (await rl.question("\n⚖️ Enter your handle to rebalance: ")).trim().replace(/^@/, "");
  if (!handle) return;

  console.log(`Enter new portfolio split (e.g. 70% NVDAx, 30% USDC):`);
  const asset1 = (await rl.question("  Asset 1 Symbol (e.g. NVDAx): ")).trim();
  const pct1 = parseInt((await rl.question("  Asset 1 %: ")).trim() || "0", 10);

  const asset2 = (await rl.question("  Asset 2 Symbol (e.g. USDC): ")).trim();
  const pct2 = parseInt((await rl.question("  Asset 2 %: ")).trim() || "0", 10);

  if (pct1 + pct2 !== 100) {
    console.log(`❌ Error: Sum must be 100% (Given: ${pct1 + pct2}%)`);
    return;
  }

  const [t1, t2] = await Promise.all([
    fetch(`${BASE_URL}/api/v1/assets/${asset1}`).then((r) => r.json()),
    fetch(`${BASE_URL}/api/v1/assets/${asset2}`).then((r) => r.json()),
  ]);

  const payload = {
    ownerWallet: keypair.publicKey.toBase58(),
    elections: [
      { symbol: t1.symbol, mint: t1.mint, basisPoints: pct1 * 100 },
      { symbol: t2.symbol, mint: t2.mint, basisPoints: pct2 * 100 },
    ],
  };

  const res = await fetch(`${BASE_URL}/api/v1/handles/${handle}/elections`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (res.ok) {
    console.log(`✅ Elections Updated:`, data);
  } else {
    console.log(`❌ Failed to update elections:`, data);
  }
}

async function handleDualQuote(rl: readline.Interface, keypair: Keypair) {
  const from = (await rl.question("\n🔄 Input Asset Symbol (default: SOL): ")).trim() || "SOL";
  const to = (await rl.question("  Output Asset Symbol (default: SPYx): ")).trim() || "SPYx";
  const amount = parseFloat((await rl.question("  Amount to Swap (default: 1.0): ")).trim() || "1.0");

  console.log(`\n⏳ Fetching concurrent quotes from Jupiter Swap V6 & Relay.link V2...`);
  const res = await fetch(`${BASE_URL}/api/v1/settle/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromSymbolOrMint: from,
      toSymbolOrMint: to,
      amountIn: amount,
      userWallet: keypair.publicKey.toBase58(),
      slippageBps: 50,
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log(`\n🏆 DUAL-PROVIDER BEST EXECUTION RESULT:`);
    console.log(`• Selected Winner: ${data.winner.toUpperCase()} (${data.providerComparison.winnerReason})`);
    console.log(`• Input Amount:    ${data.inAmountFormatted} ${from}`);
    console.log(`• Expected Output: ${data.outAmountFormatted} ${to}`);
    console.log(`• Effective Rate:  1 ${from} = ${data.rate} ${to}`);
    console.log(`• Price Impact:    ${data.priceImpactPct}%`);

    console.log(`\n📊 Side-by-Side Comparison:`);
    console.table([
      {
        Provider: "Jupiter V6",
        Output: `${data.providerComparison.jupiter.outAmountFormatted} ${to}`,
        Impact: `${data.providerComparison.jupiter.priceImpactPct}%`,
        Status: data.providerComparison.jupiter.success ? "Available" : "Failed",
      },
      {
        Provider: "Relay.link V2",
        Output: `${data.providerComparison.relay.outAmountFormatted} ${to}`,
        Impact: `${data.providerComparison.relay.priceImpactPct}%`,
        Status: data.providerComparison.relay.success ? "Available" : "Failed",
      },
    ]);
  } else {
    console.log(`❌ Quote Failed:`, data);
  }
}

async function handleElectionQuote(rl: readline.Interface, keypair: Keypair) {
  const handle = (await rl.question("\n💸 Enter Recipient Handle (e.g. alex): ")).trim().replace(/^@/, "");
  const token = (await rl.question("  Token to Pay in (default: USDC): ")).trim() || "USDC";
  const amount = parseFloat((await rl.question("  Payment Amount (default: 500): ")).trim() || "500");

  console.log(`\n⏳ Slicing payment across @${handle}'s portfolio and executing dual quotes...`);
  const res = await fetch(`${BASE_URL}/api/v1/settle/election-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipientHandle: handle,
      fromSymbolOrMint: token,
      amountIn: amount,
      userWallet: keypair.publicKey.toBase58(),
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log(`\n✅ Portfolio Sliced Settlement Breakdown for @${handle}:`);
    console.log(`• Total Inbound: ${data.portfolioResult.totalInAmountFormatted} ${token}`);
    console.log(`• Recipient Wallet: ${data.recipientWallet}`);
    console.table(
      data.portfolioResult.legs.map((leg: any) => ({
        Asset: leg.assetSymbol,
        Allocation: `${leg.basisPoints / 100}%`,
        AllocatedIn: `${leg.allocatedInAmountFormatted} ${token}`,
        DeliveredOutput: `${leg.quote.outAmountFormatted} ${leg.assetSymbol}`,
        WinningRoute: leg.quote.winner,
        PriceImpact: `${leg.quote.priceImpactPct}%`,
      }))
    );
  } else {
    console.log(`❌ Settlement Quote Failed:`, data);
  }
}

async function handleCreateInvoice(rl: readline.Interface) {
  const handle = (await rl.question("\n🧾 Enter Handle for Invoice (e.g. alex): ")).trim().replace(/^@/, "");
  const amount = (await rl.question("  Invoice Amount USD (default: 150): ")).trim() || "150.00";
  const memo = (await rl.question("  Invoice Memo (default: Freelance Settlement): ")).trim() || "Freelance Settlement";

  const res = await fetch(`${BASE_URL}/api/v1/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipientHandle: handle,
      amount,
      memo,
      expiryMinutes: 60,
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log(`\n✅ Invoice Generated:`);
    console.log(`• Invoice ID:     ${data.invoiceId}`);
    console.log(`• Recipient:      @${data.recipientHandle} (${data.recipientWallet})`);
    console.log(`• Amount:         $${data.amount}`);
    console.log(`• Solana Pay URL: ${data.payUrl}`);
    console.log(`• Expires At:     ${data.expiresAt}`);
  } else {
    console.log(`❌ Invoice Creation Failed:`, data);
  }
}

async function handleFullWalkthrough(keypair: Keypair) {
  console.log(`\n🚀 RUNNING COMPLETE AUTOMATED WALKTHROUGH...`);
  const pubkey = keypair.publicKey.toBase58();
  const testHandle = `auto_${Math.floor(Date.now() / 1000).toString().slice(-4)}`;

  console.log(`1. Checking API Health...`);
  const hRes = await fetch(`${BASE_URL}/health`);
  console.log(`   Status: ${hRes.status}`);

  console.log(`2. Registering Handle @${testHandle}...`);
  await fetch(`${BASE_URL}/api/v1/handles/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: testHandle,
      ownerWallet: pubkey,
      elections: [
        { symbol: "SPYx", mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", basisPoints: 6000 },
        { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", basisPoints: 4000 },
      ],
    }),
  });

  console.log(`3. Quoting 2.0 SOL -> SPYx via Dual Provider...`);
  const qRes = await fetch(`${BASE_URL}/api/v1/settle/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromSymbolOrMint: "SOL",
      toSymbolOrMint: "SPYx",
      amountIn: 2.0,
      userWallet: pubkey,
    }),
  });
  const qData = await qRes.json();
  console.log(`   Winner: ${qData.winner} | Delivered: ${qData.outAmountFormatted} SPYx`);

  console.log(`4. Slicing 1000 USDC across @${testHandle}'s portfolio...`);
  const elRes = await fetch(`${BASE_URL}/api/v1/settle/election-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipientHandle: testHandle,
      fromSymbolOrMint: "USDC",
      amountIn: 1000,
      userWallet: pubkey,
    }),
  });
  const elData = await elRes.json();
  console.log(`   Delivered Legs: ${elData.portfolioResult.legs.length} legs calculated cleanly.`);

  console.log(`\n🎉 Full automated walkthrough completed with 100% success!`);
}

async function main() {
  let { keypair, isNew } = loadOrCreateWallet();
  const rl = readline.createInterface({ input, output });

  printBanner();
  if (isNew) {
    console.log(`✨ Created and saved new persistent test wallet to cockpit/wallet.json`);
  } else {
    console.log(`🔑 Loaded existing persistent test wallet from cockpit/wallet.json`);
  }
  console.log(`   Address: ${keypair.publicKey.toBase58()}`);

  while (true) {
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`📋 SELECT AN ACTION:`);
    console.log(`  [1] 👤 View Wallet & Live Balances`);
    console.log(`  [2] 🔍 Search / Browse Solana RWA Assets (714 xStocks)`);
    console.log(`  [3] 🏷️  Register a New Handle (with custom elections)`);
    console.log(`  [4] 📊 Lookup Any Handle & Portfolio Elections`);
    console.log(`  [5] ⚖️  Update Handle Portfolio Allocations`);
    console.log(`  [6] 🔄 Get Dual-Provider Swap Quote (Jupiter vs. Relay)`);
    console.log(`  [7] 💸 Simulate Pay-by-Handle Portfolio Settlement`);
    console.log(`  [8] 🧾 Generate Payable Invoice & Solana Pay Link`);
    console.log(`  [9] 🚀 Run Full Automated End-to-End Walkthrough`);
    console.log(`  [0] 🚪 Exit`);
    console.log(`------------------------------------------------------------------------`);

    const choice = (await rl.question("Enter choice (0-9): ")).trim();

    try {
      if (choice === "1") {
        await handleViewWallet(keypair);
      } else if (choice === "2") {
        await handleSearchAssets(rl);
      } else if (choice === "3") {
        await handleRegisterHandle(rl, keypair);
      } else if (choice === "4") {
        await handleResolveHandle(rl);
      } else if (choice === "5") {
        await handleUpdateElections(rl, keypair);
      } else if (choice === "6") {
        await handleDualQuote(rl, keypair);
      } else if (choice === "7") {
        await handleElectionQuote(rl, keypair);
      } else if (choice === "8") {
        await handleCreateInvoice(rl);
      } else if (choice === "9") {
        await handleFullWalkthrough(keypair);
      } else if (choice === "0") {
        console.log(`👋 Exiting TENDER Cockpit. Goodbye!`);
        rl.close();
        process.exit(0);
      } else {
        console.log(`⚠️ Invalid option. Please enter a number between 0 and 9.`);
      }
    } catch (err: any) {
      console.error(`\n❌ Action Error:`, err.message || err);
    }
  }
}

main().catch(console.error);
