import Groq from "groq-sdk";
import { config } from "../../config";
import {
  ROBINHOOD_CHAIN_ID,
  ALL_ROBINHOOD_TOKENS,
  FEATURED_ROBINHOOD_ASSETS,
  resolveRobinhoodToken,
  RobinhoodTokenInfo,
  USDG,
  ETH,
  isValidEvmAddress,
} from "../lib/robinhoodTokens";
import { getV2HandleDetails, V2HandleDetails } from "./handleService";
import {
  quotePortfolioSettlement,
  PortfolioSettlementQuoteResult,
  PortfolioElectionLeg,
} from "./robinhoodSettlement";

export type AiAction =
  | "send"
  | "send_nft"
  | "quote"
  | "election"
  | "invoice"
  | "asset_info"
  | "help"
  | "chat";

export interface ParsedAiIntent {
  action: AiAction;
  target: string | null;
  amount: number | null;
  token: string | null;
  memo: string | null;
  confidence: number;
  recipientHandle?: string;
  recipientWallet?: string;
  isRegistered?: boolean;
  portfolioSummary?: Array<{
    symbol: string;
    percentage: number;
    allocatedAmount: string;
    tokenAddress?: string;
  }>;
  quote?: PortfolioSettlementQuoteResult;
}

export interface ActionCard {
  type: "payment" | "portfolio" | "quote" | "invoice" | "nft" | "assets" | "info";
  title: string;
  recipientHandle?: string;
  recipientWallet?: string;
  amount?: number;
  token?: string;
  memo?: string;
  legs?: Array<{
    symbol: string;
    percentage: number;
    allocatedAmount: string;
    tokenAddress?: string;
  }>;
  totalAmountIn?: string;
  tokenDetails?: RobinhoodTokenInfo;
  meta?: Record<string, any>;
}

export interface AiChatResponse {
  reply: string;
  intent: ParsedAiIntent;
  actionCard: ActionCard | null;
}

// -----------------------------------------------------------------------------
// 1. Fast Regex Command Parser (No @TenderRWABot mention prefix required)
// -----------------------------------------------------------------------------
export function parseFastAiCommand(text: string): ParsedAiIntent | null {
  const clean = text
    .replace(/@TenderRWABot/gi, "")
    .replace(/@TenderRWA/gi, "")
    .trim();

  // 1. Help
  if (/^(help|\?|commands|what can you do)$/i.test(clean)) {
    return {
      action: "help",
      target: null,
      amount: null,
      token: null,
      memo: null,
      confidence: 1.0,
    };
  }

  // 2. Asset / Token queries
  if (
    /^(assets|tokens|supported tokens|what tokens|list assets|universe|available assets|rwas)$/i.test(
      clean,
    ) ||
    /what (assets|tokens|stocks|rwas) are (available|supported|on robinhood)/i.test(clean)
  ) {
    return {
      action: "asset_info",
      target: null,
      amount: null,
      token: null,
      memo: null,
      confidence: 1.0,
    };
  }

  // 3. NFT Transfer: "send nft <address> to @tag", "transfer nft <address> to @tag"
  const evmAddrPattern = "(?:0x[a-fA-F0-9]{40})";
  const nftRegex1 = new RegExp(
    `^(?:send|transfer)\\s+nft\\s+(${evmAddrPattern})\\s+(?:to\\s+)?([@a-zA-Z0-9_-]{3,64})$`,
    "i",
  );
  const matchNft1 = clean.match(nftRegex1);
  if (matchNft1) {
    const contract = matchNft1[1];
    const target = matchNft1[2].startsWith("@") ? matchNft1[2] : `@${matchNft1[2]}`;
    return {
      action: "send_nft",
      target,
      amount: 1,
      token: "NFT",
      memo: contract,
      confidence: 1.0,
    };
  }

  const nftRegex2 = new RegExp(
    `^(?:send|transfer)\\s+([@a-zA-Z0-9_-]{3,64})\\s+nft\\s+(${evmAddrPattern})$`,
    "i",
  );
  const matchNft2 = clean.match(nftRegex2);
  if (matchNft2) {
    const target = matchNft2[1].startsWith("@") ? matchNft2[1] : `@${matchNft2[1]}`;
    const contract = matchNft2[2];
    return {
      action: "send_nft",
      target,
      amount: 1,
      token: "NFT",
      memo: contract,
      confidence: 1.0,
    };
  }

  // 4. Pay / Send / Tip: "pay @timbook 0.002 ETH", "send 50 USDG to @helen2swift", "pay 0.1 eth to @timbook"
  const payRegex1 =
    /^(?:pay|send|tip)\s+([@a-zA-Z0-9_-]{3,64})\s+([0-9.]+)\s*([a-zA-Z0-9]+)?(?:\s+(?:for|memo:?)\s+(.+))?$/i;
  const match1 = clean.match(payRegex1);
  if (match1) {
    const target = match1[1].startsWith("@") ? match1[1] : `@${match1[1]}`;
    const amount = parseFloat(match1[2]);
    const token = (match1[3] || "USDG").toUpperCase();
    const memo = match1[4]?.trim() || null;
    if (!isNaN(amount) && amount > 0) {
      return { action: "send", target, amount, token, memo, confidence: 1.0 };
    }
  }

  const payRegex2 =
    /^(?:pay|send|tip)\s+([0-9.]+)\s*([a-zA-Z0-9]+)?\s+(?:to|for)\s+([@a-zA-Z0-9_-]{3,64})(?:\s+(?:for|memo:?)\s+(.+))?$/i;
  const match2 = clean.match(payRegex2);
  if (match2) {
    const amount = parseFloat(match2[1]);
    const token = (match2[2] || "USDG").toUpperCase();
    const target = match2[3].startsWith("@") ? match2[3] : `@${match2[3]}`;
    const memo = match2[4]?.trim() || null;
    if (!isNaN(amount) && amount > 0) {
      return { action: "send", target, amount, token, memo, confidence: 1.0 };
    }
  }

  // 5. Quote: "quote 100 USDG for @timbook", "quote @timbook 0.002 ETH"
  const quoteRegex =
    /^quote\s+(?:([0-9.]+)\s*([a-zA-Z0-9]+)?\s+(?:for|to)\s+([@a-zA-Z0-9_-]{3,64})|([@a-zA-Z0-9_-]{3,64})\s+([0-9.]+)\s*([a-zA-Z0-9]+)?)$/i;
  const matchQuote = clean.match(quoteRegex);
  if (matchQuote) {
    if (matchQuote[1]) {
      const amount = parseFloat(matchQuote[1]);
      const token = (matchQuote[2] || "USDG").toUpperCase();
      const target = matchQuote[3].startsWith("@") ? matchQuote[3] : `@${matchQuote[3]}`;
      return { action: "quote", target, amount, token, memo: null, confidence: 1.0 };
    } else if (matchQuote[4]) {
      const target = matchQuote[4].startsWith("@") ? matchQuote[4] : `@${matchQuote[4]}`;
      const amount = parseFloat(matchQuote[5]);
      const token = (matchQuote[6] || "USDG").toUpperCase();
      return { action: "quote", target, amount, token, memo: null, confidence: 1.0 };
    }
  }

  // 6. Portfolio / Mix query: "mix @timbook", "election @helen2swift", "portfolio for @timbook", "what is @timbook's mix"
  const electionRegex =
    /^(?:election|elections|mix|mixes|portfolio|allocation|allocations|what is the mix for|what's the mix for|show portfolio for)\s+(?:for\s+)?([@a-zA-Z0-9_-]{3,64})$/i;
  const matchElection = clean.match(electionRegex);
  if (matchElection) {
    const target = matchElection[1].startsWith("@") ? matchElection[1] : `@${matchElection[1]}`;
    return {
      action: "election",
      target,
      amount: null,
      token: null,
      memo: null,
      confidence: 1.0,
    };
  }

  // 7. Bare handle: "@timbook"
  const bareHandleRegex = /^([@a-zA-Z0-9_-]{3,64})$/;
  const matchBare = clean.match(bareHandleRegex);
  if (matchBare && matchBare[1].startsWith("@")) {
    return {
      action: "election",
      target: matchBare[1],
      amount: null,
      token: null,
      memo: null,
      confidence: 0.9,
    };
  }

  // 8. Invoice: "invoice @client 250 USDG for audit", "request 50 USDG from @timbook"
  const invoiceRegex1 =
    /^(?:invoice)\s+([@a-zA-Z0-9_-]{3,64})\s+([0-9.]+)\s*([a-zA-Z0-9]+)?(?:\s+(?:for|memo:?)\s+(.+))?$/i;
  const matchInv1 = clean.match(invoiceRegex1);
  if (matchInv1) {
    const target = matchInv1[1].startsWith("@") ? matchInv1[1] : `@${matchInv1[1]}`;
    const amount = parseFloat(matchInv1[2]);
    const token = (matchInv1[3] || "USDG").toUpperCase();
    const memo = matchInv1[4]?.trim() || null;
    return { action: "invoice", target, amount, token, memo, confidence: 1.0 };
  }

  return null;
}

// -----------------------------------------------------------------------------
// 2. Groq LLM Parser with Injected Robinhood Ecosystem Context
// -----------------------------------------------------------------------------
let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  groqClient ??= new Groq({ apiKey: config.groq.apiKey });
  return groqClient;
}

function buildRobinhoodContext(resolvedHandle?: V2HandleDetails | null): string {
  const assetSummary = FEATURED_ROBINHOOD_ASSETS.map(
    (a) => `• ${a.symbol} (${a.name}, address: ${a.address}, decimals: ${a.decimals}, type: ${a.assetType})`,
  ).join("\n");

  let handleContext = "";
  if (resolvedHandle) {
    const electionList = resolvedHandle.elections
      .map((e) => `${e.percentage}% ${e.symbol} (${e.tokenAddress})`)
      .join(", ");
    handleContext = `\nKnown Mentioned Handle Context:\n• Handle: @${resolvedHandle.handle}\n• Owner Wallet: ${resolvedHandle.ownerWallet}\n• Active Portfolio Elections: ${electionList || "100% USDG"}\n`;
  }

  return `You are TenderAI, the autonomous settlement copilot and AI assistant for TENDER on Robinhood Chain (Chain ID: 4663).
TENDER is a non-custodial receive-side portfolio settlement rail.
How it works on Robinhood Chain:
- Senders pay using working currencies (USDG or ETH).
- The protocol routes and converts the payment via Uniswap V4 pools into the recipient's pre-configured stock and crypto election mix.
- Settled tokens land directly in the recipient's personal EVM wallet with ZERO intermediate escrow custody.
- Direct NFT transfers are also supported to registered handles or raw EVM addresses.

Supported Verified Tokens on Robinhood Chain (Chain 4663):
• ETH (Native Gas, 18 decimals)
• USDG (Global Dollar Stablecoin, address: ${USDG.address}, 6 decimals)
${assetSummary}
${handleContext}
When analyzing user messages:
1. Identify the action: "send" | "quote" | "election" | "invoice" | "send_nft" | "asset_info" | "help" | "chat"
2. Extract the target handle (e.g. "@timbook"), payment amount, and token symbol (USDG or ETH or equity symbol).
3. If the user is asking general questions, chat conversationally, explain how TENDER and Robinhood Chain work, and provide clear guidance.

Return ONLY a JSON object with this structure:
{
  "reply": "<Friendly, concise, terminal-style response explaining the action or answering the query>",
  "action": "send" | "quote" | "election" | "invoice" | "send_nft" | "asset_info" | "help" | "chat",
  "target": string | null,
  "amount": number | null,
  "token": string | null,
  "memo": string | null,
  "confidence": number
}`;
}

export async function parseWithGroq(
  text: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  resolvedHandle?: V2HandleDetails | null,
): Promise<{
  reply: string;
  intent: ParsedAiIntent;
}> {
  if (!config.groq.apiKey) {
    return {
      reply: "TenderAI engine is running in deterministic mode.",
      intent: {
        action: "chat",
        target: null,
        amount: null,
        token: null,
        memo: null,
        confidence: 0,
      },
    };
  }

  try {
    const systemPrompt = buildRobinhoodContext(resolvedHandle);
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    // Append up to last 4 conversation turns for context
    const recentHistory = history.slice(-4);
    for (const h of recentHistory) {
      messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: "user", content: text });

    const res = await getGroqClient().chat.completions.create({
      model: config.groq.model || "llama-3.3-70b-versatile",
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from Groq");

    const parsed = JSON.parse(content);
    return {
      reply: parsed.reply || "Intent identified.",
      intent: {
        action: parsed.action || "chat",
        target: parsed.target ? String(parsed.target).trim() : null,
        amount: typeof parsed.amount === "number" && parsed.amount > 0 ? parsed.amount : null,
        token: parsed.token ? String(parsed.token).toUpperCase().trim() : "USDG",
        memo: parsed.memo ? String(parsed.memo).trim() : null,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
      },
    };
  } catch (err: any) {
    console.error("[TenderAI] Groq call failed:", err);
    return {
      reply: "I couldn't reach the reasoning model, falling back to rule execution.",
      intent: {
        action: "chat",
        target: null,
        amount: null,
        token: null,
        memo: null,
        confidence: 0.1,
      },
    };
  }
}

// -----------------------------------------------------------------------------
// 3. Main TenderAI Chat Orchestrator
// -----------------------------------------------------------------------------
export async function processTenderAiChat(params: {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  userWallet?: string;
}): Promise<AiChatResponse> {
  const { message, history = [], userWallet } = params;
  const cleanText = message.trim();

  // Step 1: Check if a handle is mentioned to pre-fetch details
  const handleMatch = cleanText.match(/@([a-zA-Z0-9_-]{3,64})/);
  let preloadedHandle: V2HandleDetails | null = null;
  if (handleMatch) {
    try {
      preloadedHandle = await getV2HandleDetails(handleMatch[1]);
    } catch {
      // ignore
    }
  }

  // Step 2: Attempt fast regex classification
  let fastIntent = parseFastAiCommand(cleanText);
  let aiReply = "";
  let finalIntent: ParsedAiIntent;

  if (fastIntent && fastIntent.action !== "chat") {
    finalIntent = fastIntent;
  } else {
    // Invoke Groq with enriched Robinhood context
    const groqRes = await parseWithGroq(cleanText, history, preloadedHandle);
    aiReply = groqRes.reply;
    finalIntent = groqRes.intent;
  }

  // Step 3: Handle Enrichment & Action Fulfillment
  let actionCard: ActionCard | null = null;

  // Case: Asset Info
  if (finalIntent.action === "asset_info") {
    const list = FEATURED_ROBINHOOD_ASSETS.map((a) => a.symbol).join(", ");
    if (!aiReply) {
      aiReply = `Robinhood Chain (Chain 4663) supports native ETH, USDG stablecoin, and tokenized equities (${list}) with atomic Uniswap V4 settlement routing.`;
    }
    actionCard = {
      type: "assets",
      title: "Eligible Asset Universe · Robinhood Chain (4663)",
      meta: {
        assets: FEATURED_ROBINHOOD_ASSETS,
        chainId: ROBINHOOD_CHAIN_ID,
      },
    };
    return { reply: aiReply, intent: finalIntent, actionCard };
  }

  // Case: Help
  if (finalIntent.action === "help") {
    if (!aiReply) {
      aiReply =
        "I am TenderAI, your autonomous settlement copilot on Robinhood Chain (4663). You can tell me to:\n" +
        "• 'Pay @timbook 0.002 ETH'\n" +
        "• 'What's the mix for @timbook?'\n" +
        "• 'Quote 50 USDG for @helen2swift'\n" +
        "• 'Send NFT 0x... to @timbook'\n" +
        "• 'What tokens are supported on Robinhood?'";
    }
    actionCard = {
      type: "info",
      title: "TenderAI Capabilities · Robinhood Terminal",
      meta: {
        commands: [
          "Pay @timbook 0.002 ETH",
          "What is @timbook's mix?",
          "Quote 100 USDG for @helen2swift",
          "Send NFT 0x4a0E... to @timbook",
          "What assets are supported?",
        ],
      },
    };
    return { reply: aiReply, intent: finalIntent, actionCard };
  }

  // Case: Handle-based actions (send, quote, election, send_nft, invoice)
  if (finalIntent.target) {
    const rawTarget = finalIntent.target.replace(/^@|^#/, "").toLowerCase().trim();
    const handleDetails = preloadedHandle || (await getV2HandleDetails(rawTarget));

    if (!handleDetails || !handleDetails.ownerWallet) {
      finalIntent.isRegistered = false;
      finalIntent.recipientHandle = rawTarget;
      const unregReply = `@${rawTarget} is not yet registered on TENDER Robinhood Chain. They need to connect their wallet on tenderrwa.com and claim their tag to receive portfolio-settled payments.`;
      return {
        reply: aiReply || unregReply,
        intent: finalIntent,
        actionCard: {
          type: "info",
          title: `Tag @${rawTarget} Not Registered`,
          recipientHandle: rawTarget,
          meta: { isRegistered: false },
        },
      };
    }

    finalIntent.isRegistered = true;
    finalIntent.recipientHandle = handleDetails.handle;
    finalIntent.recipientWallet = handleDetails.ownerWallet;

    // --- Case: Election Query ---
    if (finalIntent.action === "election") {
      const legs = (handleDetails.elections || []).map((e) => ({
        symbol: e.symbol,
        percentage: e.percentage,
        allocatedAmount: "0",
        tokenAddress: e.tokenAddress,
      }));

      const allocStr = legs.map((l) => `${l.percentage}% ${l.symbol}`).join(", ");
      const msg = `@${handleDetails.handle}'s active portfolio election on Robinhood Chain: ${allocStr || "100% USDG"}. Incoming payments convert atomically via Uniswap V4.`;

      actionCard = {
        type: "portfolio",
        title: `@${handleDetails.handle} Portfolio Mix`,
        recipientHandle: handleDetails.handle,
        recipientWallet: handleDetails.ownerWallet,
        legs,
      };

      return {
        reply: aiReply || msg,
        intent: finalIntent,
        actionCard,
      };
    }

    // --- Case: Send NFT ---
    if (finalIntent.action === "send_nft") {
      const contract = (finalIntent.memo || "").trim();
      const isValid = isValidEvmAddress(contract);

      if (!isValid) {
        return {
          reply: `Please provide a valid 42-character EVM contract address (0x...) for the NFT transfer on Robinhood Chain.`,
          intent: finalIntent,
          actionCard: null,
        };
      }

      actionCard = {
        type: "nft",
        title: `Transfer NFT to @${handleDetails.handle}`,
        recipientHandle: handleDetails.handle,
        recipientWallet: handleDetails.ownerWallet,
        memo: contract,
        meta: {
          contractAddress: contract,
          chainId: ROBINHOOD_CHAIN_ID,
        },
      };

      const nftReply = `NFT transfer prepared! Transfer contract ${contract.slice(0, 6)}…${contract.slice(-4)} directly to @${handleDetails.handle} (${handleDetails.ownerWallet.slice(0, 6)}…${handleDetails.ownerWallet.slice(-4)}) on Robinhood Chain.`;

      return {
        reply: aiReply || nftReply,
        intent: finalIntent,
        actionCard,
      };
    }

    // --- Case: Invoice ---
    if (finalIntent.action === "invoice" && finalIntent.amount) {
      actionCard = {
        type: "invoice",
        title: `Invoice for @${handleDetails.handle}`,
        recipientHandle: handleDetails.handle,
        recipientWallet: handleDetails.ownerWallet,
        amount: finalIntent.amount,
        token: finalIntent.token || "USDG",
        memo: finalIntent.memo || undefined,
      };

      const invReply = `Invoice prepared for @${handleDetails.handle}: ${finalIntent.amount} ${finalIntent.token || "USDG"}${finalIntent.memo ? ` (${finalIntent.memo})` : ""}.`;
      return {
        reply: aiReply || invReply,
        intent: finalIntent,
        actionCard,
      };
    }

    // --- Case: Send Payment or Quote ---
    if ((finalIntent.action === "send" || finalIntent.action === "quote") && finalIntent.amount) {
      const tokenSymbol = (finalIntent.token || "USDG").toUpperCase();
      const inToken = resolveRobinhoodToken(tokenSymbol) || USDG;
      finalIntent.token = inToken.symbol;

      const electionLegs: PortfolioElectionLeg[] =
        handleDetails.elections && handleDetails.elections.length > 0
          ? handleDetails.elections.map((e) => ({
              symbol: e.symbol,
              tokenAddress: e.tokenAddress,
              basisPoints: e.basisPoints,
              percentage: e.percentage,
              token: e.token || resolveRobinhoodToken(e.symbol) || USDG,
            }))
          : [
              {
                symbol: "USDG",
                tokenAddress: USDG.address,
                basisPoints: 10000,
                percentage: 100,
                token: USDG,
              },
            ];

      let quoteResult: PortfolioSettlementQuoteResult | undefined;
      try {
        quoteResult = await quotePortfolioSettlement({
          userWallet: userWallet || "0x0000000000000000000000000000000000000000",
          recipientWallet: handleDetails.ownerWallet,
          recipientHandle: handleDetails.handle,
          fromToken: inToken,
          totalAmountIn: finalIntent.amount,
          elections: electionLegs,
        });
      } catch (err) {
        console.warn("[TenderAI] Failed to quote portfolio settlement:", err);
      }

      const summary =
        quoteResult?.legs?.map((leg) => ({
          symbol: leg.assetSymbol,
          percentage: leg.percentage,
          allocatedAmount: leg.quote?.amountOutFormatted || leg.allocatedInAmountFormatted,
          tokenAddress: leg.assetAddress,
        })) ||
        electionLegs.map((leg) => ({
          symbol: leg.symbol,
          percentage: leg.percentage,
          allocatedAmount: ((finalIntent.amount! * leg.basisPoints) / 10000).toString(),
          tokenAddress: leg.tokenAddress,
        }));

      finalIntent.portfolioSummary = summary;
      finalIntent.quote = quoteResult;

      const allocStr = summary
        .map((s) => `${s.percentage}% ${s.symbol} (~${Number(s.allocatedAmount).toFixed(4)})`)
        .join(", ");

      const actionType = finalIntent.action === "send" ? "payment" : "quote";
      const cardTitle =
        finalIntent.action === "send"
          ? `Settlement Order: ${finalIntent.amount} ${inToken.symbol} → @${handleDetails.handle}`
          : `Quote: ${finalIntent.amount} ${inToken.symbol} → @${handleDetails.handle}`;

      actionCard = {
        type: actionType,
        title: cardTitle,
        recipientHandle: handleDetails.handle,
        recipientWallet: handleDetails.ownerWallet,
        amount: finalIntent.amount,
        token: inToken.symbol,
        tokenDetails: inToken,
        legs: summary,
        totalAmountIn: `${finalIntent.amount} ${inToken.symbol}`,
        meta: {
          memo: finalIntent.memo,
          chainId: ROBINHOOD_CHAIN_ID,
          quote: quoteResult,
        },
      };

      if (!aiReply) {
        aiReply =
          finalIntent.action === "send"
            ? `I have prepared the payment of ${finalIntent.amount} ${inToken.symbol} to @${handleDetails.handle}. It will settle into their elected mix (${allocStr}) on Robinhood Chain with zero escrow custody.`
            : `Quote for ${finalIntent.amount} ${inToken.symbol} to @${handleDetails.handle}: Settles across ${allocStr} on Robinhood Chain.`;
      }

      return {
        reply: aiReply,
        intent: finalIntent,
        actionCard,
      };
    }
  }

  // Fallback / General conversation response
  if (!aiReply) {
    aiReply =
      "I'm ready. You can ask me for quotes, payments, portfolio mixes, or eligible assets on Robinhood Chain.";
  }

  return {
    reply: aiReply,
    intent: finalIntent,
    actionCard,
  };
}
