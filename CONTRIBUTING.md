# Contributing to TENDER

Thanks for your interest in contributing to **TENDER**. This document outlines our development workflow, contribution guidelines, and how to get started.

---

## Areas of Focus

### What We Are Actively Looking For
- **Routing Optimizations**: Enhancements to Jupiter quote bundling, slippage mitigation, and route composition for multi-leg asset elections.
- **Solana Pay & QR Extensions**: Mobile-friendly pay-link workflows and Solana Pay spec compliance.
- **RWA Registry Integrations**: Verified asset adapters for xStocks, Ondo, and Token-2022 scaled-UI token standards.
- **Documentation & Tests**: Edge case testing for atomic settlement failures, slippage fallback triggers, and multi-party payout splits.

### What is Currently Out of Scope
- Direct custodial or fiat on-ramping (TENDER is strictly non-custodial and routes on-chain).
- Proprietary AMM or DEX liquidity contracts (TENDER routes through existing Solana DEX aggregators like Jupiter).

---

## Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/<your-username>/tender.git
   cd tender
   ```

2. **Branching Strategy**
   - Create a feature branch off `main`:
     ```bash
     git checkout -b feat/election-persistence
     ```
   - Use descriptive branch prefixes: `feat/`, `fix/`, `docs/`, `refactor/`.

3. **Local Setup**
   - Install root dependencies:
     ```bash
     bun install
     ```
   - Install backend dependencies:
     ```bash
     cd backend && bun install && cd ..
     ```

4. **Testing & Validation**
   - Run backend type-checks and test suite:
     ```bash
     cd backend
     bun run check
     bun test
     ```

---

## Pull Request Guidelines

- **Atomic PRs**: One concern per PR. Keep changes focused and easily reviewable.
- **Tests Required**: Any new backend route or routing logic must include unit/integration tests under `backend/tests/`.
- **Commit Style**: Use imperative, present-tense commit messages in plain English:
  - `add slippage fallback route handler` (Good)
  - `added some changes / fixed bug` (Avoid)
- **Do not commit `.env` files**: Ensure no private keys, RPC secrets, or local database credentials are committed.

---

## Bug Reports

If you encounter a bug, open an issue with the following details:
1. **Context**: What action you were taking (e.g. executing settlement quote, setting handle election).
2. **Expected Behavior**: What you expected to occur.
3. **Actual Result**: What happened instead (including error messages and tx logs if applicable).
4. **Reproduction Steps**: Step-by-step instructions to reproduce.

---

## Security Vulnerabilities

Please **do not** open public GitHub issues for security vulnerabilities. Review [SECURITY.md](SECURITY.md) and report directly to `security@tenderrwa.com`.
