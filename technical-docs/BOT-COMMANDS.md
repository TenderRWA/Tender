# TENDER X Bot (`@TenderRWABot`) — Official Community Command Guide

> **Automated Bot Account**: [@TenderRWABot](https://x.com/TenderRWABot)  
> **Official Organization Account**: [@TenderRWA](https://x.com/TenderRWA)  
> **Web Terminal**: [tenderrwa.com](https://tenderrwa.com)

Welcome to **TENDER**, the non-custodial receive-side portfolio settlement rail on Solana. 

With `@TenderRWABot`, you can send payments, request quotes, and settle tokenized US stocks (xStocks) directly from your X timeline.

---

## ⚡ How It Works (The 30-Second Overview)

1. **Tag the bot in any tweet or reply**:  
   Mention `@TenderRWABot` with an action (pay, send, quote, mix).
2. **Atomic Slicing via Jupiter & Relay**:  
   TENDER reads the recipient’s pre-registered stock election (e.g. `50% SPYx`, `30% NVDAx`, `20% USDC`) and automatically slices the payment across on-chain order books.
3. **Review & Sign in Self-Custody**:  
   To prevent spam links on X, `@TenderRWABot` replies in plain text and directs you to the official link in its bio. Tap the bio link to open your dashboard and sign the transaction in Phantom, Backpack, or Solflare.
4. **Direct Delivery**:  
   Settled stock tokens and stablecoins land directly in the receiver’s personal wallet accounts — **zero escrow custody, ever**.

---

## 📋 Complete Command List

### 1. Send / Pay / Tip (`pay`, `send`, `tip`)
Pay any registered handle or recipient on X.

| Format | Example | What Happens |
| :--- | :--- | :--- |
| `pay @handle <amount> <token>` | `@TenderRWABot pay @whoknows 50 USDC` | Slices 50 USDC into `@whoknows`'s custom portfolio. |
| `send <amount> <token> to @handle` | `@TenderRWABot send 100 USDC to @whoknows` | Routes 100 USDC into the recipient's elected assets. |
| `tip @handle <amount> <token>` | `@TenderRWABot tip @creator 2 SOL` | Converts 2 SOL across `@creator`'s stock mix. |
| **Natural Language** | `@TenderRWABot send 75 USDC to @whoknows for the frontend design` | Groq AI extracts amount, token, recipient, and memo. |

**Bot Response Example**:
> *“Slicing 50 USDC for @whoknows into 50% SPYx, 30% NVDAx, 20% USDC. Tap the link in my bio to review and sign it in your dashboard.”*

---

### 2. Live Portfolio Quote (`quote`)
Check what an incoming payment would slice into before sending funds. **Read-only simulation**: Does **not** record a transaction or create a pending settlement on the rail.

| Format | Example | What Happens |
| :--- | :--- | :--- |
| `quote <amount> <token> for @handle` | `@TenderRWABot quote 100 USDC for @whoknows` | Queries live DEX order books across all portfolio legs. |
| `quote @handle <amount> <token>` | `@TenderRWABot quote @whoknows 50 USDC` | Returns exact real-time token output estimates. |
| **Natural Language** | `@TenderRWABot how much stock will 200 USDC get @whoknows?` | AI extracts the query and returns live quote estimates. |

**Bot Response Example**:
> *“Quote for @whoknows: 100 USDC estimates into ~0.13 SPYx, ~0.24 NVDAx, 20 USDC. Tap the link in my bio to open the terminal.”*

---

### 3. Check Portfolio Mix (`mix` / `election`)
Inspect anyone’s public sovereign portfolio election.

| Format | Example | What Happens |
| :--- | :--- | :--- |
| `mix @handle` | `@TenderRWABot mix @whoknows` | Pulls the active asset percentages for that handle. |
| `election @handle` | `@TenderRWABot election @whoknows` | Displays their target stock breakdown. |

**Bot Response Example**:
> *“@whoknows's elected portfolio: 50% SPYx, 30% NVDAx, 20% USDC. Tap the link in my bio to claim your handle and set your portfolio.”*

---

### 4. Create an Invoice (`invoice` / `request`)
Request payment from a client or collaborator.

| Format | Example | What Happens |
| :--- | :--- | :--- |
| `invoice @payer <amount> <token> for <memo>` | `@TenderRWABot invoice @client 250 USDC for audit` | Records a TENDER payment request with memo. |
| `request <amount> <token> from @payer` | `@TenderRWABot request 100 USDC from @partner` | Generates a pending invoice on the rail. |

**Bot Response Example**:
> *“Invoice recorded for @client (250 USDC · Memo: audit). Tap the link in my bio to view and pay.”*

---

### 5. Help & Overview (`help`)
Quick command reference and link to docs.

| Format | Example |
| :--- | :--- |
| `help` | `@TenderRWABot help` |
| `commands` | `@TenderRWABot commands` |

**Bot Response Example**:
> *“TENDER settles incoming payments into custom stock portfolios on Solana. Mention me with: • 'pay @handle 50 USDC' • 'quote 100 USDC for @handle' • 'mix @handle'. Tap the link in my bio to claim your handle.”*

---

## 🪙 Supported Currencies & Assets

### Working Currencies (What senders pay with)
* **`USDC`** (USD Coin on Solana)
* **`SOL`** (Native Solana)

### Verified Tokenized Stocks & ETFs (What receivers receive)
* **`SPYx`** — S&P 500 ETF Token
* **`NVDAx`** — NVIDIA Corp Token
* **`AAPLx`** — Apple Inc Token
* **`TSLAx`** — Tesla Inc Token
* **`GOOGLx`** — Alphabet Inc Token
* **`AMZNx`** — Amazon.com Token
* **`MSFTx`** — Microsoft Corp Token
* **`USDC`** — Cash stablecoin reserve

*(Over 700+ tokenized RWAs cataloged in the TENDER registry).*

---

## 🔒 Security & Privacy Guarantees

* **Zero Escrow Custody**: TENDER never holds your private keys, balances, or tokens.
* **Anti-Phishing / No-URL Replies**: `@TenderRWABot` **never posts external links in tweet replies**. Always navigate through the verified link in `@TenderRWABot`'s profile bio.
* **Self-Custody Approvals**: Every transaction must be explicitly reviewed and signed by the sender inside their own wallet app.
* **Idempotent Account Creation**: Even if the receiver doesn't have an Associated Token Account (ATA) for a stock yet, TENDER creates it automatically during settlement.

---

## 💡 Pro-Tips for Tweeting at `@TenderRWABot`

* **Unregistered Handles**: If you tag someone who hasn't claimed a TENDER handle yet, the bot will notify them to claim their handle and set their stock mix.
* **Case-Insensitive**: Commands work in lowercase, uppercase, or mixed (`USDC`, `usdc`, `Pay`, `PAY`).
* **Optional Memos**: Adding `for <reason>` attaches a memo to the transaction record for easy tracking in your dashboard.
