import http from "http";
import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase, isUsingMemoryDb } from "./config/database.js";
import { runSeed } from "./scripts/seedData.js";
import { ensureAllDoctorSlugs } from "./utils/doctorSlug.js";
import { ensureAllUserSlugs } from "./utils/userSlug.js";
import { verifyMailConnection } from "./services/mail.service.js";
import { initSocket } from "./realtime/socket.js";
import { startAppointmentReminderJob } from "./jobs/appointmentReminder.job.js";

const port = Number(process.env.PORT) || 5000;

const connected = await connectDatabase();

if (connected && (isUsingMemoryDb() || process.env.AUTO_SEED === "true")) {
  await runSeed();
} else if (connected) {
  await ensureAllDoctorSlugs();
  await ensureAllUserSlugs();
}

const app = createApp();
const server = http.createServer(app);
initSocket(server);

server.listen(port, async () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  if (!connected) {
    console.warn("⚠ API chạy nhưng DB chưa kết nối — login sẽ lỗi 503.");
  }
  await verifyMailConnection();
  if (connected) {
    startAppointmentReminderJob();
  }
});
