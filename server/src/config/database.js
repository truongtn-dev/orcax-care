import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let dbConnected = false;
let memoryServer = null;

export function isDatabaseConnected() {
  return dbConnected && mongoose.connection.readyState === 1;
}

export function isUsingMemoryDb() {
  return Boolean(memoryServer);
}

async function connectWithUri(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  dbConnected = true;
}

async function connectMemoryDb() {
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri("orcaxcare");
  await connectWithUri(uri);
  console.log("✓ MongoDB connected (in-memory dev database)");
  console.log("  Dữ liệu mất khi tắt server — dùng Atlas/local cho production.\n");
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    dbConnected = true;
    return true;
  }

  const uri = (process.env.MONGODB_URI || "").trim();
  const useMemory =
    uri === "memory" ||
    process.env.USE_MEMORY_DB === "true" ||
    (!uri && process.env.NODE_ENV !== "production");

  if (useMemory) {
    try {
      await connectMemoryDb();
      return true;
    } catch (err) {
      dbConnected = false;
      console.error("✗ In-memory MongoDB failed:", err.message);
      return false;
    }
  }

  if (!uri) {
    console.warn("\n⚠ MONGODB_URI chưa set. Thêm vào server/.env:");
    console.warn("  MONGODB_URI=memory          ← chạy dev không cần Atlas");
    console.warn("  MONGODB_URI=mongodb://127.0.0.1:27017/orcaxcare\n");
    return false;
  }

  try {
    await connectWithUri(uri);
    console.log("✓ MongoDB connected");
    return true;
  } catch (err) {
    dbConnected = false;
    console.error("\n✗ Không kết nối Atlas/local MongoDB:");
    console.error(`  ${err.message}\n`);

    if (process.env.NODE_ENV !== "production") {
      console.warn("→ Thử in-memory DB cho dev...\n");
      try {
        await connectMemoryDb();
        return true;
      } catch (memErr) {
        console.error("✗ In-memory fallback failed:", memErr.message);
      }
    }

    console.error("Sửa server/.env:");
    console.error("  MONGODB_URI=memory");
    console.error("  hoặc whitelist IP Atlas (0.0.0.0/0)\n");
    return false;
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  dbConnected = false;
}
