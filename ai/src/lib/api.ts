export interface AiChatPayload {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  userWallet?: string;
}

export interface AiLeg {
  symbol: string;
  percentage: number;
  allocatedAmount: string;
  tokenAddress?: string;
}

export interface ActionCardData {
  type: "payment" | "portfolio" | "quote" | "invoice" | "nft" | "assets" | "info";
  title: string;
  recipientHandle?: string;
  recipientWallet?: string;
  amount?: number;
  token?: string;
  memo?: string;
  legs?: AiLeg[];
  totalAmountIn?: string;
  tokenDetails?: any;
  meta?: Record<string, any>;
}

export interface AiChatResponse {
  success: boolean;
  reply: string;
  intent: {
    action: string;
    target: string | null;
    amount: number | null;
    token: string | null;
    memo: string | null;
    confidence: number;
    recipientHandle?: string;
    recipientWallet?: string;
    isRegistered?: boolean;
    portfolioSummary?: AiLeg[];
    quote?: any;
  };
  actionCard: ActionCardData | null;
}

export interface XStatusResponse {
  linked: boolean;
  isDemo?: boolean;
  account?: {
    xUsername: string;
    xUserId: string;
    wallet: string;
  };
  data?: {
    linked: boolean;
    account?: {
      xUsername: string;
      xUserId: string;
      wallet: string;
    };
  };
}

const API_BASE = (import.meta.env.VITE_API_URL || "https://api.tenderrwa.com").replace(/\/+$/, "");

export async function sendAiChat(payload: AiChatPayload): Promise<AiChatResponse> {
  const res = await fetch(`${API_BASE}/api/v2/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to process message (HTTP ${res.status})`);
  }

  return await res.json();
}

export async function getAiContext(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v2/ai/context`);
  if (!res.ok) throw new Error("Failed to fetch AI context");
  return await res.json();
}

export async function checkXBindingStatus(walletAddress: string): Promise<XStatusResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/x/status?wallet=${encodeURIComponent(walletAddress)}`);
    if (!res.ok) {
      return { linked: false };
    }
    return await res.json();
  } catch {
    return { linked: false };
  }
}
