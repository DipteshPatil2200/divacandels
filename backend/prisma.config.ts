import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    url: process.env.DATABASE_URL ?? "sqlserver://localhost:1433;database=DivaCandlesDB;user=sa;password={CHANGE_ME};encrypt=true;trustServerCertificate=true;schema=dbo"
  }
});
