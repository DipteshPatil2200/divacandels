import "dotenv/config";
import { z } from "zod";

const bool = z.string().default("false").transform((v) => v.toLowerCase() === "true");
const optionalPositiveNumber = z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().positive().optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  DB_SERVER: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().default(1433),
  DB_NAME: z.string().default("DivaCandlesDB"),
  DB_USER: z.string().default("sa"),
  DB_PASSWORD: z.string().default("CHANGE_ME"),
  DB_ENCRYPT: bool,
  DB_TRUST_SERVER_CERTIFICATE: z.string().default("true").transform((v) => v === "true"),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
  DB_POOL_MIN: z.coerce.number().int().min(0).default(0),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().default(30000),
  DB_CONNECT_RETRIES: z.coerce.number().int().min(1).default(5),
  DB_STORAGE_LIMIT_MB: optionalPositiveNumber,
  JWT_ACCESS_SECRET: z.string().min(32).default("development-access-secret-change-me-now"),
  JWT_REFRESH_SECRET: z.string().min(32).default("development-refresh-secret-change-me-now"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  ADMIN_NAME: z.string().default("DIVA Candles Administrator"),
  ADMIN_EMAIL: z.string().email().default("info.divacandles@gmail.com"),
  ADMIN_INITIAL_PASSWORD: z.string().min(12).default("CHANGE_THIS_STRONG_PASSWORD"),
  COOKIE_SECURE: bool,
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: bool,
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default("DIVA Candles"),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  NOTIFICATION_EMAIL: z.string().email().default("info.divacandles@gmail.com"),
  WHATSAPP_NUMBER: z.string().default("918421869308"),
  BACKEND_PUBLIC_URL: z.string().url().default("http://localhost:8080"),
  IMAGE_PROVIDER: z.enum(["local", "cloudinary"]).default("local"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional()
});

export const env = schema.parse(process.env);

if (env.NODE_ENV === "production" && env.DB_TRUST_SERVER_CERTIFICATE) {
  throw new Error("DB_TRUST_SERVER_CERTIFICATE must be false in production");
}
if (env.NODE_ENV === "production" && (!process.env.DB_PASSWORD || !process.env.JWT_ACCESS_SECRET)) {
  throw new Error("Production database and JWT secrets are required");
}
if (env.NODE_ENV === "production" && env.IMAGE_PROVIDER !== "cloudinary") {
  throw new Error("IMAGE_PROVIDER must be cloudinary in production so uploaded images remain persistent");
}
if (env.IMAGE_PROVIDER === "cloudinary" && (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET)) {
  throw new Error("Cloudinary credentials are required when IMAGE_PROVIDER=cloudinary");
}
