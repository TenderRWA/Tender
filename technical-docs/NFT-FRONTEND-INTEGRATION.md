# TENDER Frontend Integration Guide: Sovereign NFT Transfers to Tags

> **Document Version**: 1.0.0  
> **Status**: Ready for Frontend Integration  
> **Backend Release**: `v0.1.0-nft`  
> **Target Audience**: Frontend Engineering Team

---

## 1. Executive Summary & Architecture

TENDER tags (`@handle`) now act as **sovereign human-readable identity pointers for non-fungible digital collectibles (NFTs)** in addition to fungible working capital.

### Core Architecture Rules:
1. **Zero Portfolio Slicing**: Unlike SOL or USDC payments that slice atomically across recipient stock elections via Jupiter/Relay, **NFTs bypass `handle_elections` completely**.
2. **Zero Asset Selling**: The NFT is **never** liquidated, swapped, or routed through DEX order books. It is transferred 1:1, non-custodially, directly into the recipient tag owner's wallet address.
3. **Idempotent Token Accounts**: The backend automatically prepends instructions to initialize the recipient's Associated Token Account (ATA) if they do not yet have one, ensuring 100% reliable delivery on Solana Mainnet.
4. **Dual Entrypoints**:
   - **𝕏 (Twitter) Bot**: Senders tweet `@TenderRWABot send nft <mint> to @tag`. The transfer is staged into the user's `/dashboard/pending` queue.
   - **DApp Payments**: Users can open the DApp, type `@tag` (e.g. `@ninjastorm` or their own handle), enter/select an NFT mint, and sign directly.

---

## 2. Backend API Reference

Base API URL:  
- Production: `https://api.tenderrwa.com`  
- Local: `http://localhost:3001`

### 2.1 Build Direct NFT Transfer Plan
**`POST /api/v1/nft/transfer-plan`**

Builds a fully compiled, signable Solana VersionedTransaction (V0) transferring 1 unit (0 decimals) of the target NFT directly from the sender's wallet to the recipient tag's wallet.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "userWallet": "8NF7qtX5DQvyhokuBbhD65MXSWgv6q7JFjd4dfb9rZKA",
  "recipientTag": "@ninjastorm",
  "nftMint": "7sm142JgXr3u5e2HXMfimidVPjZWwZNQr4oTBckQELJr"
}
```
*(Note: You can pass either `recipientTag` OR `recipientWallet`)*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "base64Transaction": "AQAAAAAAAAAAAAAAAA...",
  "recipientWallet": "FuSZ9qKm5kUPdmsypSyMRXfTiY4dFrWyvWcmh2URwQWt",
  "recipientHandle": "ninjastorm",
  "nft": {
    "mint": "7sm142JgXr3u5e2HXMfimidVPjZWwZNQr4oTBckQELJr",
    "name": "Mad Lads #420",
    "symbol": "MAD",
    "image": "https://arweave.net/...",
    "uri": "https://arweave.net/..."
  },
  "message": "Direct NFT transfer to @ninjastorm prepared"
}
```

---

### 2.2 Get NFT Metadata
**`GET /api/v1/nft/:mint`**

Fetches on-chain Metaplex metadata, resolving name, symbol, and image URI with caching and timeouts.

#### Success Response (`200 OK`)
```json
{
  "nft": {
    "mint": "7sm142JgXr3u5e2HXMfimidVPjZWwZNQr4oTBckQELJr",
    "name": "Mad Lads #420",
    "symbol": "MAD",
    "image": "https://arweave.net/..."
  }
}
```

---

### 2.3 Discover Wallet NFTs
**`GET /api/v1/nft/wallet/:wallet`**

Scans the connected wallet's token accounts for digital collectibles (`amount: 1`, `decimals: 0`). Use this to populate an interactive NFT picker dropdown so users don't have to copy-paste mints.

#### Success Response (`200 OK`)
```json
{
  "nfts": [
    {
      "mint": "7sm142JgXr3u5e2HXMfimidVPjZWwZNQr4oTBckQELJr",
      "name": "Mad Lads #420",
      "symbol": "MAD",
      "image": "https://arweave.net/..."
    }
  ],
  "count": 1
}
```

---

### 2.4 Query Pending Bot Queue
**`GET /api/v1/bot/pending?handle=<clean_handle>&status=pending`**

NFT settlements are returned alongside fungible payment requests. They are distinguishable by `assetType: "nft"` and `inputToken: "NFT"`.

#### Item Shape
```json
{
  "id": "4",
  "sourceRef": "2095515974619263159",
  "authorXHandle": "nothipposol",
  "recipientHandle": "ninjastorm",
  "recipientWallet": "FuSZ9qKm5kUPdmsypSyMRXfTiY4dFrWyvWcmh2URwQWt",
  "inputToken": "NFT",
  "inputAmount": "1.000000000000000000",
  "tokenMint": "7sm142JgXr3u5e2HXMfimidVPjZWwZNQr4oTBckQELJr",
  "assetType": "nft",
  "portfolioSummary": [
    {
      "symbol": "NFT",
      "name": "Mad Lads #420",
      "mint": "7sm142JgXr3u5e2HXMfimidVPjZWwZNQr4oTBckQELJr",
      "image": "https://arweave.net/...",
      "percentage": 100,
      "allocatedAmount": "1",
      "isNft": true
    }
  ],
  "tweetUrl": "https://x.com/nothipposol/status/2095515974619263159",
  "status": "pending"
}
```

---

## 3. Client-Side Wallet Signing Flow

The backend returns a base64-encoded `VersionedTransaction` (V0 message) with recent blockhash and idempotent ATA creation instructions baked in.

### Standard Wallet Execution Hook
```ts
import { VersionedTransaction } from "@solana/web3.js";
import { useWallet } from "@/lib/wallet/wallet-context";

export async function signAndSendNftTransfer(base64Tx: string) {
  const binary = Uint8Array.from(atob(base64Tx), (c) => c.charCodeAt(0));
  const tx = VersionedTransaction.deserialize(binary);

  // Sign & Send with connected wallet (Phantom, Backpack, Solflare)
  const signature = await window.solana.signAndSendTransaction(tx);
  
  // Signature string
  const txHash = typeof signature === "string" ? signature : signature.signature;
  return txHash;
}
```

---

## 4. Recommended UI/UX Enhancements

### 4.1 On `/dashboard/pending` (Pending Queue)
1. **Pill & Badge**:
   - For rows where `s.assetType === "nft"` or `s.inputToken === "NFT"`:
     - Render an Apple-grade purple/violet badge: `[🖼️ 1 NFT]`.
     - Clicking the mint links directly to `https://solscan.io/token/${s.tokenMint}`.
2. **Allocation Column**:
   - Render `Direct Sovereign Delivery (100%)` instead of DEX slicing bars.
3. **Sign Modal**:
   - If `s.assetType === "nft"`:
     - Skip `useElectionQuote` (no DEX swap needed).
     - Call `POST /api/v1/nft/transfer-plan` directly with `userWallet`, `recipientTag: s.recipientHandle`, `nftMint: s.tokenMint`.
     - User clicks **`[ Sign & Transfer NFT ]`**.
     - On approval, call `POST /api/v1/bot/pending/:id/confirm` with `{ signature: txHash }`.

### 4.2 On `/dashboard/payments` (Payments Screen)
1. **Mode Switcher**:
   Add a segmented pill control at the top of the composer:
   ```tsx
   <div className="flex p-1 rounded-xl glass-soft border border-hairline w-fit">
     <button className={tab === "token" ? "bg-foreground text-background font-semibold" : "text-muted2"}>
       Tokens (Portfolio Slicing)
     </button>
     <button className={tab === "nft" ? "bg-foreground text-background font-semibold" : "text-muted2"}>
       Transfer NFT (Direct)
     </button>
   </div>
   ```
2. **NFT Transfer Form**:
   - **Recipient**: Text input with `@tag` resolution (shows recipient avatar / address badge).
   - **NFT Picker**: Either a text input for `NFT Mint Address` OR an interactive card grid from `GET /api/v1/nft/wallet/:wallet`.
   - **Explainer Notice**:
     > *"Sovereign direct delivery: Transferred 1:1 to @tag's connected Solana wallet with zero DEX selling and zero election slicing."*
   - **Primary Action**: **`[ Transfer NFT to @tag ]`**.

---

## 5. Verification Checklist for Frontend Dev

- [ ] Fetching `GET /api/v1/bot/pending` shows `assetType: "nft"` rows properly formatted.
- [ ] Clicking **Review & Sign** on an NFT request builds a direct transfer plan without calling the DEX quote engine.
- [ ] Successfully sends tx to Solana Mainnet, creates recipient ATA if not existing, and delivers the NFT token.
- [ ] Calling `POST /api/v1/bot/pending/:id/confirm` updates the row to `[● SETTLED]` immediately.
- [ ] Receipt modal displays the Solscan link `https://solscan.io/tx/<signature>`.