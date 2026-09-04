import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { db } from "../src/config/database.js";
import { signToken } from "../src/utils/auth.js";

describe("safe application log cleanup", () => {
  let adminToken = "";
  let viewerToken = "";

  beforeAll(async () => {
    const admin = await db.adminUser.findFirstOrThrow({ where: { isActive: true } });
    adminToken = signToken(admin.id, admin.email, admin.role, "access");
    viewerToken = signToken(admin.id, admin.email, "VIEWER", "access");
    await db.applicationLog.create({ data: { level: "error", message: "old test log", createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) } });
  });

  afterAll(async () => {
    await db.applicationLog.deleteMany({ where: { message: "old test log" } });
    await db.$disconnect();
  });

  it("rejects unauthenticated and non-admin callers", async () => {
    expect((await request(app).post("/api/v1/admin/logs/cleanup")).status).toBe(401);
    expect((await request(app).post("/api/v1/admin/logs/cleanup").set("Authorization", `Bearer ${viewerToken}`)).status).toBe(403);
  });

  it("allows admins to delete only expired application logs", async () => {
    const productCountBefore = await db.product.count();
    const response = await request(app).post("/api/v1/admin/logs/cleanup").set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.deletedLogs).toBeGreaterThanOrEqual(1);
    expect(await db.applicationLog.findFirst({ where: { message: "old test log" } })).toBeNull();
    expect(await db.product.count()).toBe(productCountBefore);
  });
});
