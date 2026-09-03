import type { ParsedBotIntent } from "./groqIntentParser";

export function parseFastCommand(text: string): ParsedBotIntent | null {
  const clean = text
    .replace(/@TenderRWABot/gi, "")
    .replace(/@TenderRWA/gi, "")
    .trim();

  // 1. Help
  if (/^(help|\?|commands)$/i.test(clean)) {
    return {
      action: "help",
      target: null,
      amount: null,
      token: null,
      memo: null,
      confidence: 1.0,
    };
  }

  // 2. Pay/Send/Tip: "pay @whoknows 50 USDC" or "send 50 USDC to @whoknows" or "tip @whoknows 10 SOL"
  const payRegex1 = /^(?:pay|send|tip)\s+([@a-zA-Z0-9_-]{3,64})\s+([0-9.]+)\s*([a-zA-Z0-9]+)?(?:\s+(?:for|memo:?)\s+(.+))?$/i;
  const match1 = clean.match(payRegex1);
  if (match1) {
    const target = match1[1].startsWith("@") ? match1[1] : `@${match1[1]}`;
    const amount = parseFloat(match1[2]);
    const token = (match1[3] || "USDC").toUpperCase();
    const memo = match1[4]?.trim() || null;
    if (!isNaN(amount) && amount > 0) {
      return { action: "send", target, amount, token, memo, confidence: 1.0 };
    }
  }

  const payRegex2 = /^(?:pay|send|tip)\s+([0-9.]+)\s*([a-zA-Z0-9]+)?\s+(?:to|for)\s+([@a-zA-Z0-9_-]{3,64})(?:\s+(?:for|memo:?)\s+(.+))?$/i;
  const match2 = clean.match(payRegex2);
  if (match2) {
    const amount = parseFloat(match2[1]);
    const token = (match2[2] || "USDC").toUpperCase();
    const target = match2[3].startsWith("@") ? match2[3] : `@${match2[3]}`;
    const memo = match2[4]?.trim() || null;
    if (!isNaN(amount) && amount > 0) {
      return { action: "send", target, amount, token, memo, confidence: 1.0 };
    }
  }

  // 3. Quote: "quote 100 USDC for @whoknows" or "quote @whoknows 100 USDC"
  const quoteRegex = /^quote\s+(?:([0-9.]+)\s*([a-zA-Z0-9]+)?\s+(?:for|to)\s+([@a-zA-Z0-9_-]{3,64})|([@a-zA-Z0-9_-]{3,64})\s+([0-9.]+)\s*([a-zA-Z0-9]+)?)$/i;
  const matchQuote = clean.match(quoteRegex);
  if (matchQuote) {
    if (matchQuote[1]) {
      const amount = parseFloat(matchQuote[1]);
      const token = (matchQuote[2] || "USDC").toUpperCase();
      const target = matchQuote[3].startsWith("@") ? matchQuote[3] : `@${matchQuote[3]}`;
      return { action: "quote", target, amount, token, memo: null, confidence: 1.0 };
    } else if (matchQuote[4]) {
      const target = matchQuote[4].startsWith("@") ? matchQuote[4] : `@${matchQuote[4]}`;
      const amount = parseFloat(matchQuote[5]);
      const token = (matchQuote[6] || "USDC").toUpperCase();
      return { action: "quote", target, amount, token, memo: null, confidence: 1.0 };
    }
  }

  // 4. Invoice / Request: "invoice @client 250 USDC for audit" or "request 100 USDC from @partner for design"
  const invoiceRegex1 = /^(?:invoice)\s+([@a-zA-Z0-9_-]{3,64})\s+([0-9.]+)\s*([a-zA-Z0-9]+)?(?:\s+(?:for|memo:?)\s+(.+))?$/i;
  const matchInvoice1 = clean.match(invoiceRegex1);
  if (matchInvoice1) {
    const target = matchInvoice1[1].startsWith("@") ? matchInvoice1[1] : `@${matchInvoice1[1]}`;
    const amount = parseFloat(matchInvoice1[2]);
    const token = (matchInvoice1[3] || "USDC").toUpperCase();
    const memo = matchInvoice1[4]?.trim() || null;
    if (!isNaN(amount) && amount > 0) {
      return { action: "invoice", target, amount, token, memo, confidence: 1.0 };
    }
  }

  const invoiceRegex2 = /^(?:request)\s+([0-9.]+)\s*([a-zA-Z0-9]+)?\s+(?:from)\s+([@a-zA-Z0-9_-]{3,64})(?:\s+(?:for|memo:?)\s+(.+))?$/i;
  const matchInvoice2 = clean.match(invoiceRegex2);
  if (matchInvoice2) {
    const amount = parseFloat(matchInvoice2[1]);
    const token = (matchInvoice2[2] || "USDC").toUpperCase();
    const target = matchInvoice2[3].startsWith("@") ? matchInvoice2[3] : `@${matchInvoice2[3]}`;
    const memo = matchInvoice2[4]?.trim() || null;
    if (!isNaN(amount) && amount > 0) {
      return { action: "invoice", target, amount, token, memo, confidence: 1.0 };
    }
  }

  // 5. Election / Portfolio / Mix query: "mix @whoknows", "election @nothipposol", "portfolio @whoknows"
  const electionRegex = /^(?:election|elections|mix|mixes|portfolio|allocation|allocations|view|info|check)\s+(?:for\s+)?([@a-zA-Z0-9_-]{3,64})$/i;
  const matchElection = clean.match(electionRegex);
  if (matchElection) {
    const target = matchElection[1].startsWith("@") ? matchElection[1] : `@${matchElection[1]}`;
    return {
      action: "election",
      target,
      amount: null,
      token: null,
      memo: null,
      confidence: 1.0,
    };
  }

  // 6. Bare handle query: "@nothipposol"
  const bareHandleRegex = /^([@a-zA-Z0-9_-]{3,64})$/;
  const matchBare = clean.match(bareHandleRegex);
  if (matchBare && matchBare[1].startsWith("@")) {
    return {
      action: "election",
      target: matchBare[1],
      amount: null,
      token: null,
      memo: null,
      confidence: 0.9,
    };
  }

  return null;
}
