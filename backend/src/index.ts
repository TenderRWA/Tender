import "dotenv/config";
import { app } from "./app";
import { migrate } from "./db/migrate";
import { startBotPoller } from "./services/x/poller";

const PORT = process.env.PORT || 3001;

async function main() {
  try {
    await migrate();
  } catch (err) {
    console.warn("⚠️ Migrations skipped or incomplete (running in fallback mode):", err);
  }

  app.listen(PORT, () => {
    console.log(`🚀 TENDER Backend running on http://localhost:${PORT}`);
    startBotPoller();
  });
}

main();
