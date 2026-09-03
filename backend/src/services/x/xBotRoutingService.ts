import { query } from "../../db";
import { resolveSolanaToken } from "../../lib/rwaTokens";
import { calculatePortfolioElectionQuotes, formatTokenUnits } from "../dualQuoteEngine";
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
        "TENDER settles incoming payments into custom stock portfolios on Solana. Mention me with:\n• 'pay @handle 50 USDC'\n• 'quote 100 USDC for @handle'\nTap the link in my bio to claim your handle.",
      recipientHandle: "",
      recipientWallet: "",
      isRegistered: false,
    };
  }

  // 2. Election / Portfolio query action
  if (intent.action === "election" && intent.target) {
    const cleanHandle = intent.target.replace(/^@/, "").toLowerCase().trim();
    const handleRes = await query(
      "SELECT handle, owner_wallet FROM handles WHERE handle = $1 OR LOWER(x_username) = $1 LIMIT 1",
      [cleanHandle]
    );

    let recipientHandle = cleanHandle;
    let recipientWallet = "";

    if (handleRes.rows && handleRes.rows.length > 0) {
      recipientHandle = handleRes.rows[0].handle;
      recipientWallet = handleRes.rows[0].owner_wallet;
    } else {
      const xAccRes = await query(
        "SELECT wallet_address, x_username FROM x_accounts WHERE LOWER(x_username) = $1 LIMIT 1",
        [cleanHandle]
      );
      if (xAccRes.rows && xAccRes.rows.length > 0) {
        recipientWallet = xAccRes.rows[0].wallet_address;
        const wHandleRes = await query(
          "SELECT handle FROM handles WHERE owner_wallet = $1 LIMIT 1",
          [recipientWallet]
        );
        if (wHandleRes.rows && wHandleRes.rows.length > 0) {
          recipientHandle = wHandleRes.rows[0].handle;
        }
      }
    }

    if (!recipientWallet) {
      return {
        replyText: `@${cleanHandle} hasn't registered a portfolio on TENDER yet. Tap the link in my bio to claim this handle and elect your stock mix.`,
        recipientHandle: cleanHandle,
        recipientWallet: "",
        isRegistered: false,
      };
    }

    const electionsRes = await query(
      "SELECT asset_symbol, basis_points FROM handle_elections WHERE handle = $1 AND is_active = TRUE ORDER BY basis_points DESC",
      [recipientHandle]
    );

    if (!electionsRes.rows || electionsRes.rows.length === 0) {
      return {
        replyText: `@${recipientHandle} has no active portfolio elections set yet. Tap the link in my bio to set your allocation.`,
        recipientHandle,
        recipientWallet,
        isRegistered: true,
      };
    }

    const allocStr = electionsRes.rows
      .map((r: any) => `${Math.round(r.basis_points / 100)}% ${r.asset_symbol}`)
      .join(", ");

    return {
      replyText: `@${recipientHandle}'s active receive-side portfolio: ${allocStr}. Settles atomically on Solana via Jupiter & Relay.`,
      recipientHandle,
      recipientWallet,
      isRegistered: true,
    };
  }

  // 3. Invoice action
  if (intent.action === "invoice" && intent.target && intent.amount) {
    const payerHandle = intent.target.replace(/^@/, "").toLowerCase().trim();
    const tokenSymbol = (intent.token || "USDC").toUpperCase();
    const token = resolveSolanaToken(tokenSymbol);
    const finalMint = token?.mint || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const finalSymbol = token?.symbol || "USDC";

    // Lookup author in registry to be the recipient of the invoice funds
    const cleanAuthor = authorHandle ? authorHandle.toLowerCase().replace(/^@/, "").trim() : "";
    let recipientHandle = cleanAuthor;
    let recipientWallet = "";

    if (cleanAuthor) {
      const authorRes = await query(
        "SELECT handle, owner_wallet FROM handles WHERE handle = $1 OR LOWER(x_username) = $1 LIMIT 1",
        [cleanAuthor]
      );
      if (authorRes.rows && authorRes.rows.length > 0) {
        recipientHandle = authorRes.rows[0].handle;
        recipientWallet = authorRes.rows[0].owner_wallet;
      }
    }

    if (!recipientWallet) {
      return {
        replyText: `@${cleanAuthor || "there"} you haven't claimed your handle on TENDER yet to issue invoices. Tap the link in my bio to register.`,
        recipientHandle: cleanAuthor,
        recipientWallet: "",
        isRegistered: false,
      };
    }

    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await query(
        `INSERT INTO invoices (
          id, recipient_handle, recipient_wallet, amount, token_mint, token_symbol, memo, status, expires_at, creator_wallet, creator_handle
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)`,
        [
          invoiceId,
          recipientHandle,
          recipientWallet,
          intent.amount,
          finalMint,
          finalSymbol,
          intent.memo || null,
          expiresAt,
          recipientWallet,
          recipientHandle,
        ]
      );
    } catch (err: any) {
      console.error("[Bot Routing] Error creating invoice from tweet:", err);
    }

    const memoPart = intent.memo ? ` · Memo: ${intent.memo}` : "";
    return {
      replyText: `Invoice recorded for @${payerHandle} (${intent.amount} ${finalSymbol}${memoPart}). Tap the link in my bio to view and pay.`,
      recipientHandle,
      recipientWallet,
      isRegistered: true,
    };
  }

  // 4. Unrecognized action
  if (intent.action === "unrecognized" || !intent.target || !intent.amount) {
    return {
      replyText:
        "Couldn't identify a payment recipient or amount. Try: '@TenderRWABot pay @handle 50 USDC', '@TenderRWABot quote 100 USDC for @handle', or '@TenderRWABot mix @handle'. Tap the link in my bio to open the terminal.",
      recipientHandle: "",
      recipientWallet: "",
      isRegistered: false,
    };
  }

  const cleanHandle = intent.target.replace(/^@/, "").toLowerCase().trim();
  const tokenSymbol = (intent.token || "USDC").toUpperCase();
  const inToken = resolveSolanaToken(tokenSymbol);

  if (!inToken) {
    return {
      replyText: `Unsupported payment token '${tokenSymbol}'. TENDER accepts USDC or SOL on Solana. Tap the link in my bio for details.`,
      recipientHandle: cleanHandle,
      recipientWallet: "",
      isRegistered: false,
    };
  }

  // 3. Lookup handle in registry (by handle name or by linked X username)
  let recipientHandle = cleanHandle;
  let recipientWallet = "";

  const handleRes = await query(
    "SELECT handle, owner_wallet FROM handles WHERE handle = $1 OR LOWER(x_username) = $1 LIMIT 1",
    [cleanHandle]
  );

  if (handleRes.rows && handleRes.rows.length > 0) {
    recipientHandle = handleRes.rows[0].handle;
    recipientWallet = handleRes.rows[0].owner_wallet;
  } else {
    // Check x_accounts directly
    const xAccRes = await query(
      "SELECT wallet_address, x_username FROM x_accounts WHERE LOWER(x_username) = $1 LIMIT 1",
      [cleanHandle]
    );
    if (xAccRes.rows && xAccRes.rows.length > 0) {
      recipientWallet = xAccRes.rows[0].wallet_address;
      const wHandleRes = await query(
        "SELECT handle FROM handles WHERE owner_wallet = $1 LIMIT 1",
        [recipientWallet]
      );
      if (wHandleRes.rows && wHandleRes.rows.length > 0) {
        recipientHandle = wHandleRes.rows[0].handle;
      }
    }
  }

  if (!recipientWallet) {
    return {
      replyText: `@${cleanHandle} hasn't registered a portfolio election on TENDER yet. Tap the link in my bio to claim this handle and choose your stock mix.`,
      recipientHandle: cleanHandle,
      recipientWallet: "",
      isRegistered: false,
    };
  }

  // 4. Lookup active elections
  const electionsRes = await query(
    "SELECT asset_symbol, asset_mint, basis_points FROM handle_elections WHERE handle = $1 AND is_active = TRUE",
    [cleanHandle]
  );

  if (!electionsRes.rows || electionsRes.rows.length === 0) {
    return {
      replyText: `@${cleanHandle} has no active portfolio elections set. Tap the link in my bio to update portfolio preferences.`,
      recipientHandle: cleanHandle,
      recipientWallet,
      isRegistered: true,
    };
  }

  const elections = electionsRes.rows.map((r: any) => ({
    assetSymbol: r.asset_symbol,
    assetMint: r.asset_mint,
    basisPoints: r.basis_points,
  }));

  const inDecimals = inToken.decimals;
  const inAmountBig = BigInt(Math.round(intent.amount * 10 ** inDecimals));

  try {
    const portfolioQuote = await calculatePortfolioElectionQuotes({
      inputMint: inToken.mint,
      totalAmountIn: inAmountBig.toString(),
      elections,
      recipientWallet,
    });

    const breakdownPills = portfolioQuote.legs.map((leg) => {
      const pct = (leg.basisPoints / 100).toFixed(0);
      return `${pct}% ${leg.assetSymbol}`;
    });

    const quoteOutputs = portfolioQuote.legs.map((leg) => {
      const outAmt = parseFloat(leg.quote.outAmountFormatted || "0");
      let displayAmt = "";
      if (outAmt <= 0) {
        displayAmt = `${(leg.basisPoints / 100).toFixed(0)}%`;
      } else if (outAmt < 0.0001) {
        displayAmt = `~${outAmt.toPrecision(2)}`;
      } else if (outAmt < 1) {
        displayAmt = `~${outAmt.toFixed(5).replace(/0+$/, "").replace(/\.$/, "")}`;
      } else {
        displayAmt = `~${outAmt.toFixed(2)}`;
      }
      return `${displayAmt} ${leg.assetSymbol}`;
    });

    const summaryList = portfolioQuote.legs.map((leg) => ({
      symbol: leg.assetSymbol,
      percentage: leg.basisPoints / 100,
      allocatedAmount: leg.allocatedInAmountFormatted,
    }));

    // Save pending settlement row ONLY for payment actions (pay/send/tip), NEVER for quotes
    if (tweetId && intent.action !== "quote") {
      try {
        await query(
          `INSERT INTO pending_settlements (
             source_ref, author_x_id, author_x_handle,
             recipient_handle, recipient_wallet,
             input_token, input_amount, portfolio_summary, tweet_url, status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
           ON CONFLICT (source_ref) DO NOTHING`,
          [
            tweetId,
            authorId || null,
            authorHandle || null,
            cleanHandle,
            recipientWallet,
            inToken.symbol,
            intent.amount,
            JSON.stringify(summaryList),
            `https://x.com/${authorHandle || "i"}/status/${tweetId}`,
          ]
        );
      } catch (err) {
        console.warn("Could not save pending settlement, continuing:", err);
      }
    }

    const replyText =
      intent.action === "quote"
        ? `Quote for @${cleanHandle}: ${intent.amount} ${inToken.symbol} estimates into ${quoteOutputs.join(", ")}. Tap the link in my bio to open the terminal.`
        : `Slicing ${intent.amount} ${inToken.symbol} for @${cleanHandle} into ${breakdownPills.join(", ")}. Tap the link in my bio to review and sign it in your dashboard.`;

    return {
      replyText,
      recipientHandle: cleanHandle,
      recipientWallet,
      isRegistered: true,
      portfolioSummary: summaryList,
    };
  } catch (err: any) {
    return {
      replyText: `Could not quote @${cleanHandle}'s election: ${err.message}. Tap the link in my bio to check portfolio assets.`,
      recipientHandle: cleanHandle,
      recipientWallet,
      isRegistered: true,
    };
  }
}
