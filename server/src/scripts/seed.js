import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { runSeed } from "./seedData.js";

async function seed() {
  const ok = await connectDatabase();
  if (!ok || mongoose.connection.readyState !== 1) {
    console.error("MongoDB not connected. Kiểm tra MONGODB_* trong server/.env");
    process.exit(1);
  }
  await runSeed();
  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
