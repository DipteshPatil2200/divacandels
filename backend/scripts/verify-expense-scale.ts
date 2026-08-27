import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { signToken } from "../src/utils/auth.js";

const admin = await prisma.adminUser.findFirst({ where: { isActive: true } });
if (!admin) throw new Error("No active administrator is available for verification.");
const authorization = `Bearer ${signToken(admin.id, admin.email, admin.role, "access")}`;

const list = await request(app).get("/api/v1/admin/expenses?page=1&pageSize=25&search=DIVA").set("Authorization", authorization);
if (list.status !== 200 || !list.body.data?.pagination || list.body.data.expenses.length > 25) throw new Error(`Paginated expense list failed (${list.status}).`);

const dashboard = await request(app).get(`/api/v1/admin/expenses/dashboard?year=${new Date().getFullYear()}`).set("Authorization", authorization);
if (dashboard.status !== 200 || dashboard.body.data?.monthly?.length !== 12) throw new Error(`Expense dashboard aggregation failed (${dashboard.status}).`);

const pdf = await request(app).get(`/api/v1/admin/expenses/report.pdf?year=${new Date().getFullYear()}&quarter=1`).set("Authorization", authorization);
if (pdf.status !== 200 || !String(pdf.headers["content-type"]).includes("application/pdf")) throw new Error(`Expense PDF aggregation failed (${pdf.status}).`);

console.log(`Expense scale verification passed: ${list.body.data.expenses.length}/25 rows returned, ${list.body.data.count} filtered records, 12 dashboard months, PDF ${pdf.status}.`);
await prisma.$disconnect();
