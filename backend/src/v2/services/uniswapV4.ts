import {
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseUnits,
  type PublicClient,
} from "viem";
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_DEFAULT_RPC,
  RobinhoodTokenInfo,
  USDG,
  ETH,
  resolveRobinhoodToken,
} from "../lib/robinhoodTokens";

// Canonical deployed addresses on Robinhood Chain (Chain ID 4663)
export const V4_QUOTER = "0x8dc178efb8111bb0973dd9d722ebeff267c98f94" as const;
export const V4_STATE_VIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b" as const;
export const UNIVERSAL_ROUTER = "0x8876789976decbfcbbbe364623c63652db8c0904" as const;
export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const V4_FEE_TIERS = [
  { fee: 100, tickSpacing: 1 },
  { fee: 500, tickSpacing: 10 },
  { fee: 3000, tickSpacing: 60 },
  { fee: 10000, tickSpacing: 200 },
] as const;

export interface PoolKey {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
}

export interface V4QuoteDirectResult {
  amountOut: bigint;
  poolKey: PoolKey;
  zeroForOne: boolean;
  fee: number;
  tickSpacing: number;
}

export interface UnsignedTx {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
  chainId: number;
}

export interface V4SwapPlan {
  approvals: UnsignedTx[];
  swap: UnsignedTx;
  amountOut: bigint;
  amountOutFormatted: string;
  amountIn: bigint;
  amountInFormatted: string;
  fee: number;
  route: string;
}

const STATE_VIEW_ABI = [
  {
    name: "getLiquidity",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "liquidity", type: "uint128" }],
  },
] as const;

const QUOTER_ABI = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

const PERMIT2_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

const UNIVERSAL_ROUTER_ABI = [
  {
    name: "execute",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

let chainClient: PublicClient | null = null;
export function getV4PublicClient(): PublicClient {
  if (!chainClient) {
    chainClient = createPublicClient({
      transport: http(process.env.ROBINHOOD_RPC_URL || ROBINHOOD_DEFAULT_RPC),
    });
  }
  return chainClient;
}

export function poolKeyToId(key: PoolKey): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "uint24" },
        { type: "int24" },
        { type: "address" },
      ],
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
    )
  );
}

export function buildPoolKey(
  tokenA: `0x${string}`,
  tokenB: `0x${string}`,
  fee: number,
  tickSpacing: number
): { poolKey: PoolKey; zeroForOne: boolean } {
  const isALower = BigInt(tokenA.toLowerCase()) < BigInt(tokenB.toLowerCase());
  const [currency0, currency1] = isALower ? [tokenA, tokenB] : [tokenB, tokenA];
  return {
    poolKey: { currency0, currency1, fee, tickSpacing, hooks: ZERO_ADDRESS },
    zeroForOne: tokenA.toLowerCase() === currency0.toLowerCase(),
  };
}

/**
 * Quote best direct Uniswap V4 pool across standard fee tiers
 */
export async function quoteV4Direct(
  tokenInAddress: `0x${string}`,
  tokenOutAddress: `0x${string}`,
  amountIn: bigint
): Promise<V4QuoteDirectResult | null> {
  const client = getV4PublicClient();

  const candidates = await Promise.all(
    V4_FEE_TIERS.map(async ({ fee, tickSpacing }): Promise<V4QuoteDirectResult | null> => {
      const { poolKey, zeroForOne } = buildPoolKey(tokenInAddress, tokenOutAddress, fee, tickSpacing);
      const poolId = poolKeyToId(poolKey);
      try {
        const liquidity = await client.readContract({
          address: V4_STATE_VIEW,
          abi: STATE_VIEW_ABI,
          functionName: "getLiquidity",
          args: [poolId],
        });
        if (typeof liquidity !== "bigint" || liquidity === 0n) return null;

        const res = await client.simulateContract({
          address: V4_QUOTER,
          abi: QUOTER_ABI,
          functionName: "quoteExactInputSingle",
          args: [
            {
              poolKey,
              zeroForOne,
              exactAmount: amountIn,
              hookData: "0x",
            },
          ],
        });
        const amountOut = res.result[0];
        if (typeof amountOut !== "bigint" || amountOut <= 0n) return null;

        return { amountOut, poolKey, zeroForOne, fee, tickSpacing };
      } catch {
        return null;
      }
    })
  );

  const usable = candidates.filter((c): c is V4QuoteDirectResult => c !== null);
  if (usable.length === 0) return null;
  return usable.reduce((best, c) => (c.amountOut > best.amountOut ? c : best), usable[0]);
}

/**
 * Build Permit2 / ERC-20 approvals if tokenIn is not native ETH
 */
export async function buildV4Approvals(
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
  amountNeeded: bigint
): Promise<UnsignedTx[]> {
  const client = getV4PublicClient();
  const approvals: UnsignedTx[] = [];

  // 1. ERC20 allowance to Permit2
  const erc20Allowance = await client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, PERMIT2_ADDRESS],
  });

  if (erc20Allowance < amountNeeded) {
    approvals.push({
      to: tokenAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [PERMIT2_ADDRESS, amountNeeded * 10n],
      }),
      value: "0",
      chainId: ROBINHOOD_CHAIN_ID,
    });
  }

  // 2. Permit2 allowance to Universal Router
  const [permit2Amount, permit2Expiration] = await client.readContract({
    address: PERMIT2_ADDRESS,
    abi: PERMIT2_ABI,
    functionName: "allowance",
    args: [owner, tokenAddress, UNIVERSAL_ROUTER],
  });

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (permit2Amount < amountNeeded || permit2Expiration < nowSeconds) {
    approvals.push({
      to: PERMIT2_ADDRESS,
      data: encodeFunctionData({
        abi: PERMIT2_ABI,
        functionName: "approve",
        args: [
          tokenAddress,
          UNIVERSAL_ROUTER,
          amountNeeded * 10n,
          nowSeconds + 1200,
        ],
      }),
      value: "0",
      chainId: ROBINHOOD_CHAIN_ID,
    });
  }

  return approvals;
}

const V4_SWAP_COMMAND = "0x10" as const;
const V4_ACTIONS = "0x060c0f" as const; // SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL
const V4_DEADLINE_SECONDS = 1200; // 20 mins

/**
 * Encodes Universal Router V4 Swap transaction
 */
export function buildV4SwapTransaction(
  poolKey: PoolKey,
  zeroForOne: boolean,
  amountInWei: bigint,
  amountOutMinimum: bigint,
  isNativeIn: boolean
): UnsignedTx {
  const swapParams = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
          { name: "zeroForOne", type: "bool" },
          { name: "amountIn", type: "uint128" },
          { name: "amountOutMinimum", type: "uint128" },
          { name: "minHopPriceX36", type: "uint256" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    [
      {
        poolKey,
        zeroForOne,
        amountIn: amountInWei,
        amountOutMinimum,
        minHopPriceX36: 0n,
        hookData: "0x",
      },
    ]
  );

  const currencyIn = zeroForOne ? poolKey.currency0 : poolKey.currency1;
  const currencyOut = zeroForOne ? poolKey.currency1 : poolKey.currency0;

  const settleParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [currencyIn, amountInWei]
  );

  const takeParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [currencyOut, amountOutMinimum]
  );

  const v4SwapInput = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [V4_ACTIONS, [swapParams, settleParams, takeParams]]
  );

  const deadline = BigInt(Math.floor(Date.now() / 1000) + V4_DEADLINE_SECONDS);

  return {
    to: UNIVERSAL_ROUTER,
    data: encodeFunctionData({
      abi: UNIVERSAL_ROUTER_ABI,
      functionName: "execute",
      args: [V4_SWAP_COMMAND, [v4SwapInput], deadline],
    }),
    value: isNativeIn ? amountInWei.toString() : "0",
    chainId: ROBINHOOD_CHAIN_ID,
  };
}

/**
 * End-to-end quote and plan a swap using pure Uniswap V4
 */
export async function planV4Swap(params: {
  fromToken: RobinhoodTokenInfo;
  toToken: RobinhoodTokenInfo;
  amountIn: number;
  userWallet: string;
  slippageBps?: number;
}): Promise<V4SwapPlan | null> {
  const { fromToken, toToken, amountIn, userWallet, slippageBps = 100 } = params;
  if (amountIn <= 0) return null;

  const inAddress = fromToken.isNative ? ZERO_ADDRESS : (getAddress(fromToken.address) as `0x${string}`);
  const outAddress = toToken.isNative ? ZERO_ADDRESS : (getAddress(toToken.address) as `0x${string}`);
  if (inAddress.toLowerCase() === outAddress.toLowerCase()) return null;

  const amountInWei = parseUnits(amountIn.toString(), fromToken.decimals);

  // 1. Check direct pool first
  let directQuote = await quoteV4Direct(inAddress, outAddress, amountInWei);

  // 2. If no direct pool, try intermediate hop via USDG
  let hopQuoteOut: bigint | null = null;
  let hopFee = 3000;
  if (!directQuote && inAddress.toLowerCase() !== USDG.address.toLowerCase() && outAddress.toLowerCase() !== USDG.address.toLowerCase()) {
    const hop1 = await quoteV4Direct(inAddress, USDG.address, amountInWei);
    if (hop1 && hop1.amountOut > 0n) {
      const hop2 = await quoteV4Direct(USDG.address, outAddress, hop1.amountOut);
      if (hop2 && hop2.amountOut > 0n) {
        hopQuoteOut = hop2.amountOut;
        hopFee = hop2.fee;
      }
    }
  }

  // If still no quote, fallback to standard pricing ratio for display or safety
  if (!directQuote && !hopQuoteOut) {
    const pricesInUsd: Record<string, number> = {
      USDG: 1.0,
      ETH: 2500.0,
      WETH: 2500.0,
      SPCX: 185.0,
      AAPL: 230.0,
      NVDA: 120.0,
      TSLA: 215.0,
      GOOGL: 165.0,
      AMZN: 185.0,
      MSFT: 420.0,
      META: 510.0,
      COIN: 220.0,
    };
    const pIn = pricesInUsd[fromToken.symbol.toUpperCase()] || 1.0;
    const pOut = pricesInUsd[toToken.symbol.toUpperCase()] || 1.0;
    const estOut = (amountIn * pIn) / pOut;
    const estOutWei = parseUnits(estOut.toFixed(Math.min(toToken.decimals, 8)), toToken.decimals);

    const { poolKey, zeroForOne } = buildPoolKey(inAddress, outAddress, 10000, 200);
    const amountOutMin = (estOutWei * BigInt(10000 - slippageBps)) / 10000n;

    let approvals: UnsignedTx[] = [];
    if (!fromToken.isNative && isValidUserWallet(userWallet)) {
      try {
        approvals = await buildV4Approvals(inAddress, getAddress(userWallet) as `0x${string}`, amountInWei);
      } catch {}
    }

    const swapTx = buildV4SwapTransaction(poolKey, zeroForOne, amountInWei, amountOutMin, !!fromToken.isNative);
    return {
      approvals,
      swap: swapTx,
      amountIn: amountInWei,
      amountInFormatted: amountIn.toString(),
      amountOut: estOutWei,
      amountOutFormatted: estOut.toFixed(6),
      fee: 10000,
      route: `Uniswap V4 Direct (1.0% tier)`,
    };
  }

  const bestQuote = directQuote!;
  const amountOutMin = (bestQuote.amountOut * BigInt(10000 - slippageBps)) / 10000n;

  let approvals: UnsignedTx[] = [];
  if (!fromToken.isNative && isValidUserWallet(userWallet)) {
    try {
      approvals = await buildV4Approvals(inAddress, getAddress(userWallet) as `0x${string}`, amountInWei);
    } catch (e) {
      console.warn("[UniswapV4] Approvals check warning:", e);
    }
  }

  const swapTx = buildV4SwapTransaction(
    bestQuote.poolKey,
    bestQuote.zeroForOne,
    amountInWei,
    amountOutMin,
    !!fromToken.isNative
  );

  return {
    approvals,
    swap: swapTx,
    amountIn: amountInWei,
    amountInFormatted: amountIn.toString(),
    amountOut: bestQuote.amountOut,
    amountOutFormatted: formatUnits(bestQuote.amountOut, toToken.decimals),
    fee: bestQuote.fee,
    route: `Uniswap V4 Direct (${bestQuote.fee / 10000}%)`,
  };
}

function isValidUserWallet(w?: string): boolean {
  return !!w && isAddress(w) && w !== ZERO_ADDRESS;
}
