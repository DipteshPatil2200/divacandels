import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { sendInquiryEmails } from "../services/email.js";
import { AppError, asyncHandler } from "../utils/http.js";

export const publicRouter = Router();

publicRouter.get("/settings/public", asyncHandler(async (_req, res) => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  res.json({ success: true, data: settings });
}));

publicRouter.get("/team", asyncHandler(async (_req, res) => {
  const data = await prisma.teamMember.findMany({ where: { isActive: true }, orderBy: [{ isFounder: "desc" }, { displayOrder: "asc" }, { id: "asc" }] });
  res.json({ success: true, data });
}));

publicRouter.get("/faqs", asyncHandler(async (_req, res) => {
  const data = await prisma.fAQ.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
  res.json({ success: true, data });
}));

publicRouter.get("/content/:pageKey", asyncHandler(async (req, res) => {
  const pageKey = z.enum(["TERMS", "PRIVACY_POLICY", "SHIPPING_POLICY", "RETURN_REFUND_POLICY"]).parse(String(req.params.pageKey));
  const data = await prisma.pageContent.findFirst({ where: { pageKey, isPublished: true }, select: { pageKey: true, title: true, content: true, updatedAt: true } });
  if (!data) throw new AppError(404, "This policy is not published", "NOT_FOUND");
  res.json({ success: true, data });
}));

publicRouter.get("/categories", asyncHandler(async (_req, res) => {
  const data = await prisma.category.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
  res.json({ success: true, data });
}));

publicRouter.get("/categories/:slug", asyncHandler(async (req, res) => {
  const data = await prisma.category.findFirst({ where: { slug: String(req.params.slug), isActive: true }, include: { products: { where: { isActive: true, deletedAt: null }, include: { images: true } } } });
  if (!data) throw new AppError(404, "Collection not found", "NOT_FOUND");
  res.json({ success: true, data });
}));

const productInclude = { category: true, images: { orderBy: { displayOrder: "asc" as const } } };
const bulkProductInclude = { ...productInclude, bulkPricingTiers: { where: { isActive: true }, orderBy: { minimumQuantity: "asc" as const } } };
publicRouter.get("/products", asyncHandler(async (req, res) => {
  const query = z.object({ q: z.string().optional(), category: z.string().optional(), fragrance: z.string().optional(), stock: z.enum(["in", "out"]).optional(), sort: z.enum(["latest", "price-asc", "price-desc"]).default("latest"), page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(48).default(12) }).parse(req.query);
  const where = { isActive: true, deletedAt: null, ...(query.q ? { OR: [{ name: { contains: query.q } }, { description: { contains: query.q } }] } : {}), ...(query.category ? { category: { slug: query.category } } : {}), ...(query.fragrance ? { fragrance: query.fragrance } : {}), ...(query.stock ? { stockQuantity: query.stock === "in" ? { gt: 0 } : { equals: 0 } } : {}) };
  const orderBy = query.sort === "price-asc" ? { price: "asc" as const } : query.sort === "price-desc" ? { price: "desc" as const } : { createdAt: "desc" as const };
  const [data, total] = await prisma.$transaction([prisma.product.findMany({ where, include: productInclude, orderBy, skip: (query.page - 1) * query.limit, take: query.limit }), prisma.product.count({ where })]);
  res.json({ success: true, data, meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } });
}));

for (const [path, flag] of [["featured", "isFeatured"], ["best-sellers", "isBestSeller"], ["new-arrivals", "isNewArrival"]] as const) {
  publicRouter.get(`/products/${path}`, asyncHandler(async (_req, res) => {
    const data = await prisma.product.findMany({ where: { isActive: true, deletedAt: null, [flag]: true }, include: productInclude, take: 8, orderBy: { updatedAt: "desc" } });
    res.json({ success: true, data });
  }));
}

publicRouter.get("/products/:slug", asyncHandler(async (req, res) => {
  const data = await prisma.product.findFirst({ where: { slug: String(req.params.slug), isActive: true, deletedAt: null }, include: productInclude });
  if (!data) throw new AppError(404, "Product not found", "NOT_FOUND");
  res.json({ success: true, data });
}));

publicRouter.get("/bulk-products", asyncHandler(async (_req, res) => {
  const data = await prisma.product.findMany({ where: { isActive: true, isBulkAvailable: true, deletedAt: null }, include: bulkProductInclude, orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }] });
  res.json({ success: true, data });
}));

publicRouter.post("/stock-reservations", asyncHandler(async (req, res) => {
  const input = z.object({ clientToken: z.string().min(16).max(80), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(1000) })).min(1).max(20) }).parse(req.body);
  if (new Set(input.items.map((item) => item.productId)).size !== input.items.length) throw new AppError(422, "Each product may appear only once", "DUPLICATE_PRODUCT");
  const data = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.stockReservation.findUnique({ where: { clientToken: input.clientToken } });
    if (existing) return { reservationNumber: existing.reservationNumber, items: JSON.parse(existing.itemsData) as unknown[] };
    const reserved = [] as { productId: number; name: string; quantity: number; remainingStock: number }[];
    for (const item of input.items) {
      const product = await transaction.product.findFirst({ where: { id: item.productId, isActive: true, deletedAt: null }, select: { id: true, name: true, stockQuantity: true } });
      if (!product) throw new AppError(404, "Product is no longer available", "PRODUCT_NOT_FOUND");
      const updated = await transaction.product.updateMany({ where: { id: item.productId, stockQuantity: { gte: item.quantity } }, data: { stockQuantity: { decrement: item.quantity } } });
      if (!updated.count) throw new AppError(409, `Only ${product.stockQuantity} ${product.name} available`, "INSUFFICIENT_STOCK");
      reserved.push({ productId: product.id, name: product.name, quantity: item.quantity, remainingStock: product.stockQuantity - item.quantity });
    }
    const reservationNumber = `DIVA-STOCK-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
    await transaction.stockReservation.create({ data: { reservationNumber, clientToken: input.clientToken, itemsData: JSON.stringify(reserved) } });
    return { reservationNumber, items: reserved };
  });
  res.status(201).json({ success: true, data });
}));

publicRouter.get("/banners", asyncHandler(async (_req, res) => {
  const now = new Date();
  const data = await prisma.banner.findMany({ where: { isActive: true, AND: [{ OR: [{ startDate: null }, { startDate: { lte: now } }] }, { OR: [{ endDate: null }, { endDate: { gte: now } }] }] }, orderBy: { displayOrder: "asc" } });
  res.json({ success: true, data });
}));

publicRouter.get("/testimonials", asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await prisma.testimonial.findMany({ where: { isApproved: true }, orderBy: { displayOrder: "asc" } }) });
}));

const inquirySchema = z.object({ inquiryType: z.enum(["GENERAL", "PRODUCT", "CUSTOM_ORDER", "BULK_ORDER", "CORPORATE_GIFTING", "WEDDING", "EVENT", "OTHER"]).default("GENERAL"), customerName: z.string().trim().min(2).max(150), phone: z.string().regex(/^[+0-9 ()-]{8,20}$/), email: z.string().email().optional().or(z.literal("")), city: z.string().max(120).optional(), productId: z.number().int().positive().optional(), quantity: z.number().int().positive().max(100000).optional(), occasion: z.string().max(160).optional(), preferredContactMethod: z.enum(["PHONE", "WHATSAPP", "EMAIL"]).optional(), message: z.string().trim().min(10).max(5000), website: z.string().max(0).optional() });
const contactInquirySchema = z.object({ customerName: z.string().trim().min(2).max(100), phone: z.string().trim(), email: z.string().trim().email().optional().or(z.literal("")), message: z.string().trim().min(5).max(2000), website: z.string().max(0).optional() }).transform((input, context) => {
  let digits = input.phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (!/^[6-9]\d{9}$/.test(digits)) { context.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid Indian mobile number" }); return z.NEVER; }
  return { ...input, phone: `+91${digits}` };
});

const bulkInquirySchema = z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(1000000), unit: z.string().trim().min(1).max(40), customerName: z.string().trim().min(2).max(150), phone: z.string().regex(/^[+0-9 ()-]{8,20}$/), email: z.string().email().optional().or(z.literal("")), city: z.string().trim().min(2).max(120), requiredDeliveryDate: z.coerce.date(), customisationRequired: z.boolean().default(false), customisationDetails: z.string().max(3000).optional(), budget: z.number().positive().optional(), message: z.string().trim().min(10).max(5000), website: z.string().max(0).optional() });

publicRouter.post("/bulk-inquiries", asyncHandler(async (req, res) => {
  const input = bulkInquirySchema.parse(req.body);
  const product = await prisma.product.findFirst({ where: { id: input.productId, isActive: true, isBulkAvailable: true, deletedAt: null } });
  if (!product) throw new AppError(404, "Bulk product not found", "NOT_FOUND");
  if (product.bulkMOQ && input.quantity < product.bulkMOQ) throw new AppError(422, `Minimum quantity is ${product.bulkMOQ} ${product.bulkUnit ?? "pieces"}`, "BELOW_MOQ");
  const temporaryNumber = `TMP-${crypto.randomUUID()}`;
  const inquiry = await prisma.inquiry.create({ data: { inquiryNumber: temporaryNumber, inquiryType: "BULK_ORDER", customerName: input.customerName, phone: input.phone, email: input.email || null, city: input.city, productId: product.id, quantity: input.quantity, unit: input.unit, requiredDeliveryDate: input.requiredDeliveryDate, customisationRequired: input.customisationRequired, customisationDetails: input.customisationDetails || null, budget: input.budget ?? null, preferredContactMethod: "WHATSAPP", message: input.message, source: "BULK_ORDERS_PAGE" } });
  const inquiryNumber = `DIVA-BULK-${new Date().getFullYear()}-${String(inquiry.id).padStart(5, "0")}`;
  const saved = await prisma.inquiry.update({ where: { id: inquiry.id }, data: { inquiryNumber } });
  let emailSent = false;
  try { await sendInquiryEmails(saved); emailSent = true; } catch (error) { console.error("Bulk inquiry email failed", error); }
  if (emailSent) await prisma.inquiry.update({ where: { id: saved.id }, data: { emailNotificationSent: true } });
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const whatsappMessage = `Hello DIVA Candles,\n\nI would like to request a bulk-order quotation.\n\nInquiry No: ${inquiryNumber}\nProduct: ${product.name}\nQuantity: ${input.quantity} ${input.unit}\nCustomisation: ${input.customisationRequired ? input.customisationDetails || "Required" : "Not required"}\nName: ${input.customerName}\nMobile: ${input.phone}\nCity: ${input.city}\nRequired Date: ${input.requiredDeliveryDate.toLocaleDateString("en-IN")}\n\nPlease share your best quotation and available customisation options.`;
  res.status(201).json({ success: true, data: { inquiryNumber, emailNotificationSent: emailSent, whatsappUrl: `https://wa.me/${settings?.whatsappNumber ?? "918421869308"}?text=${encodeURIComponent(whatsappMessage)}` } });
}));

publicRouter.post("/inquiries", asyncHandler(async (req, res) => {
  const input = inquirySchema.parse(req.body);
  const { website: _honeypot, ...inquiryData } = input;
  const inquiryNumber = `DIVA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const inquiry = await prisma.inquiry.create({ data: { ...inquiryData, email: input.email || null, inquiryNumber } });
  let emailSent = false;
  try { await sendInquiryEmails(inquiry); emailSent = true; } catch (error) { console.error("Inquiry email failed", error); }
  if (emailSent) await prisma.inquiry.update({ where: { id: inquiry.id }, data: { emailNotificationSent: true } });
  res.status(201).json({ success: true, data: { inquiryNumber, emailNotificationSent: emailSent } });
}));

publicRouter.post("/contact-inquiries", asyncHandler(async (req, res) => {
  const input = contactInquirySchema.parse(req.body); const { website: _honeypot, ...contact } = input;
  // Commit the customer message first. The database identity makes the public reference collision-safe.
  const draft = await prisma.inquiry.create({ data: { inquiryNumber: `TMP-${crypto.randomUUID()}`, inquiryType: "GENERAL", customerName: contact.customerName, phone: contact.phone, email: contact.email || null, message: contact.message, status: "NEW", source: "WEBSITE_CONTACT" } });
  const inquiryNumber = `DIVA-CONTACT-${draft.createdAt.getFullYear()}-${String(draft.id).padStart(5, "0")}`;
  const inquiry = await prisma.inquiry.update({ where: { id: draft.id }, data: { inquiryNumber } });
  let emailNotificationSent = false;
  try { await sendInquiryEmails(inquiry); emailNotificationSent = true; await prisma.inquiry.update({ where: { id: inquiry.id }, data: { emailNotificationSent: true } }); }
  catch (error) { console.error(`Contact inquiry notification failed for ${inquiry.inquiryNumber}`, error); }
  const whatsappMessage = `Hello DIVA Candles,\n\nI have submitted an inquiry through your website.\n\nInquiry No: ${inquiry.inquiryNumber}\n\nName: ${inquiry.customerName}\nMobile: ${inquiry.phone}\n\nMessage:\n${inquiry.message}\n\nPlease contact me regarding this inquiry.`;
  res.status(201).json({ success: true, data: { inquiryNumber: inquiry.inquiryNumber, emailNotificationSent, whatsappUrl: `https://wa.me/918421869308?text=${encodeURIComponent(whatsappMessage)}` } });
}));

publicRouter.post("/newsletter/subscribe", asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  await prisma.newsletterSubscriber.upsert({ where: { email: email.toLowerCase() }, create: { email: email.toLowerCase() }, update: { isActive: true, unsubscribedAt: null } });
  res.status(201).json({ success: true });
}));

publicRouter.post("/analytics/click", asyncHandler(async (req, res) => {
  const input = z.object({ eventType: z.enum(["AMAZON", "WHATSAPP"]), productId: z.number().int().optional(), targetUrl: z.string().url().optional() }).parse(req.body);
  await prisma.clickEvent.create({ data: input });
  res.status(201).json({ success: true });
}));
