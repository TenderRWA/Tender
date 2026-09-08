# TENDER V2 — Robinhood Chain Frontend Integration Specification

> **Rail Split Architecture**:
> * **V1 (Solana Rail)**: Jupiter V6 + Relay, `@solana/wallet-standard`, SPL Token / xStocks (`/api/v1/...`).
> * **V2 (Robinhood Chain Rail)**: Uniswap V4, Wagmi / Viem, ERC-20 tokenized equities (`/api/v2/...`).

---

## 1. Network & Environment Parameters

| Parameter | Value | Notes |
| :--- | :--- | :--- |
| **Network Name** | **Robinhood Chain** | Arbitrum Orbit / Nitro L2 Rollup |
| **Chain ID** | **`4663`** (`0x1237`) | Canonical Mainnet ID |
| **Native Gas Currency** | **`ETH`** (18 Decimals) | Used for gas fees |
| **Primary Stablecoin** | **`USDG`** (6 Decimals) | Global Dollar Network |
| **Primary RPC URLs** | `https://rpc.mainnet.chain.robinhood.com`<br>`https://robinhood-rpc.publicnode.com` | Verified live with CORS open |
| **Block Explorer** | `https://robinhoodchain.blockscout.com` | Blockscout explorer instance |
| **Backend API Host** | `http://localhost:3000` (Local) / Production Backend URL | All V2 routes prefixed with `/api/v2` |

---

## 2. Verified Token Registry (Chain ID: 4663)

All token contracts trade on Robinhood Chain natively through **Uniswap V4 pools**:

| Symbol | Name / Issuer | Contract Address | Decimals | Asset Type |
| :--- | :--- | :--- | :--- | :--- |
| **`USDG`** | Global Dollar (Base Stablecoin) | `0x5fc5360d0400a0fd4f2af552add042d716f1d168` | 6 | `stablecoin` |
| **`ETH`** | Ether (Native Gas) | `0x0000000000000000000000000000000000000000` | 18 | `native` |
| **`WETH`** | Wrapped Ether | `0x0bd7d308f8e1639fab988df18a8011f41eacad73` | 18 | `native` |
| **`SPCX`** | SpaceX (Space Exploration Technologies) | `0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa` | 18 | `equity` |
| **`AAPL`** | Apple Inc. Token | `0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9` | 18 | `equity` |
| **`TSLA`** | Tesla Inc. Token | `0x322F0929c4625eD5bAd873c95208D54E1c003b2d` | 18 | `equity` |
| **`NVDA`** | NVIDIA Corp. Token | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` | 18 | `equity` |
| **`GOOGL`** | Alphabet Inc. Token | `0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3` | 18 | `equity` |
| **`AMZN`** | Amazon.com Inc. Token | `0x12f190a9F9d7D37a250758b26824B97CE941bF54` | 18 | `equity` |
| **`MSFT`** | Microsoft Corp. Token | `0xe93237C50D904957Cf27E7B1133b510C669c2e74` | 18 | `equity` |
| **`META`** | Meta Platforms Inc. Token | `0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35` | 18 | `equity` |
| **`COIN`** | Coinbase Global Inc. Token | `0x6330D8C3178a418788dF01a47479c0ce7CCF450b` | 18 | `equity` |
| **`PLTR`** | Palantir Technologies Inc. Token | `0xd58319690185984605929F52745330e7ea20D0C4` | 18 | `equity` |

> [!NOTE]
> Aliases supported automatically by the backend: `SPACEX` $\rightarrow$ `SPCX`, `USDC` $\rightarrow$ `USDG`, `AAPLR` $\rightarrow$ `AAPL`, `NVDAR` $\rightarrow$ `NVDA`, `TSLAR` $\rightarrow$ `TSLA`.

---

## 3. Frontend Wagmi & Viem Setup

### Chain Definition (`src/lib/robinhoodChain.ts`)

```typescript
import { defineChain } from "viem";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.mainnet.chain.robinhood.com",
        "https://robinhood-rpc.publicnode.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Explorer",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});
```

---

## 4. REST API Endpoints Reference (`/api/v2/...`)

### 4.1. Token Catalog

#### `GET /api/v2/assets`
Lists all verified Robinhood Chain tokens, base currencies, and featured tokenized equities.

* **Query Parameters**:
  * `featured=true`: Returns base currencies (`ETH`, `USDG`) and featured equities only.
  * `q=<query>`: Filters tokens by symbol, name, or address.
* **Response `200 OK`**:
```json
{
  "network": {
    "chainId": 4663,
    "name": "Robinhood Chain",
    "nativeCurrency": "ETH",
    "blockExplorer": "https://robinhoodchain.blockscout.com"
  },
  "baseCurrencies": [ ... ],
  "featuredAssets": [ ... ],
  "tokens": [ ... ],
  "count": 13
}
```

#### `GET /api/v2/assets/:symbolOrAddress`
Resolves a specific token by symbol (`SPCX`, `USDG`, `ETH`) or 42-char contract address.

---

### 4.2. Tag Registry & Portfolio Elections

#### `POST /api/v2/handles/register`
Registers a unique tag on Robinhood Chain tied to an EVM wallet address (`0x...`).

* **Request Body**:
```json
{
  "handle": "ninjastorm",
  "ownerWallet": "0x1111111111111111111111111111111111111111",
  "xHandle": "ninjastorm",
  "elections": [
    {
      "symbol": "SPCX",
      "tokenAddress": "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
      "basisPoints": 6000
    },
    {
      "symbol": "USDG",
      "tokenAddress": "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
      "basisPoints": 3000
    },
    {
      "symbol": "NVDA",
      "tokenAddress": "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
      "basisPoints": 1000
    }
  ]
}
```
* **Validation**:
  * `ownerWallet` must be a valid 42-character EVM address.
  * Total `basisPoints` must sum to exactly `10000` (100%).

#### `GET /api/v2/handles/:handle`
Retrieves Robinhood tag details, EVM owner wallet, and active portfolio elections.

#### `PUT /api/v2/handles/:handle/elections`
Updates receive-side portfolio allocations for an existing Robinhood tag.

* **Request Body**:
```json
{
  "ownerWallet": "0x1111111111111111111111111111111111111111",
  "elections": [
    {
      "symbol": "SPCX",
      "tokenAddress": "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
      "basisPoints": 5000
    },
    {
      "symbol": "USDG",
      "tokenAddress": "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
      "basisPoints": 5000
    }
  ]
}
```

---

### 4.3. Settlement & Quoting Engine

#### `POST /api/v2/settle/quote`
Generates a single token-to-token swap quote on Robinhood Chain with pre-built EVM transaction steps.

* **Request Body**:
```json
{
  "fromSymbolOrAddress": "USDG",
  "toSymbolOrAddress": "SPCX",
  "amountIn": 100,
  "userWallet": "0x1111111111111111111111111111111111111111",
  "recipientWallet": "0x2222222222222222222222222222222222222222",
  "slippageBps": 50
}
```
* **Response `200 OK`**:
```json
{
  "fromToken": { "symbol": "USDG", "decimals": 6, ... },
  "toToken": { "symbol": "SPCX", "decimals": 18, ... },
  "amountIn": "100000000",
  "amountInFormatted": "100",
  "amountOut": "540540540540540540",
  "amountOutFormatted": "0.540541",
  "rate": "0.005405",
  "priceImpactPct": 0.12,
  "executionVenue": "uniswap_v4",
  "steps": [
    {
      "id": "uniswap_v4_swap",
      "action": "Swap USDG for SPCX",
      "description": "Execute swap via Uniswap V4 pools on Robinhood Chain",
      "kind": "transaction",
      "items": [
        {
          "status": "not_started",
          "data": {
            "to": "0x2222222222222222222222222222222222222222",
            "data": "0x",
            "value": "0",
            "chainId": 4663
          }
        }
      ]
    }
  ]
}
```

#### `POST /api/v2/settle/election-quote`
Calculates multi-leg portfolio allocations for an inbound payment destined for a Robinhood tag.

* **Request Body**:
```json
{
  "recipientHandle": "ninjastorm",
  "fromSymbolOrAddress": "USDG",
  "amountIn": 100,
  "userWallet": "0x1111111111111111111111111111111111111111"
}
```
* **Response**: Returns broken-down quote legs according to `@ninjastorm`'s elected portfolio weights (`60% SPCX`, `30% USDG`, `10% NVDA`).

#### `POST /api/v2/settle/confirm`
Records confirmed settlement transaction hash on Robinhood Chain into the database.

---

### 4.4. Invoices on Robinhood Chain

#### `POST /api/v2/invoices`
* **Request Body**:
```json
{
  "recipientHandle": "ninjastorm",
  "targetAmount": 100,
  "targetTokenSymbol": "USDG",
  "memo": "Design sprint 1"
}
```
* **Response `201 Created`**: Returns `invoice` object with `networkId: 4663` and shareable URL (`/pay/:invoiceId`).

#### `GET /api/v2/invoices/:id`
Retrieves invoice, recipient Robinhood wallet, and target portfolio election breakdown.

#### `POST /api/v2/invoices/:id/confirm`
Marks invoice paid after transaction hash confirms on Robinhood Chain Blockscout.

---

### 4.5. Sovereign NFT Rail (ERC-721)

#### `GET /api/v2/nft/resolve-target/:target`
Resolves an NFT recipient target—either an EVM wallet address (`0x...`) or a Robinhood handle (`@handle` or `handle`).

* **Response `200 OK`**:
```json
{
  "resolved": true,
  "walletAddress": "0x1111111111111111111111111111111111111111",
  "handle": "@ninjastorm",
  "isHandle": true,
  "networkId": 4663
}
```

#### `GET /api/v2/nft/:contractAddress/:tokenId`
Fetches onchain metadata for any ERC-721 NFT deployed on Robinhood Chain.

* **Response `200 OK`**:
```json
{
  "networkId": 4663,
  "contractAddress": "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
  "tokenId": "101",
  "name": "SpaceX Alpha Tier",
  "symbol": "SPCX-NFT",
  "owner": "0x1111111111111111111111111111111111111111",
  "tokenURI": "ipfs://Qm..."
}
```

#### `POST /api/v2/nft/transfer-plan`
Builds a non-custodial, zero-counterparty EVM transaction executing `safeTransferFrom(from, to, tokenId)`.

* **Request Body**:
```json
{
  "fromWallet": "0x9999999999999999999999999999999999999999",
  "target": "@ninjastorm",
  "contractAddress": "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
  "tokenId": 101
}
```
* **Response `200 OK`**:
```json
{
  "success": true,
  "networkId": 4663,
  "token": {
    "contractAddress": "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
    "tokenId": "101",
    "name": "SpaceX Alpha Tier",
    "symbol": "SPCX-NFT"
  },
  "sender": { "walletAddress": "0x9999999999999999999999999999999999999999" },
  "recipient": {
    "walletAddress": "0x1111111111111111111111111111111111111111",
    "handle": "@ninjastorm"
  },
  "transaction": {
    "to": "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
    "data": "0x42842e0e000000000000000000000000...",
    "value": "0",
    "chainId": 4663
  }
}
```
* **Frontend Signing Pattern**:
```typescript
const txHash = await sendTransactionAsync({
  to: plan.transaction.to,
  data: plan.transaction.data,
  value: BigInt(plan.transaction.value || "0"),
  chainId: 4663,
});
```

---

## 5. Client Transaction Execution Pattern

When executing quotes on the frontend:

```typescript
import { useSendTransaction, useWriteContract } from "wagmi";

// 1. Iterate over steps returned by /api/v2/settle/quote:
for (const step of quote.steps) {
  for (const item of step.items) {
    if (step.id === "approve") {
      // Execute ERC20 token approval
      await writeContractAsync({
        address: item.data.to,
        abi: erc20Abi,
        functionName: "approve",
        args: item.data.args,
        chainId: 4663,
      });
    } else {
      // Execute swap or direct transfer
      const txHash = await sendTransactionAsync({
        to: item.data.to,
        data: item.data.data,
        value: BigInt(item.data.value || "0"),
        chainId: 4663,
      });

      // Confirm with backend
      await fetch("/api/v2/settle/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash,
          senderWallet: userWallet,
          recipientHandle: quote.recipientHandle,
          recipientWallet: quote.recipientWallet,
          inputTokenSymbol: quote.fromToken.symbol,
          inputAmount: quote.amountInFormatted,
        }),
      });
    }
  }
}
```

---

## 6. Rail Switcher Strategy (Solana V1 ⟷ Robinhood V2)

1. **State Store**: Maintain an active rail state (`activeRail: "solana" | "robinhood"`).
2. **Persistence**: Store in `localStorage` or sync from user's preferred network.
3. **Wallet Connect**:
   * If `activeRail === "solana"`: invoke Solana Wallet Adapter / Standard (`@solana/wallet-standard`).
   * If `activeRail === "robinhood"`: invoke Wagmi / RainbowKit / Injected EVM provider targeting Chain `4663`.
4. **Data Endpoints**:
   * If `solana`: call `/api/v1/...`
   * If `robinhood`: call `/api/v2/...`
