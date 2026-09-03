import { getValidBotAccessToken } from "./botTokenManager";

const API_BASE = "https://api.x.com/2";

export class XApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "XApiError";
  }
}

export interface XMention {
  id: string;
  text: string;
  authorId: string;
  conversationId: string;
  authorUsername?: string;
}

async function authedFetch(path: string, init?: RequestInit): Promise<any> {
  const accessToken = await getValidBotAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[X API Error] ${path} returned ${res.status}:`, body);
    throw new XApiError(res.status, `X API ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

let cachedBotUser: { id: string; username: string } | null = null;

export async function getBotUser(): Promise<{ id: string; username: string }> {
  if (cachedBotUser) return cachedBotUser;
  const body = await authedFetch("/users/me");
  cachedBotUser = {
    id: body.data.id as string,
    username: body.data.username as string,
  };
  return cachedBotUser;
}

export async function listNewMentions(params: {
  sinceId?: string | null;
  maxResults?: number;
}): Promise<XMention[]> {
  const botUser = await getBotUser();
  const queryParams = new URLSearchParams({
    max_results: String(params.maxResults ?? 20),
    "tweet.fields": "author_id,conversation_id,created_at",
    expansions: "author_id",
    "user.fields": "username",
  });

  if (params.sinceId) {
    queryParams.set("since_id", params.sinceId);
  }

  const body = await authedFetch(`/users/${botUser.id}/mentions?${queryParams}`);
  const tweets = (body.data ?? []) as Array<{
    id: string;
    text: string;
    author_id: string;
    conversation_id: string;
  }>;

  const users = new Map<string, string>();
  if (body.includes?.users) {
    for (const u of body.includes.users) {
      users.set(u.id, u.username);
    }
  }

  return tweets.map((t) => ({
    id: t.id,
    text: t.text,
    authorId: t.author_id,
    conversationId: t.conversation_id,
    authorUsername: users.get(t.author_id),
  }));
}

export async function replyToMention(tweetId: string, text: string): Promise<{ id: string }> {
  const res = await authedFetch("/tweets", {
    method: "POST",
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: tweetId },
    }),
  });
  return { id: res.data.id };
}
