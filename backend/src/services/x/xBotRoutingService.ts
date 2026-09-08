import { query } from "../../db";
import {
  resolveRobinhoodToken,
  RobinhoodTokenInfo,
  USDG,
  ETH,
  isValidEvmAddress,
  formatTokenUnits,
} from "../../v2/lib/robinhoodTokens";
import { getV2HandleDetails } from "../../v2/services/handleService";
import {
  quotePortfolioSettlement,
  PortfolioElectionLeg,
} from "../../v2/services/robinhoodSettlement";
import type { ParsedBotIntent } from "./groqIntentParser";

export interface BotRoutingResult {
  replyText: string;
  recipientHandle: string;
  recipientWallet: string;
  isRegistered: boolean;
  portfolioSummary?: Array<{ symbol: string; percentage: number; allocatedAmount: string }>;
}

export async function routeBotIntent(params: {
  intent: ParsedBotIntent;
  authorHandle?: string;
  authorId?: string;
  tweetId?: string;
}): Promise<BotRoutingResult> {
  const { intent, authorHandle, authorId, tweetId } = params;

  // 1. Help action
  if (intent.action === "help") {
    return {
      replyText:
        "TENDER settles incoming payments into custom stock portfolios on Robinhood Chain (Chain 4663). Mention me with:\n• 'pay @handle 50 USDG'\n• 'quote 100 USDG for @handle'\n• 'send 0.1 ETH to @handle'\nTap the link in my bio to claim your handle.",
      recipientHandle: "",
      recipientWallet: "",
      isRegistered: false,
    };
  }

  // 2. Election / Portfolio query action
  if (intent.action === "election" && intent.target) {
    const cleanHandle = intent.target.replace(/^@|^#/, "").toLowerCase().trim();
    const handleDetails = await getV2HandleDetails(cleanHandle);

    if (!handleDetails || !handleDetails.ownerWallet) {
      return {
        replyText: `@${cleanHandle} hasn't registered a portfolio on TENDER Robinhood yet. Tap the link in my bio to claim this handle and elect your stock mix.`,
        recipientHandle: cleanHandle,
        recipientWallet: "",
        isRegistered: false,
      };
    }

    if (!handleDetails.elections || handleDetails.elections.length === 0) {
      return {
        replyText: `@${handleDetails.handle} has no active portfolio elections set yet. Tap the link in my bio to set your allocation.`,
        recipientHandle: handleDetails.handle,
        recipientWallet: handleDetails.ownerWallet,
        isRegistered: true,
      };
    }

    const allocStr = handleDetails.elections
      .map((e) => `${Math.round(e.basisPoints / 100)}% ${e.symbol}`)
      .join(", ");

    return {
      replyText: `@${handleDetails.handle}'s active receive-side portfolio: ${allocStr}. Settles atomically on Robinhood Chain via Uniswap V4.`,
      recipientHandle: handleDetails.handle,
      recipientWallet: handleDetails.ownerWallet,
      isRegistered: true,
    };
  }

  // 3. Invoice action
  if (intent.action === "invoice" && intent.target && intent.amount) {
    const payerHandle = intent.target.replace(/^@|^#/, "").toLowerCase().trim();
    const tokenSymbol = (intent.token || "USDG").toUpperCase();
    const token = resolveRobinhoodToken(tokenSymbol) || USDG;

    // Lookup author in Robinhood registry to receive invoice funds
    const cleanAuthor = authorHandle ? authorHandle.toLowerCase().replace(/^@|^#/, "").trim() : "";
    let recipientHandle = cleanAuthor;
    let recipientWallet = "";

    if (cleanAuthor) {
      const authorDetails = await getV2HandleDetails(cleanAuthor);
      if (authorDetails) {
        recipientHandle = authorDetails.handle;
        recipientWallet = authorDetails.ownerWallet;
      }
    }

    if (!recipientWallet) {
      return {
        replyText: `@${cleanAuthor || "there"} you haven't claimed your handle on TENDER Robinhood yet to issue invoices. Tap the link in my bio to register.`,
        recipientHandle: cleanAuthor,
        recipientWallet: "",
        isRegistered: false,
      };
    }

    const invoiceId = `rh_inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await query(
        `INSERT INTO v2_invoices (
          id, recipient_handle, recipient_wallet, target_amount, target_token_symbol,
          target_token_address, memo, status, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, NOW())`,
        [
          invoiceId,
          recipientHandle,
          recipientWallet,
          intent.amount,
          token.symbol,
          token.address,
          intent.memo || null,
          expiresAt,
        ]
      );
    } catch (err: any) {
      console.error("[Bot Routing] Error creating Robinhood invoice from tweet:", err);
    }

    const memoPart = intent.memo ? ` · Memo: ${intent.memo}` : "";
    return {
      replyText: `Invoice recorded for @${payerHandle} (${intent.amount} ${token.symbol}${memoPart}) on Robinhood Chain. Tap the link in my bio to view and pay.`,
      recipientHandle,
      recipientWallet,
      isRegistered: true,
    };
  }

  // 3b. Send NFT action: Direct EVM transfer on Robinhood Chain
  if (intent.action === "send_nft" && intent.target && intent.memo) {
    const cleanHandle = intent.target.replace(/^@|^#/, "").toLowerCase().trim();
    const nftContract = intent.memo.trim();

    if (!isValidEvmAddress(nftContract)) {
      return {
        replyText: `@${cleanHandle} Invalid NFT contract address '${nftContract}'. Please provide a valid 42-character EVM address (0x...) on Robinhood Chain.`,
        recipientHandle: cleanHandle,
        recipientWallet: "",
        isRegistered: false,
      };
    }

    const handleDetails = await getV2HandleDetails(cleanHandle);
    if (!handleDetails || !handleDetails.ownerWallet) {
      return {
        replyText: `@${cleanHandle} hasn't registered their tag on TENDER Robinhood yet. Tap the link in my bio to claim this handle and receive NFTs.`,
        recipientHandle: cleanHandle,
        recipientWallet: "",
        isRegistered: false,
      };
    }

    if (tweetId) {
      try {
        await query(
          `INSERT INTO pending_settlements (
             source_ref, author_x_id, author_x_handle,
             recipient_handle, recipient_wallet,
             input_token, input_amount, token_mint, asset_type, portfolio_summary, tweet_url, status,
             chain, network_id
           ) VALUES ($1, $2, $3, $4, $5, 'NFT', 1, $6, 'nft', $7, $8, 'pending', 'robinhood', 4663)
           ON CONFLICT (source_ref) DO NOTHING`,
          [
            tweetId,
            authorId || null,
            authorHandle || null,
            handleDetails.handle,
            handleDetails.ownerWallet,
            nftContract,
            JSON.stringify([
              {
                symbol: "NFT",
                name: `NFT (${nftContract.slice(0, 6)}…${nftContract.slice(-4)})`,
                mint: nftContract,
                percentage: 100,
                allocatedAmount: "1",
                isNft: true,
              },
            ]),
            tweetId ? `https://x.com/${authorHandle || "i"}/status/${tweetId}` : null,
          ]
        );
      } catch (dbErr) {
        console.error("[Bot Service] Failed to save pending Robinhood NFT settlement:", dbErr);
      }
    }

    const shortWallet = `${handleDetails.ownerWallet.slice(0, 6)}…${handleDetails.ownerWallet.slice(-4)}`;
    return {
      replyText: `NFT transfer staged for @${handleDetails.handle}! 🖼️ Direct transfer of contract ${nftContract.slice(0, 6)}…${nftContract.slice(-4)} to @${handleDetails.handle} (${shortWallet}) on Robinhood Chain (4663). Tap the link in my bio to review and sign.`,
      recipientHandle: handleDetails.handle,
      recipientWallet: handleDetails.ownerWallet,
      isRegistered: true,
    };
  }

  // 4. Unrecognized action
  if (intent.action === "unrecognized" || !intent.target || !intent.amount) {
    return {
      replyText:
        "Couldn't identify a payment recipient or amount. Try: '@TenderRWABot pay @handle 50 USDG', '@TenderRWABot quote 100 USDG for @handle', or '@TenderRWABot mix @handle'. Tap the link in my bio to open the Robinhood terminal.",
      recipientHandle: "",
      recipientWallet: "",
      isRegistered: false,
    };
  }

  // 5. Send / Quote Action on Robinhood Chain
  const cleanHandle = intent.target.replace(/^@|^#/, "").toLowerCase().trim();
  const tokenSymbol = (intent.token || "USDG").toUpperCase();
  const inToken = resolveRobinhoodToken(tokenSymbol);

  if (!inToken) {
    return {
      replyText: `Unsupported payment token '${tokenSymbol}'. TENDER on Robinhood Chain accepts USDG, ETH, or tokenized equities (SPCX, NVDA, AAPL). Tap the link in my bio for details.`,
      recipientHandle: cleanHandle,
      recipientWallet: "",
      isRegistered: false,
    };
  }

  // Lookup Robinhood Tag Details
  const handleDetails = await getV2HandleDetails(cleanHandle);
  if (!handleDetails || !handleDetails.ownerWallet) {
    return {
      replyText: `@${cleanHandle} hasn't registered their portfolio on TENDER Robinhood yet. Tap the link in my bio to claim this tag and elect your receive-mix.`,
      recipientHandle: cleanHandle,
      recipientWallet: "",
      isRegistered: false,
    };
  }

  const recipientHandle = handleDetails.handle;
  const recipientWallet = handleDetails.ownerWallet;

  // Active elections on Robinhood Chain
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

  // Calculate Robinhood portfolio quotes via Uniswap V4
  let portfolioResult;
  try {
    portfolioResult = await quotePortfolioSettlement({
      userWallet: "0x0000000000000000000000000000000000000000",
      recipientWallet,
      recipientHandle,
      fromToken: inToken,
      totalAmountIn: intent.amount,
      elections: electionLegs,
    });
  } catch (quoteErr: any) {
    console.error("[Bot Service] Failed to calculate Robinhood portfolio quote:", quoteErr);
  }

  const portfolioSummary = portfolioResult?.legs?.map((leg) => ({
    symbol: leg.assetSymbol,
    percentage: leg.percentage,
    allocatedAmount: leg.quote?.amountOutFormatted || leg.allocatedInAmountFormatted,
  })) || electionLegs.map((leg) => ({
    symbol: leg.symbol,
    percentage: leg.percentage,
    allocatedAmount: ((intent.amount! * leg.basisPoints) / 10000).toString(),
  }));

  const allocStr = portfolioSummary
    .map((leg) => `${leg.percentage}% ${leg.symbol} (~${Number(leg.allocatedAmount).toFixed(2)})`)
    .join(", ");

  // Handle quote command (read-only)
  if (intent.action === "quote") {
    return {
      replyText: `Quote for @${recipientHandle}: ${intent.amount} ${inToken.symbol} allocates to: ${allocStr} on Robinhood Chain via Uniswap V4. Tap the link in my bio to execute.`,
      recipientHandle,
      recipientWallet,
      isRegistered: true,
      portfolioSummary,
    };
  }

  // Handle send / pay command (stages Robinhood pending settlement)
  if (tweetId) {
    try {
      await query(
        `INSERT INTO pending_settlements (
           source_ref, author_x_id, author_x_handle,
           recipient_handle, recipient_wallet,
           input_token, input_amount, token_mint, asset_type, portfolio_summary, tweet_url, status,
           chain, network_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 'robinhood', 4663)
         ON CONFLICT (source_ref) DO NOTHING`,
        [
          tweetId,
          authorId || null,
          authorHandle || null,
          recipientHandle,
          recipientWallet,
          inToken.symbol,
          intent.amount,
          inToken.address,
          inToken.assetType,
          JSON.stringify(portfolioSummary),
          tweetId ? `https://x.com/${authorHandle || "i"}/status/${tweetId}` : null,
        ]
      );
    } catch (dbErr) {
      console.error("[Bot Service] Failed to save Robinhood pending settlement:", dbErr);
    }
  }

  return {
    replyText: `Payment staged for @${recipientHandle}! ⚡ Settling ${intent.amount} ${inToken.symbol} into @${recipientHandle}'s portfolio (${allocStr}) on Robinhood Chain (4663). Tap the link in my bio to review and sign in your dashboard.`,
    recipientHandle,
    recipientWallet,
    isRegistered: true,
    portfolioSummary,
  };
}
