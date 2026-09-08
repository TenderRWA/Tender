import { isAddress, getAddress, parseUnits, formatUnits } from "viem";

export interface RobinhoodTokenInfo {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  isNative?: boolean;
  isBaseCurrency?: boolean;
  underlyingTicker?: string;
  iconUrl?: string;
  assetType: "native" | "stablecoin" | "equity" | "etf" | "commodity";
}

export const ROBINHOOD_CHAIN_ID = 4663; // Canonical Robinhood Chain Mainnet ID
export const ROBINHOOD_EXPLORER_URL = "https://robinhoodchain.blockscout.com";
export const ROBINHOOD_DEFAULT_RPC = "https://rpc.mainnet.chain.robinhood.com";

export const ETH: RobinhoodTokenInfo = {
  symbol: "ETH",
  name: "Ether",
  address: "0x0000000000000000000000000000000000000000",
  decimals: 18,
  isNative: true,
  isBaseCurrency: true,
  iconUrl: "https://assets.relay.link/icons/1/light.png",
  assetType: "native",
};

export const WETH: RobinhoodTokenInfo = {
  symbol: "WETH",
  name: "Wrapped Ether",
  address: "0x0bd7d308f8e1639fab988df18a8011f41eacad73",
  decimals: 18,
  isBaseCurrency: true,
  iconUrl: "https://coin-images.coingecko.com/coins/images/102174283/large/weth-robinhood.jpeg?1782924507",
  assetType: "native",
};

export const USDG: RobinhoodTokenInfo = {
  symbol: "USDG",
  name: "Global Dollar",
  address: "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
  decimals: 6,
  isBaseCurrency: true,
  iconUrl: "https://assets.coingecko.com/coins/images/51281/standard/GDN_USDG_Token_200x200.png",
  assetType: "stablecoin",
};

export const FEATURED_ROBINHOOD_ASSETS: RobinhoodTokenInfo[] = [
  {
    symbol: "SPCX",
    name: "SpaceX (Space Exploration Technologies Corp.)",
    underlyingTicker: "SPCX",
    address: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
    decimals: 18,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/68497d354d7140b01657a793_Ticker%3DSPCX.svg",
    assetType: "equity",
  },
  {
    symbol: "AAPL",
    name: "Apple Inc. Token",
    underlyingTicker: "AAPL",
    address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
    decimals: 18,
    iconUrl: "https://cryptologos.cc/logos/apple-logo.png",
    assetType: "equity",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc. Token",
    underlyingTicker: "TSLA",
    address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
    decimals: 18,
    iconUrl: "https://cryptologos.cc/logos/tesla-motors-logo.png",
    assetType: "equity",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp. Token",
    underlyingTicker: "NVDA",
    address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
    decimals: 18,
    iconUrl: "https://cryptologos.cc/logos/nvidia-logo.png",
    assetType: "equity",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc. Token",
    underlyingTicker: "GOOGL",
    address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3",
    decimals: 18,
    iconUrl: "https://cryptologos.cc/logos/google-logo.png",
    assetType: "equity",
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc. Token",
    underlyingTicker: "AMZN",
    address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54",
    decimals: 18,
    iconUrl: "https://cryptologos.cc/logos/amazon-logo.png",
    assetType: "equity",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp. Token",
    underlyingTicker: "MSFT",
    address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74",
    decimals: 18,
    iconUrl: "https://cryptologos.cc/logos/microsoft-logo.png",
    assetType: "equity",
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc. Token",
    underlyingTicker: "META",
    address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35",
    decimals: 18,
    iconUrl: "https://cryptologos.cc/logos/meta-logo.png",
    assetType: "equity",
  },
  {
    symbol: "COIN",
    name: "Coinbase Global Inc. Token",
    underlyingTicker: "COIN",
    address: "0x6330D8C3178a418788dF01a47479c0ce7CCF450b",
    decimals: 18,
    iconUrl: "https://cryptologos.cc/logos/coinbase-logo.png",
    assetType: "equity",
  },
  {
    symbol: "PLTR",
    name: "Palantir Technologies Inc. Token",
    underlyingTicker: "PLTR",
    address: "0xd58319690185984605929F52745330e7ea20D0C4",
    decimals: 18,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/68497d354d7140b01657a793_Ticker%3DPLTR.svg",
    assetType: "equity",
  },
];

export const ALL_ROBINHOOD_TOKENS: RobinhoodTokenInfo[] = [
  ETH,
  WETH,
  USDG,
  ...FEATURED_ROBINHOOD_ASSETS,
];

export const ALL_ROBINHOOD_ASSETS = ALL_ROBINHOOD_TOKENS;

export const ALIASES: Record<string, string> = {
  SPACEX: "SPCX",
  AAPLR: "AAPL",
  TSLAR: "TSLA",
  NVDAR: "NVDA",
  GOOGLR: "GOOGL",
  AMZNR: "AMZN",
  MSFTR: "MSFT",
  METAR: "META",
  COINR: "COIN",
  USDC: "USDG",
};

export function getAllRobinhoodTokens(): RobinhoodTokenInfo[] {
  return ALL_ROBINHOOD_TOKENS;
}

export function isValidEvmAddress(address: string | undefined | null): boolean {
  if (!address || typeof address !== "string") return false;
  return isAddress(address.trim());
}

export function resolveRobinhoodToken(query: string | undefined | null): RobinhoodTokenInfo | undefined {
  if (!query || typeof query !== "string") return undefined;
  const clean = query.trim();

  // 1. Exact address match (case-insensitive)
  if (isAddress(clean)) {
    const checksummed = getAddress(clean);
    return ALL_ROBINHOOD_TOKENS.find(
      (t) => t.address.toLowerCase() === checksummed.toLowerCase()
    );
  }

  // 2. Check alias map first
  const upperRaw = clean.toUpperCase();
  const aliased = ALIASES[upperRaw] || upperRaw;

  // 3. Exact symbol or underlying ticker match (case-insensitive)
  const direct = ALL_ROBINHOOD_TOKENS.find(
    (t) =>
      t.symbol.toUpperCase() === aliased ||
      (t.underlyingTicker && t.underlyingTicker.toUpperCase() === aliased)
  );
  if (direct) return direct;

  // 4. Name or substring match
  const lower = clean.toLowerCase();
  return ALL_ROBINHOOD_TOKENS.find(
    (t) => t.name.toLowerCase().includes(lower) || t.symbol.toLowerCase() === lower
  );
}

export const resolveV2Token = resolveRobinhoodToken;

export function parseTokenUnits(amount: number | string, decimals: number): string {
  const str = typeof amount === "number" ? amount.toString() : amount;
  return parseUnits(str, decimals).toString();
}

export function formatTokenUnits(atomicUnits: string | bigint, decimals: number): string {
  const bn = typeof atomicUnits === "string" ? BigInt(atomicUnits) : atomicUnits;
  return formatUnits(bn, decimals);
}
