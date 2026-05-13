import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";

const port = Number(process.env.PORT) || 5000;

await connectDatabase();

const app = createApp();
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
