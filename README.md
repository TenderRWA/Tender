# TENDER

[![CI](https://github.com/notadeveloper7/tender/actions/workflows/backend.yml/badge.svg)](https://github.com/notadeveloper7/tender/actions/workflows/backend.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.x-000000?logo=bun&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Solana](https://img.shields.io/badge/Solana-mainnet--beta-9945FF?logo=solana&logoColor=white)

**TENDER** is a non-custodial, receive-side Real World Asset (RWA) settlement rail on Solana. While conventional payment rails dictate what token the sender sends, TENDER enables receivers to set their target portfolio once (e.g. `60% SPYx`, `30% USDC`, `10% GLDx`). Any inbound payment in SOL, USDC, or listed SPL tokens settles atomically via Jupiter into the receiver's elected assets in a single transaction.

---

## Core Capabilities

| Feature | Description | Status |
| :--- | :--- | :--- |
| **Receive-Side Allocation** | Receivers define target asset mix in basis points (100% total) on their handle. | Active |
| **Atomic Jupiter Routing** | Single-transaction swap at receipt with slippage protection and authenticity gating. | Active |
| **Slippage Fallback** | Legs breaching slippage automatically safe-settle into USDC rather than failing or suffering bad fills. | Active |
| **Native Splits** | Multi-recipient routing where each recipient's share settles in their own unique portfolio. | Active |
| **Solana Pay Invoices** | QR code and pay-link generation compatible with standard Solana mobile wallets. | Active |
| **Payroll Vaults** | Scheduled multi-recipient payroll disbursements into individual employee elections. | Phase T3 |

---

## How It Works

```
Sender (SOL / USDC / SPL)
          │
          ▼
┌──────────────────────────────────────────────────────────┐
│             TENDER Settlement Rail (Atomic)              │
│  1. Resolve Handle & Preference bps                      │
│  2. Jupiter Best-Route Execution (Slippage Capped)       │
│  3. Multi-asset atomic delivery to receiver wallet       │
└──────────────────────────────────────────────────────────┘
          │
          ├──► 60% SPYx (Tokenized S&P 500)
          ├──► 30% USDC (Stable Reserve)
          └──► 10% GLDx (Tokenized Gold)
```

| Step | Action | Detail |
| :--- | :--- | :--- |
| **1. Handle Setup** | Receiver configures election | Sets bps allocation across verified tokenized stocks, ETFs, and stablecoins. |
| **2. Inbound Pay** | Sender sends any token | Zero conversion burden on sender; handles any liquid SPL token or SOL. |
| **3. Atomic Settlement**| Non-custodial swap | Jupiter routing splits and swaps funds directly to recipient wallet in 1 tx. |
| **4. Dividend Tracking**| Token-2022 Multiplier | Corporate actions accrue via issuer Scaled UI multiplier automatically. |

---

## Repository Structure

```
.
├── backend/                  # Bun + Express API service
│   ├── db/migrations/        # PostgreSQL SQL migration files
│   ├── src/
│   │   ├── db/               # pg connection pool & migration runner
│   │   ├── routes/           # REST endpoints (health, handles, settlements)
│   │   ├── app.ts            # Express app configuration
│   │   └── index.ts          # Server entrypoint
│   ├── tests/                # Bun + Supertest unit test suite
│   ├── Dockerfile            # Production container definition
│   └── package.json
├── src/                      # Frontend web application (React + TanStack + Tailwind)
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Utilities (clsx, twMerge)
│   ├── App.tsx               # Main landing & allocation dashboard
│   └── main.tsx              # React DOM entrypoint with TanStack Query
├── .github/workflows/        # GitHub Actions CI/CD pipeline
├── index.html
├── package.json
└── vite.config.ts
```

---

## API Endpoints & Deployment

* **Live Production Backend**: `https://tender-api-jpw2.onrender.com`
* **Hosting Tier**: Paid Render instance (Always-on, persistent, zero sleep / no cold starts)
* **Health Check**: `https://tender-api-jpw2.onrender.com/health`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status, version, and timestamp |
| `GET` | `/api/v1/handles/:handle` | Fetch handle registration and active asset election |
| `POST`| `/api/v1/handles/election`| Update target portfolio allocation for a handle |
| `POST`| `/api/v1/settle/quote` | Generate atomic Jupiter swap route for inbound payment |

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (v1.1+)
- [Node.js](https://nodejs.org/) (v20+)
- [PostgreSQL](https://www.postgresql.org/) (v15+)

### 1. Clone & Setup
```bash
git clone https://github.com/notadeveloper7/tender.git
cd tender
```

### 2. Frontend Setup
```bash
bun install
cp .env.example .env
bun run dev
```

### 3. Backend Setup
```bash
cd backend
bun install
cp .env.example .env
# Configure DATABASE_URL in backend/.env
bun run dev
```

### 4. Running Tests
```bash
cd backend
bun test
```

---

## Roadmap

- [x] **Phase T1**: Handle elections + single-recipient pay-by-handle atomic settlement.
- [ ] **Phase T2**: Splits with per-recipient elections + Solana Pay QR invoice links.
- [ ] **Phase T3**: Payroll vaults (scheduled rosters) + $TNDR genesis tokenomics.
- [ ] **Phase T4**: `.sol` domain resolution adapter + cross-chain pay-in routes.

---

## Tech Stack

- **Frontend**: React 19, Vite, TanStack Query, Tailwind CSS, Lucide React
- **Backend**: TypeScript, Bun, Express, PostgreSQL (`pg`)
- **Blockchain**: Solana (`@solana/web3.js`), Jupiter Aggregator V6 API, Token-2022
- **Deployment**: Vercel (Frontend), Render / Docker (Backend)
- **CI/CD**: GitHub Actions (Test, GHCR Build, Semantic Release, Deploy Hook)

---

## License

[MIT](LICENSE) © 2026 TENDER
