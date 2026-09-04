import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { db } from "../src/config/database.js";
import { signToken } from "../src/utils/auth.js";

describe("stock reservation and expense management", () => {
  const stamp = Date.now(); const clientToken = `integration-${stamp}-stock-token`; let productId = 0; let expenseId = 0; let accessToken = "";
  beforeAll(async () => {
    const category = await db.category.findFirstOrThrow(); const admin = await db.adminUser.findFirstOrThrow({ where: { isActive: true } }); accessToken = signToken(admin.id, admin.email, admin.role, "access");
    const product = await db.product.create({ data: { sku: `TEST-STOCK-${stamp}`, name: "Temporary Stock Test Candle", slug: `temporary-stock-test-${stamp}`, description: "Temporary integration test product", price: 100, stockQuantity: 10, stockStatus: "IN_STOCK", categoryId: category.id, isActive: true } }); productId = product.id;
  });
  afterAll(async () => {
    if (expenseId) await db.expense.deleteMany({ where: { id: expenseId } });
    await db.stockReservation.deleteMany({ where: { clientToken } });
    if (productId) await db.product.deleteMany({ where: { id: productId } });
  });
  it("decrements stock once and treats a retried client token idempotently", async () => {
    const payload = { clientToken, items: [{ productId, quantity: 3 }] };
    const first = await request(app).post("/api/v1/stock-reservations").send(payload); const second = await request(app).post("/api/v1/stock-reservations").send(payload);
    expect(first.status).toBe(201); expect(second.status).toBe(201); expect(second.body.data.reservationNumber).toBe(first.body.data.reservationNumber);
    expect((await db.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity).toBe(7);
  });
  it("creates, lists, downloads and deletes an expense PDF", async () => {
    const created = await request(app).post("/api/v1/admin/expenses").set("Authorization", `Bearer ${accessToken}`).send({ title: "Integration test expense", category: "Other", amount: 125.5, expenseDate: "2026-08-10", paymentMethod: "UPI" });
    expect(created.status).toBe(201); expenseId = created.body.data.id;
    const list = await request(app).get("/api/v1/admin/expenses").set("Authorization", `Bearer ${accessToken}`); expect(list.status).toBe(200); expect(list.body.data.expenses.some((item: { id: number }) => item.id === expenseId)).toBe(true);
    const pdf = await request(app).get("/api/v1/admin/expenses/report.pdf").set("Authorization", `Bearer ${accessToken}`).buffer(true).parse((response, callback) => { const chunks: Buffer[] = []; response.on("data", (chunk) => chunks.push(Buffer.from(chunk))); response.on("end", () => callback(null, Buffer.concat(chunks))); });
    expect(pdf.status).toBe(200); expect(pdf.headers["content-type"]).toContain("application/pdf"); expect(Buffer.from(pdf.body).subarray(0, 4).toString()).toBe("%PDF");
    const removed = await request(app).delete(`/api/v1/admin/expenses/${expenseId}`).set("Authorization", `Bearer ${accessToken}`); expect(removed.status).toBe(200); expenseId = 0;
  });
});
