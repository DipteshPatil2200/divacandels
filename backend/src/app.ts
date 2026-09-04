import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import path from "node:path";
import { env } from "./config/env.js";
import { databaseHealth, recordApplicationLog } from "./config/database.js";
import { adminRouter } from "./routes/admin.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { asyncHandler, errorHandler, notFound, requestId } from "./utils/http.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(requestId);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin(origin, callback) { const allowed = env.CORS_ALLOWED_ORIGINS.split(",").map((x) => x.trim()); callback(!origin || allowed.includes(origin) ? null : new Error("Origin not allowed"), true); }, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve("uploads"), { fallthrough: false, maxAge: env.NODE_ENV === "production" ? "7d" : 0, immutable: env.NODE_ENV === "production" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev", {
  stream: { write: (message) => { void recordApplicationLog(message.trim(), "access").catch((error) => console.error("Application log write failed", error)); } }
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: "draft-8", legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
app.use("/api", limiter);
app.use("/api/v1/admin/auth/login", loginLimiter);

app.get("/health", asyncHandler(async (_req, res) => res.json({ status: "ok", service: "diva-candles-api", timestamp: new Date().toISOString() })));
app.get("/health/database", asyncHandler(async (_req, res) => res.json(await databaseHealth())));

const openapi = {
  openapi: "3.0.3",
  info: { title: "DIVA Candles API", version: "1.0.0", description: "Storefront and secure administration API" },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/products": { get: { summary: "List published products", responses: { "200": { description: "Product list" } } } },
    "/products/{slug}": { get: { summary: "Get a published product", parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Product" }, "404": { description: "Not found" } } } },
    "/inquiries": { post: { summary: "Create an inquiry", responses: { "201": { description: "Inquiry accepted" }, "422": { description: "Validation error" } } } },
    "/admin/auth/login": { post: { summary: "Admin login", responses: { "200": { description: "Authenticated" }, "401": { description: "Invalid credentials" } } } }
  }
};
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use("/api/v1/admin/auth", authRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1", publicRouter);
app.use(notFound);
app.use(errorHandler);
