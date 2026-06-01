import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase, isUsingMemoryDb } from "./config/database.js";
import { runSeed } from "./scripts/seedData.js";

const port = Number(process.env.PORT) || 5000;

const connected = await connectDatabase();

if (connected && (isUsingMemoryDb() || process.env.AUTO_SEED === "true")) {
  await runSeed();
}

const app = createApp();
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  if (!connected) {
    console.warn("⚠ API chạy nhưng DB chưa kết nối — login sẽ lỗi 503.");
  }
});
