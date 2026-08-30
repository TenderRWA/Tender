import "dotenv/config";
import { app } from "./app";
import { migrate } from "./db/migrate";

const PORT = process.env.PORT || 3001;

async function main() {
  try {
    await migrate();
  } catch (err) {
    console.error("Failed to run database migrations:", err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 TENDER Backend running on http://localhost:${PORT}`);
  });
}

main();
