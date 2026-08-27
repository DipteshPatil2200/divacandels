import { createServer } from "node:http";
import { app } from "./app.js";
import { connectDatabase, prisma } from "./config/database.js";
import { env } from "./config/env.js";

async function start() {
  await connectDatabase();
  const server = createServer(app);
  server.listen(env.PORT, () => console.info(`DIVA Candles API ready on http://localhost:${env.PORT}`));
  const shutdown = (signal: string) => {
    console.info(`${signal} received; closing connections`);
    server.close(() => void prisma.$disconnect().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((error) => { console.error("API startup failed after database retries", error); process.exit(1); });
