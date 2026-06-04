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

function wantsRealDatabase() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (uri.startsWith("mongodb")) return true;
  return Boolean(
    process.env.MONGODB_USER?.trim() &&
      process.env.MONGODB_PASSWORD?.trim() &&
      process.env.MONGODB_HOST?.trim(),
  );
}

export function resolveMongoUri() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (uri && uri !== "memory") return uri;

  const user = process.env.MONGODB_USER?.trim();
  const password = process.env.MONGODB_PASSWORD?.trim();
  const host = process.env.MONGODB_HOST?.trim();
  const dbName = (process.env.MONGODB_DB || "orcaxcare").trim();

  if (user && password && host) {
    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${dbName}?retryWrites=true&w=majority&appName=OrcaXCare`;
  }

  return uri;
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

  const uri = resolveMongoUri();
  const useMemory =
    uri === "memory" ||
    process.env.USE_MEMORY_DB === "true" ||
    (!uri && !wantsRealDatabase() && process.env.NODE_ENV !== "production");

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
    console.warn("\n⚠ MongoDB chưa cấu hình. Thêm vào server/.env:");
    console.warn("  MONGODB_URI=memory");
    console.warn("  hoặc MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST\n");
    return false;
  }

  try {
    await connectWithUri(uri);
    console.log("✓ MongoDB connected (Atlas)");
    return true;
  } catch (err) {
    dbConnected = false;
    console.error("\n✗ Không kết nối Atlas/local MongoDB:");
    console.error(`  ${err.message}\n`);

    if (process.env.NODE_ENV !== "production" && !wantsRealDatabase()) {
      console.warn("→ Thử in-memory DB cho dev...\n");
      try {
        await connectMemoryDb();
        return true;
      } catch (memErr) {
        console.error("✗ In-memory fallback failed:", memErr.message);
      }
    }

    console.error("Kiểm tra server/.env:");
    console.error("  - MONGODB_PASSWORD đúng chưa");
    console.error("  - Atlas → Network Access → Allow 0.0.0.0/0 (hoặc IP máy bạn)\n");
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
