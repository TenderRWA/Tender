import { config } from "../../config";
import { getCursor, setCursor } from "./botCursor";
import { listNewMentions, replyToMention, getBotUser, type XMention } from "./botClient";
import { parseFastCommand } from "./commandParser";
import { parseBotIntentWithGroq } from "./groqIntentParser";
import { routeBotIntent } from "./xBotRoutingService";

let isPolling = false;
let pollerTimer: NodeJS.Timeout | null = null;

export async function pollMentionsOnce(): Promise<{
  processedCount: number;
  latestSeenId: string | null;
}> {
  if (!config.x.botAccessTokenSeed && !config.x.botRefreshTokenSeed) {
    return { processedCount: 0, latestSeenId: null };
  }

  let botUser: { id: string; username: string };
  try {
    botUser = await getBotUser();
  } catch (err) {
    console.error("[X Poller] Failed to get bot user, skipping cycle:", err);
    return { processedCount: 0, latestSeenId: null };
  }

  const cursor = await getCursor("mentions");
  let mentions: XMention[];

  try {
    mentions = await listNewMentions({ sinceId: cursor, maxResults: 10 });
  } catch (err: any) {
    console.error("[X Poller] Failed to fetch mentions:", err.message);
    return { processedCount: 0, latestSeenId: cursor };
  }

  if (mentions.length === 0) {
    return { processedCount: 0, latestSeenId: cursor };
  }

  // Sort mentions chronologically (oldest to newest)
  mentions.sort((a, b) => (BigInt(a.id) > BigInt(b.id) ? 1 : -1));

  let processedCount = 0;
  let highestId = cursor;

  for (const tweet of mentions) {
    // Update tracking ID
    if (!highestId || BigInt(tweet.id) > BigInt(highestId)) {
      highestId = tweet.id;
    }

    // Skip self-tweets from the bot
    if (tweet.authorId === botUser.id) {
      continue;
    }

    console.log(`[X Poller] Processing mention @${tweet.authorUsername || "unknown"} (tweet ${tweet.id}): "${tweet.text}"`);

    // 1. Fast regex parse
    let intent = parseFastCommand(tweet.text);

    // 2. Groq AI fallback if regex didn't match
    if (!intent || intent.action === "unrecognized") {
      intent = await parseBotIntentWithGroq(tweet.text);
    }

    // 3. Route intent into portfolio breakdown and response
    const routingResult = await routeBotIntent({
      intent,
      authorHandle: tweet.authorUsername,
      authorId: tweet.authorId,
      tweetId: tweet.id,
    });

    // 4. Reply to the tweet (strict plain text, NO URLs)
    try {
      await replyToMention(tweet.id, routingResult.replyText);
      console.log(`[X Poller] Successfully replied to tweet ${tweet.id}`);
      processedCount++;
    } catch (err: any) {
      console.error(`[X Poller] Failed to reply to tweet ${tweet.id}:`, err.message);
    }
  }

  if (highestId && highestId !== cursor) {
    await setCursor("mentions", highestId);
  }

  return { processedCount, latestSeenId: highestId };
}

export function startBotPoller(): void {
  if (!config.x.botEnabled) {
    console.log("ℹ️ X Bot polling is disabled by configuration (X_BOT_ENABLED=false)");
    return;
  }

  if (!config.x.botAccessTokenSeed && !config.x.botRefreshTokenSeed) {
    console.log("ℹ️ X Bot credentials not set in env. Bot poller will remain idle.");
    return;
  }

  if (isPolling) return;
  isPolling = true;

  console.log(`🤖 Starting TENDER X Bot poller (@${config.x.botHandle}) - interval: ${config.x.mentionsPollIntervalMs}ms`);

  // Initial poll on startup after a 5-second warm-up
  setTimeout(async () => {
    try {
      await pollMentionsOnce();
    } catch (err) {
      console.error("[X Poller] Error during initial poll:", err);
    }
  }, 5000);

  pollerTimer = setInterval(async () => {
    try {
      await pollMentionsOnce();
    } catch (err) {
      console.error("[X Poller] Error during interval poll:", err);
    }
  }, config.x.mentionsPollIntervalMs);
}

export function stopBotPoller(): void {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
  }
  isPolling = false;
  console.log("🛑 Stopped TENDER X Bot poller");
}
