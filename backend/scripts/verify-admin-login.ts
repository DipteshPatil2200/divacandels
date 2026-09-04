import request from "supertest";
import { app } from "../src/app.js";
import { db } from "../src/config/database.js";

const email = process.env.NEW_ADMIN_EMAIL;
const password = process.env.NEW_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Set NEW_ADMIN_EMAIL and NEW_ADMIN_PASSWORD.");
const agent = request.agent(app);
const login = await agent.post("/api/v1/admin/auth/login").send({ email, password });
if (login.status !== 200 || login.body.data?.mustChangePassword) throw new Error(`Admin login verification failed (${login.status}).`);
for (const path of ["/api/v1/admin/auth/me", "/api/v1/admin/dashboard", "/api/v1/admin/products", "/api/v1/admin/expenses", "/api/v1/admin/settings"]) {
  const response = await agent.get(path); if (response.status !== 200) throw new Error(`${path} failed (${response.status}).`);
}
const logout = await agent.post("/api/v1/admin/auth/logout"); if (logout.status !== 200) throw new Error("Logout verification failed.");
console.log("Admin login, protected session, dashboard, products, expenses, settings and logout verified.");
await db.$disconnect();
