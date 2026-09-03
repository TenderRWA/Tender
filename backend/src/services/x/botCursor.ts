import { query } from "../../db";

const memoryCursors: Record<string, string> = {};

export async function getCursor(stream: string = "mentions"): Promise<string | null> {
  try {
    const res = await query("SELECT last_seen_id FROM x_bot_cursors WHERE stream = $1", [stream]);
    if (res.rows && res.rows.length > 0) {
      return res.rows[0].last_seen_id;
    }
  } catch (err) {
    console.warn("Could not read cursor from DB, checking memory fallback", err);
  }
  return memoryCursors[stream] || null;
}

export async function setCursor(stream: string = "mentions", lastSeenId: string): Promise<void> {
  memoryCursors[stream] = lastSeenId;
  try {
    await query(
      `INSERT INTO x_bot_cursors (stream, last_seen_id, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (stream) DO UPDATE SET last_seen_id = EXCLUDED.last_seen_id, updated_at = NOW()`,
      [stream, lastSeenId]
    );
  } catch (err) {
    console.warn("Could not persist cursor to DB, preserved in memory", err);
  }
}
