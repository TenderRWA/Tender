import Groq from "groq-sdk";
import { config } from "../../config";

export type BotAction = "send" | "quote" | "election" | "help" | "unrecognized";

export interface ParsedBotIntent {
  action: BotAction;
  target: string | null;
  amount: number | null;
  token: string | null;
  memo: string | null;
  confidence: number;
}

const SYSTEM_PROMPT = `You are the TENDER AI intent parser for Twitter/X bot commands on Solana (@TenderRWABot).
TENDER is a non-custodial receive-side portfolio settlement rail. Senders pay in working currencies (USDC or SOL), and TENDER atomically converts and settles the payment into the recipient's pre-elected stock portfolio (e.g. SPYx, NVDAx, AAPLx, etc.) without intermediate escrow custody.

Classify the user's message into one of these actions:
1. "send": Transferring, paying, or sending funds to a recipient (@handle or Solana address).
   Examples:
   - "@TenderRWABot send 50 USDC to @whoknows" -> action: "send", target: "@whoknows", amount: 50, token: "USDC"
   - "@TenderRWABot pay @alex 100 USDC for the design work" -> action: "send", target: "@alex", amount: 100, token: "USDC", memo: "for the design work"
   - "tip 5 SOL to @creator" -> action: "send", target: "@creator", amount: 5, token: "SOL"
   - "send $25 in usdc to @bob" -> action: "send", target: "@bob", amount: 25, token: "USDC"

2. "quote": Asking for a settlement quote or price estimate to an elected handle.
   Examples:
   - "@TenderRWABot quote 100 USDC for @whoknows" -> action: "quote", target: "@whoknows", amount: 100, token: "USDC"
   - "how much is 50 usdc settled to @mira?" -> action: "quote", target: "@mira", amount: 50, token: "USDC"

3. "help": Asking for help, available commands, or how TENDER works.
   Examples:
   - "@TenderRWABot help" -> action: "help"
   - "what can you do?" -> action: "help"

4. "unrecognized": Casual chat, greetings, statements, or unsupported intents.

Return ONLY a valid JSON object matching this schema:
{
  "action": "send" | "quote" | "help" | "unrecognized",
  "target": string | null,
  "amount": number | null,
  "token": string | null,
  "memo": string | null,
  "confidence": number
}`;

let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  groqClient ??= new Groq({ apiKey: config.groq.apiKey });
  return groqClient;
}

export async function parseBotIntentWithGroq(text: string): Promise<ParsedBotIntent> {
  if (!config.groq.apiKey) {
    return {
      action: "unrecognized",
      target: null,
      amount: null,
      token: null,
      memo: null,
      confidence: 0,
    };
  }

  try {
    const res = await getGroqClient().chat.completions.create({
      model: config.groq.model || "qwen/qwen3.8-27b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from Groq");

    const parsed = JSON.parse(content) as ParsedBotIntent;
    return {
      action: parsed.action || "unrecognized",
      target: parsed.target ? parsed.target.trim() : null,
      amount: typeof parsed.amount === "number" && parsed.amount > 0 ? parsed.amount : null,
      token: parsed.token ? parsed.token.toUpperCase().trim() : "USDC",
      memo: parsed.memo || null,
      confidence: parsed.confidence ?? 0.9,
    };
  } catch (err) {
    console.error("Groq intent parse failed:", err);
    return {
      action: "unrecognized",
      target: null,
      amount: null,
      token: null,
      memo: null,
      confidence: 0,
    };
  }
}
