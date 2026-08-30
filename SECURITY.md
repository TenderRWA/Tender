# Security Policy

At **TENDER**, security and non-custodial atomicity are paramount. We appreciate the efforts of security researchers in identifying vulnerabilities responsibly.

---

## Reporting a Vulnerability

Please report security issues directly via email rather than opening a public issue or discussion:

📧 **Security Contact**: [security@tenderrwa.com](mailto:security@tenderrwa.com)

### Response Timeline
- **Acknowledgment**: Within **48 hours** of initial submission.
- **Triage & Status Update**: Within **5 business days**.
- **Critical Patches**: Target deployment within **7 days** of confirmed triage.

---

## Scope

### In Scope
- TENDER backend routing and settlement APIs (`/backend`).
- Handle resolver, election management, and slippage guardrail calculations.
- Frontend payment link and QR generation flows (`/src`).
- Jupiter aggregator route generation and quote validation logic.

### Out of Scope
- Third-party Solana core validator infrastructure.
- Jupiter Aggregator smart contracts (report to Jupiter directly).
- Third-party RWA issuers (e.g. Ondo, xStocks issuers).
- Social engineering, phishing, or physical attacks.

---

## Project-Specific Attack Surfaces & Vectors

When conducting research on TENDER, consider the following critical vectors:

1. **Slippage Manipulation & Sandwich Attacks**: Exploiting multi-leg swaps across illiquid RWA pools during atomic settlement.
2. **Counterfeit Token Injection**: Submitting counterfeit mint addresses posing as authentic RWAs into election configurations.
3. **Handle Resolver Spoofing & Frontrunning**: Unauthorized modification or intercepting handle destination addresses and split configurations.
4. **Malicious Solana Pay Injection**: Tampering with payment amounts, recipient addresses, or transaction memo fields in generated QR codes.
5. **Database SQL / Payload Injection**: Malicious input in handle metadata or election basis-point distribution payloads.

---

## Safe Harbor & Research Conduct

We will not pursue legal action against researchers who:
- Act in good faith to avoid privacy violations, destruction of data, and service interruption.
- Give us reasonable time to remediate before public disclosure.
- Do not exploit a vulnerability beyond what is needed to prove its existence.

Contributors who discover confirmed vulnerabilities will be credited in our release notes (unless they request anonymity).
