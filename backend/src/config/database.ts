import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "./env.js";

const adapter = new PrismaMssql({
  server: env.DB_SERVER,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
    enableArithAbort: true
  },
  pool: {
    max: env.DB_POOL_MAX,
    min: env.DB_POOL_MIN,
    idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS
  }
});

export const prisma = new PrismaClient({ adapter });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectDatabase(): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= env.DB_CONNECT_RETRIES; attempt += 1) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1 AS healthy`;
      return;
    } catch (error) {
      lastError = error;
      if (attempt < env.DB_CONNECT_RETRIES) await delay(Math.min(1000 * 2 ** (attempt - 1), 10000));
    }
  }
  throw lastError;
}

export async function databaseHealth() {
  const startedAt = Date.now();
  await prisma.$queryRaw`SELECT 1 AS healthy`;
  return { status: "up", latencyMs: Date.now() - startedAt, database: env.DB_NAME };
}
