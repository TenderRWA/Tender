# 🏛️ TENDER Platform Feature Architecture & Reference

> **Non-Custodial Real-World Asset (RWA) Settlement Protocol on Solana**  
> *Sovereign Multi-Leg Elections · Dual-Provider Best Execution Routing · Solana Pay Integration*

---

## 📑 Table of Contents

1. [Pay-by-Handle Sovereign Identity](#1-pay-by-handle-sovereign-identity)
2. [Multi-Leg Portfolio Receive Elections](#2-multi-leg-portfolio-receive-elections)
3. [714+ Tokenized Real-World Asset (RWA) Catalog](#3-714-tokenized-real-world-asset-rwa-catalog)
4. [Dual-Provider Intelligent Settlement Engine](#4-dual-provider-intelligent-settlement-engine)
5. [Atomic Base64 Transaction Assembly](#5-atomic-base64-transaction-assembly)
6. [Solana Pay Standard & Dynamic Invoicing](#6-solana-pay-standard--dynamic-invoicing)
7. [Protocol Fee Engine & Automated Revenue Capture](#7-protocol-fee-engine--automated-revenue-capture)
8. [Interactive Developer CLI Cockpit & Verification Suite](#8-interactive-developer-cli-cockpit--verification-suite)
9. [High-Performance Web3 Interface](#9-high-performance-web3-interface)

---

## 1. Pay-by-Handle Sovereign Identity

* **Human-Readable Handles**: Replaces cumbersome 44-character base58 Solana public keys with clean `@handles` (e.g., `@darkseid`, `@alice`, `@acme_dao`).
* **Non-Custodial Wallet Binding**: Handles are permanently pinned to the user's self-custody Solana wallet address (Phantom, Backpack, Solflare, Ledger).
* **High-Throughput Registry**: Backed by PostgreSQL indexing with real-time availability querying, format validation (`/^[a-z0-9_]{3,20}$/`), and instant on-chain registry verification.
* **Role-Based Metadata**: Supports configurable entity personas (`Receiver`, `Sender`, `Team-DAO`, `Staker`) stored in structured JSON metadata.

---

## 2. Multi-Leg Portfolio Receive Elections

* **Custom Receive Allocations**: Receivers can configure their incoming settlement distribution across up to **10 custom assets** (e.g., `50% NVDAx` + `30% USDC` + `20% GLDx`).
* **Any-to-Many Instant Settlement**: Senders can pay in **any token** (e.g., 100 USDC, SOL, or USDT), and the protocol automatically converts and distributes it into the receiver's exact elected portfolio mix in a single atomic transaction.
* **Zero Escrow & Direct ATA Delivery**: Funds never touch intermediate protocol custody or escrow smart contracts; settled assets land directly into the receiver's personal Associated Token Accounts (ATAs).
* **Precise Basis-Point Slicing**: Configured down to exact basis points (`10,000 bps = 100.00%`), preventing rounding drift or balance leakage.

---

## 3. 714+ Tokenized Real-World Asset (RWA) Catalog

* **Comprehensive Solana Equities (xStocks Standard)**: Full support for 714+ tokenized stocks, commodities, and index ETFs, including:
  * **Mega-Cap Technology**: `NVDAx`, `AAPLx`, `TSLAx`, `MSFTx`, `GOOGLx`, `AMZNx`, `METAx`, `PLTRx`
  * **Commodities & Precious Metals**: `GLDx` (Gold), `SLVx` (Silver), Oil ETFs
  * **Broad Market Indices**: `SPYx` (S&P 500 ETF), `QQQx` (Nasdaq-100 ETF)
  * **Base Currencies & Crypto**: `USDC`, `SOL`, `WSOL`, `USDT`
* **Real-Time Asset Search API**: Debounced multi-field search querying tickers, company names, underlying symbols, and mint addresses (`/api/v1/assets?q=...`).
* **Dynamic Brand Color Engine**: Pixel-level HTML5 canvas color extraction sampling CDN logos to dynamically style slider tracks, dots, and pie chart slices in each company's exact brand color.

---

## 4. Dual-Provider Intelligent Settlement Engine

* **Parallel Liquidity Routing**: Queries **Jupiter DEX Aggregator (V6)** and **Relay.link (V2)** concurrently for every individual trade leg.
* **Best-Execution Arbitration**: Automatically evaluates net `outAmount`, price impact, liquidity depth, and execution fees, routing each transaction leg to the superior provider.
* **Solana Chain Guarding**: Native chain ID matching (`792703809` for Solana on Relay) with intelligent EVM fee address filtering and native wrapped SOL (`So11111111111111111111111111111111111111112`) mint substitution.
* **Multi-Leg Concurrent Slicing**: Splits multi-asset portfolio invoices into parallel execution legs, computing optimal route parameters across both providers simultaneously.

---

## 5. Atomic Base64 Transaction Assembly

* **Single-Signature Execution**: Assembles all swap instructions, token account initializations, spl-token transfers, and fee deductions into a single base64 Solana `VersionedTransaction`.
* **Address Lookup Tables (ALT)**: Utilizes Solana ALTs to compress transaction accounts, fitting complex 8–10 leg swaps within the 1232-byte MTU limit.
* **Zero Slippage Surprises**: Enforces strict user-defined slippage tolerance (e.g., 50 bps / 0.50%) across all routing legs.

---

## 6. Solana Pay Standard & Dynamic Invoicing

* **Solana Pay POS Compatibility**: Generate spec-compliant Solana Pay QR codes and mobile wallet deep links (`solana:https://api.tenderrwa.com/api/v1/solana-pay/...`).
* **Dynamic Merchant Invoicing**: Create invoices with custom expiry timers, reference keys, memos, and fixed payment amounts (`POST /api/v1/invoices`).
* **Mobile Wallet Adapter (MWA)**: Supports frictionless one-tap native signing on mobile devices across Phantom, Solflare, and Backpack.

---

## 7. Protocol Fee Engine & Automated Revenue Capture

* **Configurable Protocol Take-Rate**: Built-in fee deduction (e.g., 15 bps / 0.15%) built directly into settlement route construction.
* **Treasury Auto-Routing**: Fees are programmatically directed to the protocol treasury/DAO wallet at the exact moment of transaction execution.
* **Non-Custodial Fee Collection**: Collected strictly as part of the atomic swap bundle with zero manual withdrawal or escrow overhead.

---

## 8. Interactive Developer CLI Cockpit & Verification Suite

* **CLI Cockpit (`bun run cockpit`)**: Interactive terminal workstation for simulating live API calls, debugging swaps, and testing edge cases.
* **Persistent Keypair Storage**: Generates and persists local test wallets (`wallet.json`) for realistic transaction building and simulation.
* **Live Product Walkthroughs**: Built-in menu for handle registration, dual quote comparisons, election adjustments, invoice payments, and transaction broadcasting.
* **Zero-Dependency CI/CD Suite**: Fully automated test suite running against live routing endpoints in under 300ms (`bun test`).

---

## 9. High-Performance Web3 Interface

* **TanStack Start Architecture**: Full-stack framework with zero-CORS server function proxies protecting backend endpoints and API credentials.
* **Real-Time Interactive Visualizations**:
  * Animated SVG donut election ring dynamically sliced according to custom percentages.
  * Custom slider controls with instant **"Balance Evenly"** one-click portfolio balancing.
  * Search modal browsing 714+ tokenized equities with instant ticker filtering.
* **Luxury Dark Aesthetic**: Brutalist typography, Lenis smooth scrolling with event isolation, responsive layouts, and WebGL particle scenes.
* **Wallet Standard Integration**: Direct connection with Phantom, Backpack, Solflare, and Ledger via `@wallet-standard/react`.
