import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { signToken } from "../src/utils/auth.js";

const createdIds: number[] = [];

beforeAll(async () => { await prisma.inquiry.deleteMany({ where: { email: "contact-test@example.com" } }); });

afterAll(async () => {
  if (createdIds.length) await prisma.inquiry.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});

describe("contact, FAQ and policy flows", () => {
  it("normalizes and saves a contact inquiry before returning a WhatsApp continuation", async () => {
    const response = await request(app).post("/api/v1/contact-inquiries").send({ customerName: "Contact Test", phone: "+91 84218 69308", email: "contact-test@example.com", message: "Please contact me about a DIVA candle inquiry." });
    expect(response.status).toBe(201); expect(response.body.data.inquiryNumber).toMatch(/^DIVA-CONTACT-\d{4}-\d{5,}$/); expect(response.body.data.whatsappUrl).toContain("wa.me/918421869308");
    const saved = await prisma.inquiry.findUnique({ where: { inquiryNumber: response.body.data.inquiryNumber } }); expect(saved).toMatchObject({ inquiryType: "GENERAL", source: "WEBSITE_CONTACT", status: "NEW", phone: "+918421869308" }); createdIds.push(saved!.id);
    const admin = await prisma.adminUser.findFirstOrThrow({ where: { isActive: true } }); const authorization = `Bearer ${signToken(admin.id, admin.email, admin.role, "access")}`;
    const [inquiries, dashboard] = await Promise.all([request(app).get("/api/v1/admin/inquiries").set("Authorization", authorization), request(app).get("/api/v1/admin/dashboard").set("Authorization", authorization)]);
    expect(inquiries.status).toBe(200); expect(inquiries.body.data.some((item: { inquiryNumber: string }) => item.inquiryNumber === response.body.data.inquiryNumber)).toBe(true); expect(dashboard.status).toBe(200); expect(dashboard.body.data.contactInquiries).toBeGreaterThan(0);
  }, 15000);

  it("rejects a non-Indian mobile number", async () => { const response = await request(app).post("/api/v1/contact-inquiries").send({ customerName: "Contact Test", phone: "12345", message: "Please call me" }); expect(response.status).toBe(422); });
  it("serves database-managed FAQs and policies", async () => { const [faqs, policy] = await Promise.all([request(app).get("/api/v1/faqs"), request(app).get("/api/v1/content/PRIVACY_POLICY")]); expect(faqs.status).toBe(200); expect(faqs.body.data.length).toBeGreaterThan(0); expect(policy.status).toBe(200); expect(policy.body.data.title).toBe("Privacy Policy"); });
  it("allows an administrator to manage FAQs and policy content", async () => {
    const admin = await prisma.adminUser.findFirstOrThrow({ where: { isActive: true } }); const authorization = `Bearer ${signToken(admin.id, admin.email, admin.role, "access")}`;
    const created = await request(app).post("/api/v1/admin/faqs").set("Authorization", authorization).send({ question: "Temporary management test question?", answer: "Temporary management test answer.", displayOrder: 9999, isActive: false }); expect(created.status).toBe(201);
    const updated = await request(app).patch(`/api/v1/admin/faqs/${created.body.data.id}`).set("Authorization", authorization).send({ answer: "Updated temporary management test answer." }); expect(updated.status).toBe(200);
    const removed = await request(app).delete(`/api/v1/admin/faqs/${created.body.data.id}`).set("Authorization", authorization); expect(removed.status).toBe(200);
    const current = await prisma.pageContent.findUniqueOrThrow({ where: { pageKey: "TERMS" } }); const saved = await request(app).put("/api/v1/admin/content/TERMS").set("Authorization", authorization).send({ title: current.title, content: current.content, isPublished: current.isPublished }); expect(saved.status).toBe(200);
  });
});
