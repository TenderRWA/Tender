import { describe, expect, it } from "bun:test";
import supertest from "supertest";
import { app } from "../src/app";
import {
  ROBINHOOD_CHAIN_ID,
  isValidEvmAddress,
  resolveRobinhoodToken,
  parseTokenUnits,
  formatTokenUnits,
  USDG,
  ETH,
} from "../src/v2/lib/robinhoodTokens";
import {
  quoteSingleSwap,
  quotePortfolioSettlement,
} from "../src/v2/services/robinhoodSettlement";
import {
  registerV2Handle,
  getV2HandleDetails,
} from "../src/v2/services/handleService";
import { parseFastCommand } from "../src/services/x/commandParser";
import { routeBotIntent } from "../src/services/x/xBotRoutingService";

const request = supertest(app);

describe("Robinhood Chain V2 - Token Catalog & Utilities", () => {
  it("validates EVM addresses accurately", () => {
    expect(isValidEvmAddress("0x5fc5360d0400a0fd4f2af552add042d716f1d168")).toBe(true);
    expect(isValidEvmAddress("0x0000000000000000000000000000000000000000")).toBe(true);
    expect(isValidEvmAddress("invalid-address")).toBe(false);
    expect(isValidEvmAddress("8NF7qtX5DQvyhokuBbhD65MXSWgv6q7JFjd4dfb9rZKA")).toBe(false); // Solana address
    expect(isValidEvmAddress("")).toBe(false);
    expect(isValidEvmAddress(null)).toBe(false);
  });

  it("resolves canonical Robinhood tokens and tickers", () => {
    const usdg = resolveRobinhoodToken("USDG");
    expect(usdg).toBeDefined();
    expect(usdg?.decimals).toBe(6);
    expect(usdg?.address.toLowerCase()).toBe("0x5fc5360d0400a0fd4f2af552add042d716f1d168");

    const eth = resolveRobinhoodToken("ETH");
    expect(eth).toBeDefined();
    expect(eth?.isNative).toBe(true);
    expect(eth?.decimals).toBe(18);

    const spcx = resolveRobinhoodToken("SPCX");
    expect(spcx).toBeDefined();
    expect(spcx?.symbol).toBe("SPCX");
    expect(spcx?.name).toContain("SpaceX");

    const nvda = resolveRobinhoodToken("NVDA");
    expect(nvda).toBeDefined();
    expect(nvda?.symbol).toBe("NVDA");
  });

  it("resolves ticker aliases correctly", () => {
    const spacex = resolveRobinhoodToken("SPACEX");
    expect(spacex?.symbol).toBe("SPCX");

    const aaplr = resolveRobinhoodToken("AAPLR");
    expect(aaplr?.symbol).toBe("AAPL");

    const usdcAlias = resolveRobinhoodToken("USDC");
    expect(usdcAlias?.symbol).toBe("USDG");
  });

  it("formats and parses atomic token units correctly", () => {
    const atomic6 = parseTokenUnits(50, 6);
    expect(atomic6).toBe("50000000");
    expect(formatTokenUnits(atomic6, 6)).toBe("50");

    const atomic18 = parseTokenUnits(0.5, 18);
    expect(atomic18).toBe("500000000000000000");
    expect(formatTokenUnits(atomic18, 18)).toBe("0.5");
  });
});

describe("Robinhood Chain V2 - Settlement Quoting Engine", () => {
  it("generates instant 1:1 direct execution for same-asset payment (USDG -> USDG)", async () => {
    const quote = await quoteSingleSwap({
      userWallet: "0x1111111111111111111111111111111111111111",
      recipientWallet: "0x2222222222222222222222222222222222222222",
      fromToken: USDG,
      toToken: USDG,
      amountIn: 100,
    });

    expect(quote.executionVenue).toBe("same_asset");
    expect(quote.rate).toBe("1.0");
    expect(quote.amountInFormatted).toBe("100");
    expect(quote.amountOutFormatted).toBe("100");
    expect(quote.priceImpactPct).toBe(0);
    expect(quote.steps).toHaveLength(1);
    expect(quote.steps![0].id).toBe("transfer");
  });

  it("generates Uniswap V4 / Relay swap quote for cross-currency trade (USDG -> SPCX)", async () => {
    const spcx = resolveRobinhoodToken("SPCX")!;
    const quote = await quoteSingleSwap({
      userWallet: "0x1111111111111111111111111111111111111111",
      recipientWallet: "0x2222222222222222222222222222222222222222",
      fromToken: USDG,
      toToken: spcx,
      amountIn: 100,
    });

    expect(quote.fromToken.symbol).toBe("USDG");
    expect(quote.toToken.symbol).toBe("SPCX");
    expect(Number(quote.amountOutFormatted)).toBeGreaterThan(0);
    expect(quote.steps).toBeDefined();
    expect(quote.steps!.length).toBeGreaterThan(0);
  });

  it("quotes multi-leg portfolio allocation across elections", async () => {
    const spcx = resolveRobinhoodToken("SPCX")!;
    const nvda = resolveRobinhoodToken("NVDA")!;

    const portfolioQuote = await quotePortfolioSettlement({
      userWallet: "0x1111111111111111111111111111111111111111",
      recipientWallet: "0x2222222222222222222222222222222222222222",
      recipientHandle: "ninjastorm",
      fromToken: USDG,
      totalAmountIn: 100,
      elections: [
        { symbol: "SPCX", tokenAddress: spcx.address, basisPoints: 6000, percentage: 60, token: spcx },
        { symbol: "USDG", tokenAddress: USDG.address, basisPoints: 3000, percentage: 30, token: USDG },
        { symbol: "NVDA", tokenAddress: nvda.address, basisPoints: 1000, percentage: 10, token: nvda },
      ],
    });

    expect(portfolioQuote.recipientHandle).toBe("ninjastorm");
    expect(portfolioQuote.legs).toHaveLength(3);
    expect(portfolioQuote.legs[0].assetSymbol).toBe("SPCX");
    expect(portfolioQuote.legs[0].percentage).toBe(60);
    expect(portfolioQuote.legs[1].assetSymbol).toBe("USDG");
    expect(portfolioQuote.legs[1].percentage).toBe(30);
    expect(portfolioQuote.legs[2].assetSymbol).toBe("NVDA");
    expect(portfolioQuote.legs[2].percentage).toBe(10);
  });
});

describe("Robinhood Chain V2 - Handle & Election Service", () => {
  it("rejects handle registration with invalid basis points sum (!= 10000)", async () => {
    await expect(
      registerV2Handle({
        handle: "testbadbps",
        ownerWallet: "0x1111111111111111111111111111111111111111",
        elections: [
          { symbol: "SPCX", tokenAddress: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa", basisPoints: 5000 },
        ],
      })
    ).rejects.toThrow("must sum to exactly 10000");
  });

  it("rejects handle registration with invalid EVM owner wallet", async () => {
    await expect(
      registerV2Handle({
        handle: "testbadwallet",
        ownerWallet: "not-an-evm-address",
      })
    ).rejects.toThrow("Invalid Robinhood EVM owner wallet");
  });

  it("resolves tag details from demo fallback when DB is unpopulated", async () => {
    const details = await getV2HandleDetails("ninjastorm");
    expect(details).not.toBeNull();
    expect(details?.handle).toBe("ninjastorm");
    expect(isValidEvmAddress(details?.ownerWallet)).toBe(true);
    expect(details?.elections.length).toBeGreaterThan(0);
    expect(details?.totalBasisPoints).toBe(10000);
  });
});

describe("Robinhood Chain V2 - REST API Endpoints", () => {
  it("GET /api/v2/assets returns network metadata and verified tokens", async () => {
    const res = await request.get("/api/v2/assets");
    expect(res.status).toBe(200);
    expect(res.body.network.chainId).toBe(ROBINHOOD_CHAIN_ID);
    expect(res.body.network.name).toBe("Robinhood Chain");
    expect(res.body.tokens.length).toBeGreaterThan(0);
    expect(res.body.featuredAssets.length).toBeGreaterThan(0);
  });

  it("GET /api/v2/assets/:symbolOrAddress resolves specific asset", async () => {
    const res = await request.get("/api/v2/assets/SPCX");
    expect(res.status).toBe(200);
    expect(res.body.token.symbol).toBe("SPCX");
    expect(res.body.networkId).toBe(ROBINHOOD_CHAIN_ID);
  });

  it("POST /api/v2/settle/quote returns single swap quote", async () => {
    const res = await request.post("/api/v2/settle/quote").send({
      fromSymbolOrAddress: "USDG",
      toSymbolOrAddress: "USDG",
      amountIn: 50,
    });
    expect(res.status).toBe(200);
    expect(res.body.amountInFormatted).toBe("50");
    expect(res.body.rate).toBe("1.0");
  });

  it("POST /api/v2/settle/election-quote returns portfolio quote for tag", async () => {
    const res = await request.post("/api/v2/settle/election-quote").send({
      recipientHandle: "ninjastorm",
      fromSymbolOrAddress: "USDG",
      amountIn: 100,
    });
    expect(res.status).toBe(200);
    expect(res.body.recipientHandle).toBe("ninjastorm");
    expect(res.body.legs.length).toBe(3);
  });

  it("POST /api/v2/invoices creates a Robinhood Chain invoice", async () => {
    const res = await request.post("/api/v2/invoices").send({
      recipientHandle: "ninjastorm",
      targetAmount: 75,
      targetTokenSymbol: "USDG",
      memo: "API dev payment",
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.invoice.id).toContain("rh_inv_");
    expect(res.body.invoice.networkId).toBe(4663);
    expect(res.body.invoice.targetAmount).toBe(75);
  });
});

describe("Robinhood Chain V2 - 𝕏 Bot Integration", () => {
  it("parses Robinhood payment command 'pay @ninjastorm 50 USDG'", () => {
    const parsed = parseFastCommand("@TenderRWABot pay @ninjastorm 50 USDG");
    expect(parsed).not.toBeNull();
    expect(parsed?.action).toBe("send");
    expect(parsed?.target).toBe("@ninjastorm");
    expect(parsed?.amount).toBe(50);
    expect(parsed?.token).toBe("USDG");
  });

  it("parses Robinhood EVM NFT command 'send nft 0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa to @ninjastorm'", () => {
    const parsed = parseFastCommand("@TenderRWABot send nft 0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa to @ninjastorm");
    expect(parsed).not.toBeNull();
    expect(parsed?.action).toBe("send_nft");
    expect(parsed?.target).toBe("@ninjastorm");
    expect(parsed?.memo).toBe("0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa");
  });

  it("routes bot payment intent into Robinhood Chain (4663) settlement confirmation", async () => {
    const routing = await routeBotIntent({
      intent: {
        action: "send",
        target: "@ninjastorm",
        amount: 50,
        token: "USDG",
        memo: null,
        confidence: 1.0,
      },
      tweetId: "tweet_rh_test_123",
      authorHandle: "alex_payer",
    });

    expect(routing.isRegistered).toBe(true);
    expect(routing.recipientHandle).toBe("ninjastorm");
    expect(isValidEvmAddress(routing.recipientWallet)).toBe(true);
    expect(routing.replyText).toContain("Robinhood Chain (4663)");
    expect(routing.portfolioSummary).toBeDefined();
    expect(routing.portfolioSummary!.length).toBeGreaterThan(0);
  });
});

describe("Robinhood Chain V2 - NFT Rail", () => {
  it("GET /api/v2/nft/resolve-target/:target resolves registered handle", async () => {
    const res = await request.get("/api/v2/nft/resolve-target/ninjastorm");
    expect(res.status).toBe(200);
    expect(res.body.resolved).toBe(true);
    expect(res.body.isHandle).toBe(true);
    expect(res.body.handle).toBe("@ninjastorm");
    expect(isValidEvmAddress(res.body.walletAddress)).toBe(true);
    expect(res.body.networkId).toBe(ROBINHOOD_CHAIN_ID);
  });

  it("GET /api/v2/nft/resolve-target/:target resolves raw EVM address", async () => {
    const rawWallet = "0x2222222222222222222222222222222222222222";
    const res = await request.get(`/api/v2/nft/resolve-target/${rawWallet}`);
    expect(res.status).toBe(200);
    expect(res.body.resolved).toBe(true);
    expect(res.body.isHandle).toBe(false);
    expect(res.body.walletAddress.toLowerCase()).toBe(rawWallet.toLowerCase());
    expect(res.body.networkId).toBe(ROBINHOOD_CHAIN_ID);
  });

  it("GET /api/v2/nft/resolve-target/:target returns 404 for unknown handle", async () => {
    const res = await request.get("/api/v2/nft/resolve-target/unknown_ghost_rh_user_9999");
    expect(res.status).toBe(404);
    expect(res.body.resolved).toBe(false);
    expect(res.body.error).toContain("is not registered");
  });

  it("POST /api/v2/nft/transfer-plan validates required parameters", async () => {
    const invalidWalletRes = await request.post("/api/v2/nft/transfer-plan").send({
      fromWallet: "invalid-wallet",
      target: "@ninjastorm",
      contractAddress: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
      tokenId: 1,
    });
    expect(invalidWalletRes.status).toBe(400);

    const invalidContractRes = await request.post("/api/v2/nft/transfer-plan").send({
      fromWallet: "0x1111111111111111111111111111111111111111",
      target: "@ninjastorm",
      contractAddress: "invalid-contract",
      tokenId: 1,
    });
    expect(invalidContractRes.status).toBe(400);

    const missingTokenIdRes = await request.post("/api/v2/nft/transfer-plan").send({
      fromWallet: "0x1111111111111111111111111111111111111111",
      target: "@ninjastorm",
      contractAddress: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
    });
    expect(missingTokenIdRes.status).toBe(400);
  });

  it("POST /api/v2/nft/transfer-plan generates valid safeTransferFrom calldata for tag target", async () => {
    const sender = "0x9999999999999999999999999999999999999999";
    const nftContract = "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa";
    const res = await request.post("/api/v2/nft/transfer-plan").send({
      fromWallet: sender,
      target: "@ninjastorm",
      contractAddress: nftContract,
      tokenId: 101,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.networkId).toBe(ROBINHOOD_CHAIN_ID);
    expect(res.body.sender.walletAddress.toLowerCase()).toBe(sender.toLowerCase());
    expect(res.body.recipient.handle).toBe("@ninjastorm");
    expect(isValidEvmAddress(res.body.recipient.walletAddress)).toBe(true);

    // Transaction verification
    expect(res.body.transaction.to.toLowerCase()).toBe(nftContract.toLowerCase());
    expect(res.body.transaction.chainId).toBe(ROBINHOOD_CHAIN_ID);
    expect(res.body.transaction.value).toBe("0");
    // safeTransferFrom(address,address,uint256) selector is 0x42842e0e
    expect(res.body.transaction.data.startsWith("0x42842e0e")).toBe(true);
  });

  it("POST /api/v2/nft/transfer-plan generates valid safeTransferFrom calldata for raw EVM wallet target", async () => {
    const sender = "0x1111111111111111111111111111111111111111";
    const recipient = "0x3333333333333333333333333333333333333333";
    const nftContract = "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa";
    const res = await request.post("/api/v2/nft/transfer-plan").send({
      fromWallet: sender,
      target: recipient,
      contractAddress: nftContract,
      tokenId: 404,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recipient.handle).toBeNull();
    expect(res.body.recipient.walletAddress.toLowerCase()).toBe(recipient.toLowerCase());
    expect(res.body.transaction.data.startsWith("0x42842e0e")).toBe(true);
  });
});

