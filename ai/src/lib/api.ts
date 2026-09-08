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

const rawApi = (import.meta.env.VITE_API_URL || "").trim();
const API_BASE = (rawApi.startsWith("http") ? rawApi : "https://api.tenderrwa.com").replace(/\/+$/, "");

export async function sendAiChat(payload: AiChatPayload): Promise<AiChatResponse> {
  // 1. Try server function first (server-side, secure)
  let res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);

  // 2. Fallback to direct backend if server function returns 404 or is unavailable
  if (!res || res.status === 404) {
    res = await fetch(`${API_BASE}/api/v2/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to process message (HTTP ${res.status})`);
  }

  return await res.json();
}

export async function getAiContext(): Promise<any> {
  // 1. Try server function first
  let res = await fetch("/api/context").catch(() => null);

  // 2. Fallback to direct backend
  if (!res || res.status === 404) {
    res = await fetch(`${API_BASE}/api/v2/ai/context`);
  }

  if (!res.ok) throw new Error("Failed to fetch AI context");
  return await res.json();
}

export async function checkXBindingStatus(walletAddress: string): Promise<XStatusResponse> {
  try {
    // 1. Try server function first (server-side, secure)
    let res = await fetch(`/api/auth/x-account?wallet=${encodeURIComponent(walletAddress)}`).catch(() => null);

    // 2. Fallback to direct backend if server function returns 404 or is unavailable
    if (!res || res.status === 404) {
      res = await fetch(`${API_BASE}/api/v1/auth/x/account?wallet=${encodeURIComponent(walletAddress)}`);
      if (res.status === 404) {
        res = await fetch(`${API_BASE}/api/v1/auth/x/status?wallet=${encodeURIComponent(walletAddress)}`);
      }
    }

    if (!res.ok) {
      return { linked: false };
    }

    const data = await res.json();
    return {
      linked: Boolean(data?.linked),
      account: data?.account || undefined,
      data: data,
    };
  } catch {
    return { linked: false };
  }
}
