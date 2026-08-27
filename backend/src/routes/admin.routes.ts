import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { requireAdmin, requireRole } from "../middleware/auth.js";
import { audit } from "../services/audit.js";
import { deleteStoredImage, storeProductImage, storeTeamImage } from "../services/image-storage.js";
import { getDatabaseMaintenanceStatus, runSafeDatabaseCleanup } from "../services/database-maintenance.js";
import { createExpenseReportPdf } from "../services/expense-pdf.js";
import { sendInquiryEmails } from "../services/email.js";
import { AppError, asyncHandler } from "../utils/http.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, callback) => callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
});

const nullableUrl = z.string().url().startsWith("https://").nullable().optional();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const categorySchema = z.object({ name: z.string().min(2).max(120), slug, description: z.string().max(2000).nullable().optional(), imageUrl: nullableUrl, displayOrder: z.number().int().default(0), isActive: z.boolean().default(true) });
const productSchema = z.object({ sku: z.string().min(2).max(80), name: z.string().min(2).max(200), slug, shortDescription: z.string().max(500).nullable().optional(), description: z.string().min(10).max(20000), fragrance: z.string().max(120).nullable().optional(), waxType: z.string().max(120).nullable().optional(), colour: z.string().max(80).nullable().optional(), size: z.string().max(80).nullable().optional(), weight: z.string().max(80).nullable().optional(), burnTime: z.string().max(80).nullable().optional(), price: z.number().positive(), compareAtPrice: z.number().positive().nullable().optional(), stockQuantity: z.number().int().min(0), lowStockThreshold: z.number().int().min(0).default(5), categoryId: z.number().int().positive(), amazonUrl: nullableUrl.refine((value) => !value || /amazon\.|amzn\./i.test(value), "Use a valid Amazon URL"), isFeatured: z.boolean().default(false), isBestSeller: z.boolean().default(false), isNewArrival: z.boolean().default(false), isCustomisable: z.boolean().default(false), isBulkAvailable: z.boolean().default(false), bulkMOQ: z.number().int().positive().nullable().optional(), bulkUnit: z.string().max(40).nullable().optional(), bulkStartingPrice: z.number().positive().nullable().optional(), bulkPriceVisible: z.boolean().default(false), bulkDescription: z.string().max(2000).nullable().optional(), customPackagingAvailable: z.boolean().default(false), customColourAvailable: z.boolean().default(false), customFragranceAvailable: z.boolean().default(false), customBrandingAvailable: z.boolean().default(false), giftMessageAvailable: z.boolean().default(false), eventBrandingAvailable: z.boolean().default(false), ribbonTagsAvailable: z.boolean().default(false), whatsappAvailable: z.boolean().default(true), isActive: z.boolean().default(false), seoTitle: z.string().max(200).nullable().optional(), seoDescription: z.string().max(500).nullable().optional() });

const teamSchema = z.object({ name: z.string().trim().min(2).max(150), designation: z.string().trim().min(2).max(200), description: z.string().trim().min(10).max(10000), displayOrder: z.number().int().min(0).default(0), isFounder: z.boolean().default(false), isActive: z.boolean().default(true) });
const bulkSchema = z.object({ isBulkAvailable: z.boolean(), bulkMOQ: z.number().int().positive().nullable(), bulkUnit: z.string().trim().max(40).nullable(), bulkStartingPrice: z.number().positive().nullable(), bulkPriceVisible: z.boolean(), bulkDescription: z.string().max(2000).nullable(), customPackagingAvailable: z.boolean(), customColourAvailable: z.boolean(), customFragranceAvailable: z.boolean(), customBrandingAvailable: z.boolean(), giftMessageAvailable: z.boolean(), eventBrandingAvailable: z.boolean(), ribbonTagsAvailable: z.boolean(), whatsappAvailable: z.boolean() });
const pricingTierSchema = z.object({ minimumQuantity: z.number().int().positive(), maximumQuantity: z.number().int().positive().nullable().optional(), pricePerUnit: z.number().positive(), isActive: z.boolean().default(true) }).refine((value) => !value.maximumQuantity || value.maximumQuantity >= value.minimumQuantity, { message: "Maximum quantity must be greater than or equal to minimum quantity", path: ["maximumQuantity"] });

const productData = (input: z.infer<typeof productSchema>) => ({ ...input, discountPercentage: input.compareAtPrice && input.compareAtPrice > input.price ? Math.round(((input.compareAtPrice - input.price) / input.compareAtPrice) * 10000) / 100 : 0, stockStatus: input.stockQuantity === 0 ? "OUT_OF_STOCK" : input.stockQuantity <= input.lowStockThreshold ? "LOW_STOCK" : "IN_STOCK" });

adminRouter.get("/dashboard", asyncHandler(async (_req, res) => {
  const [totalProducts, activeProducts, categories, lowStock, outOfStock, bulkProducts, newInquiries, contactInquiries, productInquiries, bulkInquiries, corporateInquiries, amazonClicks, whatsappClicks, recentInquiries, recentProducts, recentBulkRequests] = await prisma.$transaction([
    prisma.product.count({ where: { deletedAt: null } }), prisma.product.count({ where: { isActive: true, deletedAt: null } }), prisma.category.count({ where: { isActive: true } }), prisma.product.count({ where: { stockQuantity: { gt: 0, lte: 5 }, deletedAt: null } }), prisma.product.count({ where: { stockQuantity: 0, deletedAt: null } }), prisma.product.count({ where: { isBulkAvailable: true, deletedAt: null } }), prisma.inquiry.count({ where: { status: "NEW" } }), prisma.inquiry.count({ where: { source: "WEBSITE_CONTACT", status: "NEW" } }), prisma.inquiry.count({ where: { inquiryType: "PRODUCT", status: "NEW" } }), prisma.inquiry.count({ where: { inquiryType: "BULK_ORDER", status: "NEW" } }), prisma.inquiry.count({ where: { inquiryType: "CORPORATE_GIFTING", status: "NEW" } }), prisma.clickEvent.count({ where: { eventType: "AMAZON" } }), prisma.clickEvent.count({ where: { eventType: "WHATSAPP" } }), prisma.inquiry.findMany({ take: 6, orderBy: { createdAt: "desc" } }), prisma.product.findMany({ where: { deletedAt: null }, take: 6, include: { images: { orderBy: { displayOrder: "asc" } } }, orderBy: { createdAt: "desc" } }), prisma.inquiry.findMany({ where: { inquiryType: "BULK_ORDER" }, take: 6, orderBy: { createdAt: "desc" } })
  ]);
  res.json({ success: true, data: { totalProducts, activeProducts, categories, lowStock, outOfStock, bulkProducts, newInquiries, contactInquiries, productInquiries, bulkInquiries, corporateInquiries, amazonClicks, whatsappClicks, recentInquiries, recentProducts, recentBulkRequests } });
}));

adminRouter.get("/database/storage", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await getDatabaseMaintenanceStatus() });
}));

adminRouter.post("/database/cleanup", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  const result = await runSafeDatabaseCleanup();
  if (!result.allowed) throw new AppError(409, "Database cleanup is available only after storage usage reaches 80%", "CLEANUP_THRESHOLD_NOT_REACHED");
  await audit(req, "DATABASE_CLEANUP", "Database", undefined, result.before.storage, { deleted: result.deleted, storage: result.after.storage });
  res.json({ success: true, data: result });
}));

adminRouter.get("/categories", asyncHandler(async (_req, res) => res.json({ success: true, data: await prisma.category.findMany({ orderBy: { displayOrder: "asc" } }) })));
adminRouter.post("/categories", asyncHandler(async (req, res) => { const input = categorySchema.parse(req.body); const data = await prisma.category.create({ data: input }); await audit(req, "CREATE", "Category", String(data.id), undefined, data); res.status(201).json({ success: true, data }); }));
adminRouter.patch("/categories/:id", asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.category.findUniqueOrThrow({ where: { id } }); const data = await prisma.category.update({ where: { id }, data: categorySchema.partial().parse(req.body) }); await audit(req, "UPDATE", "Category", String(id), previous, data); res.json({ success: true, data }); }));
adminRouter.delete("/categories/:id", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => { const id = Number(req.params.id); if (await prisma.product.count({ where: { categoryId: id, deletedAt: null } })) throw new AppError(409, "Move or delete products in this collection first", "CATEGORY_IN_USE"); const previous = await prisma.category.delete({ where: { id } }); await audit(req, "DELETE", "Category", String(id), previous); res.json({ success: true }); }));

adminRouter.get("/team", asyncHandler(async (_req, res) => res.json({ success: true, data: await prisma.teamMember.findMany({ orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }) })));
adminRouter.post("/team", asyncHandler(async (req, res) => { const input = teamSchema.parse(req.body); const data = await prisma.teamMember.create({ data: input }); await audit(req, "CREATE", "TeamMember", String(data.id), undefined, data); res.status(201).json({ success: true, data }); }));
adminRouter.patch("/team/:id", asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.teamMember.findUniqueOrThrow({ where: { id } }); const input = teamSchema.partial().parse(req.body); const data = await prisma.teamMember.update({ where: { id }, data: input }); await audit(req, "UPDATE", "TeamMember", String(id), previous, data); res.json({ success: true, data }); }));
adminRouter.delete("/team/:id", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.teamMember.findUniqueOrThrow({ where: { id } }); if (previous.profileImageUrl) await deleteStoredImage({ imageUrl: previous.profileImageUrl, cloudinaryPublicId: previous.cloudinaryPublicId }); await prisma.teamMember.delete({ where: { id } }); await audit(req, "DELETE", "TeamMember", String(id), previous); res.json({ success: true }); }));
adminRouter.post("/team/:id/photo", imageUpload.single("image"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id); const member = await prisma.teamMember.findUnique({ where: { id } }); const file = req.file;
  if (!member) throw new AppError(404, "Team member not found", "NOT_FOUND");
  if (!file) throw new AppError(422, "Select a JPG, PNG or WebP image", "IMAGE_REQUIRED");
  const stored = await storeTeamImage(file);
  try { const data = await prisma.teamMember.update({ where: { id }, data: { profileImageUrl: stored.imageUrl, cloudinaryPublicId: stored.cloudinaryPublicId } }); if (member.profileImageUrl) await deleteStoredImage({ imageUrl: member.profileImageUrl, cloudinaryPublicId: member.cloudinaryPublicId }); await audit(req, "UPLOAD_PHOTO", "TeamMember", String(id), member, data); res.json({ success: true, data }); }
  catch (error) { await deleteStoredImage(stored); throw error; }
}));
adminRouter.delete("/team/:id/photo", asyncHandler(async (req, res) => { const id = Number(req.params.id); const member = await prisma.teamMember.findUniqueOrThrow({ where: { id } }); if (member.profileImageUrl) await deleteStoredImage({ imageUrl: member.profileImageUrl, cloudinaryPublicId: member.cloudinaryPublicId }); const data = await prisma.teamMember.update({ where: { id }, data: { profileImageUrl: null, cloudinaryPublicId: null } }); await audit(req, "DELETE_PHOTO", "TeamMember", String(id), member, data); res.json({ success: true, data }); }));

adminRouter.get("/bulk-products", asyncHandler(async (_req, res) => res.json({ success: true, data: await prisma.product.findMany({ where: { deletedAt: null }, include: { category: true, images: { orderBy: { displayOrder: "asc" } }, bulkPricingTiers: { orderBy: { minimumQuantity: "asc" } } }, orderBy: { updatedAt: "desc" } }) })));
adminRouter.patch("/bulk-products/:id", asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.product.findUniqueOrThrow({ where: { id } }); const input = bulkSchema.partial().parse(req.body); const data = await prisma.product.update({ where: { id }, data: input }); await audit(req, "UPDATE_BULK", "Product", String(id), previous, data); res.json({ success: true, data }); }));
adminRouter.post("/bulk-products/:id/pricing", asyncHandler(async (req, res) => { const productId = Number(req.params.id); const input = pricingTierSchema.parse(req.body); const data = await prisma.bulkPricingTier.create({ data: { ...input, productId } }); await audit(req, "CREATE", "BulkPricingTier", String(data.id), undefined, data); res.status(201).json({ success: true, data }); }));
adminRouter.patch("/bulk-pricing/:id", asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.bulkPricingTier.findUniqueOrThrow({ where: { id } }); const input = pricingTierSchema.partial().parse(req.body); const data = await prisma.bulkPricingTier.update({ where: { id }, data: input }); await audit(req, "UPDATE", "BulkPricingTier", String(id), previous, data); res.json({ success: true, data }); }));
adminRouter.delete("/bulk-pricing/:id", asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.bulkPricingTier.delete({ where: { id } }); await audit(req, "DELETE", "BulkPricingTier", String(id), previous); res.json({ success: true }); }));

adminRouter.get("/products", asyncHandler(async (req, res) => { const deleted = req.query.deleted === "true"; const data = await prisma.product.findMany({ where: { deletedAt: deleted ? { not: null } : null }, include: { category: true, images: true }, orderBy: { updatedAt: "desc" } }); res.json({ success: true, data }); }));
adminRouter.get("/products/:id", asyncHandler(async (req, res) => { const data = await prisma.product.findUnique({ where: { id: Number(req.params.id) }, include: { category: true, images: true } }); if (!data) throw new AppError(404, "Product not found"); res.json({ success: true, data }); }));
adminRouter.post("/products", asyncHandler(async (req, res) => { const input = productSchema.parse(req.body); const data = await prisma.product.create({ data: productData(input) }); await audit(req, "CREATE", "Product", String(data.id), undefined, data); res.status(201).json({ success: true, data }); }));
adminRouter.patch("/products/:id", asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.product.findUniqueOrThrow({ where: { id } }); const compareAtPrice = req.body.compareAtPrice === undefined ? previous.compareAtPrice === null ? null : Number(previous.compareAtPrice) : req.body.compareAtPrice === null ? null : Number(req.body.compareAtPrice); const bulkStartingPrice = req.body.bulkStartingPrice === undefined ? previous.bulkStartingPrice === null ? null : Number(previous.bulkStartingPrice) : req.body.bulkStartingPrice === null ? null : Number(req.body.bulkStartingPrice); const merged = productSchema.parse({ ...previous, ...req.body, price: Number(req.body.price ?? previous.price), compareAtPrice, bulkStartingPrice, stockQuantity: Number(req.body.stockQuantity ?? previous.stockQuantity) }); const data = await prisma.product.update({ where: { id }, data: productData(merged) }); await audit(req, "UPDATE", "Product", String(id), previous, data); res.json({ success: true, data }); }));
adminRouter.delete("/products/:id", asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }); await audit(req, "SOFT_DELETE", "Product", String(id), previous); res.json({ success: true }); }));
adminRouter.post("/products/:id/duplicate", asyncHandler(async (req, res) => { const source = await prisma.product.findUniqueOrThrow({ where: { id: Number(req.params.id) } }); const stamp = Date.now().toString().slice(-8); const copy: Record<string, unknown> = { ...source }; delete copy.id; delete copy.createdAt; delete copy.updatedAt; const data = await prisma.product.create({ data: { ...copy, sku: `${source.sku.slice(0, 68)}-COPY-${stamp}`, slug: `${source.slug.slice(0, 200)}-copy-${stamp}`, name: `${source.name} Copy`, isActive: false, deletedAt: null } as any }); await audit(req, "DUPLICATE", "Product", String(data.id), source, data); res.status(201).json({ success: true, data }); }));
adminRouter.post("/products/:id/restore", asyncHandler(async (req, res) => { const id = Number(req.params.id); const data = await prisma.product.update({ where: { id }, data: { deletedAt: null } }); await audit(req, "RESTORE", "Product", String(id), undefined, data); res.json({ success: true, data }); }));

adminRouter.post("/products/:id/images", imageUpload.array("images", 8), asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { images: true } });
  if (!product || product.deletedAt) throw new AppError(404, "Product not found", "NOT_FOUND");
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw new AppError(422, "Select at least one JPG, PNG or WebP image", "IMAGE_REQUIRED");
  const primaryIndex = z.coerce.number().int().min(0).default(0).parse(req.body.primaryIndex ?? 0);
  const requestedAltText = z.string().trim().max(255).optional().parse(req.body.altText);
  if (primaryIndex >= files.length) throw new AppError(422, "Primary image selection is invalid", "INVALID_PRIMARY_IMAGE");

  const stored: Awaited<ReturnType<typeof storeProductImage>>[] = [];
  try {
    for (const file of files) stored.push(await storeProductImage(file));
    const shouldReplacePrimary = req.body.replacePrimary === "true" || !product.images.some((image) => image.isPrimary);
    const firstOrder = product.images.reduce((max, image) => Math.max(max, image.displayOrder), -1) + 1;
    await prisma.$transaction(async (transaction) => {
      if (shouldReplacePrimary) await transaction.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
      for (const [index, image] of stored.entries()) {
        await transaction.productImage.create({ data: { productId, ...image, altText: requestedAltText || `${product.name} product image ${firstOrder + index + 1}`, displayOrder: firstOrder + index, isPrimary: shouldReplacePrimary && index === primaryIndex } });
      }
    });
  } catch (error) {
    await Promise.allSettled(stored.map(deleteStoredImage));
    throw error;
  }
  const data = await prisma.productImage.findMany({ where: { productId }, orderBy: { displayOrder: "asc" } });
  await audit(req, "UPLOAD_IMAGES", "Product", String(productId), undefined, { imageIds: data.map((image) => image.id) });
  res.status(201).json({ success: true, data });
}));

adminRouter.delete("/products/:id/images/:imageId", asyncHandler(async (req, res) => {
  const productId = Number(req.params.id); const imageId = Number(req.params.imageId);
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw new AppError(404, "Image not found", "NOT_FOUND");
  await deleteStoredImage(image);
  await prisma.productImage.delete({ where: { id: imageId } });
  if (image.isPrimary) {
    const next = await prisma.productImage.findFirst({ where: { productId }, orderBy: { displayOrder: "asc" } });
    if (next) await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  await audit(req, "DELETE_IMAGE", "Product", String(productId), image);
  res.json({ success: true });
}));

adminRouter.patch("/products/:id/images/reorder", asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const input = z.object({ imageIds: z.array(z.number().int().positive()).min(1).max(20), primaryImageId: z.number().int().positive().optional() }).parse(req.body);
  const existing = await prisma.productImage.findMany({ where: { productId } });
  if (existing.length !== input.imageIds.length || !existing.every((image) => input.imageIds.includes(image.id))) throw new AppError(422, "Image order does not match this product", "INVALID_IMAGE_ORDER");
  if (input.primaryImageId && !input.imageIds.includes(input.primaryImageId)) throw new AppError(422, "Primary image is invalid", "INVALID_PRIMARY_IMAGE");
  await prisma.$transaction(input.imageIds.map((id, displayOrder) => prisma.productImage.update({ where: { id }, data: { displayOrder, isPrimary: input.primaryImageId ? id === input.primaryImageId : undefined } })));
  const data = await prisma.productImage.findMany({ where: { productId }, orderBy: { displayOrder: "asc" } });
  await audit(req, "REORDER_IMAGES", "Product", String(productId), existing, data);
  res.json({ success: true, data });
}));

const inquiryAdminSchema = z.object({
  customerName: z.string().trim().min(2).max(150).optional(),
  phone: z.string().regex(/^[+0-9 ()-]{8,20}$/).optional(),
  email: z.string().email().nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  quantity: z.number().int().positive().max(1000000).nullable().optional(),
  requiredDeliveryDate: z.coerce.date().nullable().optional(),
  budget: z.number().positive().nullable().optional(),
  message: z.string().trim().min(2).max(5000).optional(),
  status: z.enum(["NEW", "CONTACTED", "IN_PROGRESS", "CONVERTED", "CLOSED", "SPAM"]).optional(),
  adminNotes: z.string().max(10000).nullable().optional()
});
adminRouter.get("/inquiries", asyncHandler(async (req, res) => { const status = typeof req.query.status === "string" ? req.query.status : undefined; const data = await prisma.inquiry.findMany({ where: status ? { status } : {}, include: { product: { select: { name: true, sku: true } } }, orderBy: { createdAt: "desc" } }); res.json({ success: true, data }); }));
adminRouter.get("/inquiries/:id", asyncHandler(async (req, res) => { const data = await prisma.inquiry.findUnique({ where: { id: Number(req.params.id) }, include: { product: { select: { name: true, sku: true } } } }); if (!data) throw new AppError(404, "Inquiry not found", "NOT_FOUND"); res.json({ success: true, data }); }));
adminRouter.patch("/inquiries/:id", asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.inquiry.findUniqueOrThrow({ where: { id } }); const input = inquiryAdminSchema.parse(req.body); const data = await prisma.inquiry.update({ where: { id }, data: input }); await audit(req, "UPDATE", "Inquiry", String(id), previous, data); res.json({ success: true, data }); }));
adminRouter.delete("/inquiries/:id", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.inquiry.delete({ where: { id } }); await audit(req, "DELETE", "Inquiry", String(id), previous); res.json({ success: true }); }));
adminRouter.post("/inquiries/:id/retry-notification", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => { const id = Number(req.params.id); const inquiry = await prisma.inquiry.findUniqueOrThrow({ where: { id } }); await sendInquiryEmails(inquiry); const data = await prisma.inquiry.update({ where: { id }, data: { emailNotificationSent: true } }); await audit(req, "RETRY_NOTIFICATION", "Inquiry", String(id), inquiry, data); res.json({ success: true, data }); }));

const faqSchema = z.object({ question: z.string().trim().min(5).max(500), answer: z.string().trim().min(5).max(10000), displayOrder: z.number().int().min(0).max(10000), isActive: z.boolean() });
adminRouter.get("/faqs", asyncHandler(async (_req, res) => res.json({ success: true, data: await prisma.fAQ.findMany({ orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }) })));
adminRouter.post("/faqs", asyncHandler(async (req, res) => { const data = await prisma.fAQ.create({ data: faqSchema.parse(req.body) }); await audit(req, "CREATE", "FAQ", String(data.id), undefined, data); res.status(201).json({ success: true, data }); }));
adminRouter.patch("/faqs/:id", asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.fAQ.findUniqueOrThrow({ where: { id } }); const data = await prisma.fAQ.update({ where: { id }, data: faqSchema.partial().parse(req.body) }); await audit(req, "UPDATE", "FAQ", String(id), previous, data); res.json({ success: true, data }); }));
adminRouter.delete("/faqs/:id", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.fAQ.delete({ where: { id } }); await audit(req, "DELETE", "FAQ", String(id), previous); res.json({ success: true }); }));

const pageContentSchema = z.object({ pageKey: z.enum(["TERMS", "PRIVACY_POLICY", "SHIPPING_POLICY", "RETURN_REFUND_POLICY"]), title: z.string().trim().min(3).max(200), content: z.string().trim().min(20).max(100000), isPublished: z.boolean() });
adminRouter.get("/content", asyncHandler(async (_req, res) => res.json({ success: true, data: await prisma.pageContent.findMany({ orderBy: { pageKey: "asc" } }) })));
adminRouter.put("/content/:pageKey", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => { const pageKey = z.enum(["TERMS", "PRIVACY_POLICY", "SHIPPING_POLICY", "RETURN_REFUND_POLICY"]).parse(String(req.params.pageKey)); const input = pageContentSchema.omit({ pageKey: true }).parse(req.body); const previous = await prisma.pageContent.findUnique({ where: { pageKey } }); const data = await prisma.pageContent.upsert({ where: { pageKey }, create: { pageKey, ...input, updatedById: req.admin!.id }, update: { ...input, updatedById: req.admin!.id } }); await audit(req, "UPSERT", "PageContent", pageKey, previous, data); res.json({ success: true, data }); }));

const expenseInputSchema = z.object({ title: z.string().trim().min(2).max(200), category: z.string().trim().min(2).max(100), subCategory: z.string().trim().max(120).nullable().optional(), expenseType: z.enum(["BUSINESS", "PERSONAL", "REIMBURSABLE", "CAPITAL"]).default("BUSINESS"), quantity: z.number().positive().max(9999999999).default(1), unitCost: z.number().min(0).max(9999999999).default(0), baseAmount: z.number().min(0).max(9999999999).default(0), amount: z.number().positive().max(9999999999), gstPercent: z.number().min(0).max(100).default(0), gstAmount: z.number().min(0).max(9999999999).default(0), discountAmount: z.number().min(0).max(9999999999).default(0), paymentStatus: z.enum(["PAID", "UNPAID", "PARTIAL"]).default("PAID"), expenseDate: z.coerce.date(), dueDate: z.coerce.date().nullable().optional(), vendor: z.string().trim().max(200).nullable().optional(), paymentMethod: z.string().trim().max(80).nullable().optional(), referenceNumber: z.string().trim().max(120).nullable().optional(), notes: z.string().trim().max(2000).nullable().optional(), receiptUrl: nullableUrl });
const expenseQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  category: z.string().max(100).optional(),
  paymentStatus: z.enum(["PAID", "UNPAID", "PARTIAL"]).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25)
});
const expenseReportQuerySchema = z.object({ year: z.coerce.number().int().min(2020).max(2100).default(new Date().getFullYear()), quarter: z.coerce.number().int().min(1).max(4).transform((value) => value as 1 | 2 | 3 | 4).default((Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4) });
const expenseWhere = (query: z.infer<typeof expenseQuerySchema>) => ({
  ...(query.category ? { category: query.category } : {}),
  ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
  ...(query.search ? { OR: [{ expenseNumber: { contains: query.search } }, { title: { contains: query.search } }, { vendor: { contains: query.search } }, { referenceNumber: { contains: query.search } }] } : {}),
  ...(query.from || query.to ? { expenseDate: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: new Date(new Date(query.to).setHours(23, 59, 59, 999)) } : {}) } } : {})
});

adminRouter.get("/expenses", asyncHandler(async (req, res) => {
  const query = expenseQuerySchema.parse(req.query); const where = expenseWhere(query); const skip = (query.page - 1) * query.pageSize;
  const [data, aggregate, grouped] = await prisma.$transaction([
    prisma.expense.findMany({ where, include: { createdBy: { select: { name: true } } }, orderBy: [{ expenseDate: "desc" }, { id: "desc" }], skip, take: query.pageSize }),
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({ by: ["category"], where, _sum: { amount: true }, _count: true, orderBy: { _sum: { amount: "desc" } } })
  ]);
  const totalPages = Math.max(1, Math.ceil(aggregate._count / query.pageSize));
  res.json({ success: true, data: { expenses: data, total: Number(aggregate._sum.amount ?? 0), count: aggregate._count, categories: grouped.map((item) => ({ category: item.category, total: Number(item._sum?.amount ?? 0), count: item._count })), pagination: { page: query.page, pageSize: query.pageSize, totalPages, hasPrevious: query.page > 1, hasNext: query.page < totalPages } } });
}));
adminRouter.get("/expenses/dashboard", asyncHandler(async (req, res) => {
  const year = z.coerce.number().int().min(2020).max(2100).default(new Date().getFullYear()).parse(req.query.year);
  const from = new Date(year, 0, 1); const to = new Date(year + 1, 0, 1);
  type SummaryRow = { total: unknown; paid: unknown; unpaid: unknown; partial: unknown; totalGst: unknown; count: unknown; average: unknown; highest: unknown };
  type MonthlyRow = { month: unknown; total: unknown; gst: unknown; paid: unknown; unpaid: unknown; partial: unknown };
  type CategoryRow = { category: string; total: unknown };
  const [summaryRows, monthlyRows, categoryRows] = await prisma.$transaction([
    prisma.$queryRaw<SummaryRow[]>`SELECT COALESCE(SUM([amount]), 0) AS [total], COALESCE(SUM(CASE WHEN [paymentStatus] = 'PAID' THEN [amount] ELSE 0 END), 0) AS [paid], COALESCE(SUM(CASE WHEN [paymentStatus] = 'UNPAID' THEN [amount] ELSE 0 END), 0) AS [unpaid], COALESCE(SUM(CASE WHEN [paymentStatus] = 'PARTIAL' THEN [amount] ELSE 0 END), 0) AS [partial], COALESCE(SUM([gstAmount]), 0) AS [totalGst], COUNT_BIG(*) AS [count], COALESCE(AVG([amount]), 0) AS [average], COALESCE(MAX([amount]), 0) AS [highest] FROM [Expense] WHERE [expenseDate] >= ${from} AND [expenseDate] < ${to}`,
    prisma.$queryRaw<MonthlyRow[]>`SELECT DATEPART(MONTH, [expenseDate]) - 1 AS [month], SUM([amount]) AS [total], SUM([gstAmount]) AS [gst], SUM(CASE WHEN [paymentStatus] = 'PAID' THEN [amount] ELSE 0 END) AS [paid], SUM(CASE WHEN [paymentStatus] = 'UNPAID' THEN [amount] ELSE 0 END) AS [unpaid], SUM(CASE WHEN [paymentStatus] = 'PARTIAL' THEN [amount] ELSE 0 END) AS [partial] FROM [Expense] WHERE [expenseDate] >= ${from} AND [expenseDate] < ${to} GROUP BY DATEPART(MONTH, [expenseDate])`,
    prisma.$queryRaw<CategoryRow[]>`SELECT [category], SUM([amount]) AS [total] FROM [Expense] WHERE [expenseDate] >= ${from} AND [expenseDate] < ${to} GROUP BY [category] ORDER BY SUM([amount]) DESC`
  ]);
  const monthly = Array.from({ length: 12 }, (_, month) => ({ month, total: 0, gst: 0, paid: 0, unpaid: 0, partial: 0 }));
  for (const row of monthlyRows) { const bucket = monthly[Number(row.month)]; if (bucket) Object.assign(bucket, { total: Number(row.total), gst: Number(row.gst), paid: Number(row.paid), unpaid: Number(row.unpaid), partial: Number(row.partial) }); }
  const summary = summaryRows[0];
  res.json({ success: true, data: { year, total: Number(summary?.total ?? 0), paid: Number(summary?.paid ?? 0), unpaid: Number(summary?.unpaid ?? 0), partial: Number(summary?.partial ?? 0), totalGst: Number(summary?.totalGst ?? 0), count: Number(summary?.count ?? 0), average: Number(summary?.average ?? 0), highest: Number(summary?.highest ?? 0), monthly, categories: categoryRows.map((row) => ({ category: row.category, total: Number(row.total) })) } });
}));
adminRouter.post("/expenses", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => { const input = expenseInputSchema.parse(req.body); const data = await prisma.expense.create({ data: { ...input, expenseNumber: `DIVA-EXP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, createdByAdminId: req.admin!.id } }); await audit(req, "CREATE", "Expense", String(data.id), undefined, data); res.status(201).json({ success: true, data }); }));
adminRouter.patch("/expenses/:id", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.expense.findUniqueOrThrow({ where: { id } }); const input = expenseInputSchema.partial().parse(req.body); const data = await prisma.expense.update({ where: { id }, data: input }); await audit(req, "UPDATE", "Expense", String(id), previous, data); res.json({ success: true, data }); }));
adminRouter.delete("/expenses/:id", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => { const id = Number(req.params.id); const previous = await prisma.expense.delete({ where: { id } }); await audit(req, "DELETE", "Expense", String(id), previous); res.json({ success: true }); }));
adminRouter.get("/expenses/report.pdf", asyncHandler(async (req, res) => {
  const query = expenseReportQuerySchema.parse(req.query); const from = new Date(query.year, (query.quarter - 1) * 3, 1); const to = new Date(query.year, query.quarter * 3, 1);
  type ReportRow = { category: string; month: unknown; amount: unknown; recordCount: unknown };
  const grouped = await prisma.$queryRaw<ReportRow[]>`SELECT [category], DATEPART(MONTH, [expenseDate]) AS [month], SUM([amount]) AS [amount], COUNT_BIG(*) AS [recordCount] FROM [Expense] WHERE [expenseDate] >= ${from} AND [expenseDate] < ${to} GROUP BY [category], DATEPART(MONTH, [expenseDate]) ORDER BY [category], DATEPART(MONTH, [expenseDate])`;
  const recordCount = grouped.reduce((sum, item) => sum + Number(item.recordCount), 0);
  const pdf = await createExpenseReportPdf({ year: query.year, quarter: query.quarter, recordCount, rows: grouped.map((item, index) => ({ expenseNumber: `SUMMARY-${index + 1}`, title: item.category, category: item.category, amount: Number(item.amount), expenseDate: new Date(query.year, Number(item.month) - 1, 1) })) });
  res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `attachment; filename="diva-expense-report-${query.year}-q${query.quarter}.pdf"`); res.send(pdf);
}));

adminRouter.get("/settings", asyncHandler(async (_req, res) => res.json({ success: true, data: await prisma.siteSettings.findUnique({ where: { id: 1 } }) })));
adminRouter.patch("/settings", requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => { const input = z.object({ brandName: z.string().min(2).max(120).optional(), logoUrl: nullableUrl, faviconUrl: nullableUrl, phone: z.string().max(30).optional(), whatsappNumber: z.string().max(30).optional(), notificationEmail: z.string().email().optional(), address: z.string().max(500).nullable().optional(), businessHours: z.string().max(500).nullable().optional(), googleMapsUrl: nullableUrl, instagramUrl: nullableUrl, facebookUrl: nullableUrl, youtubeUrl: nullableUrl, linkedinUrl: nullableUrl, amazonStoreUrl: nullableUrl, amazonStoreEnabled: z.boolean().optional(), seoTitle: z.string().max(160).nullable().optional(), seoDescription: z.string().max(500).nullable().optional(), homepageHeroTitle: z.string().max(240).nullable().optional(), homepageHeroText: z.string().max(1000).nullable().optional(), currency: z.string().max(10).optional(), taxPercentage: z.number().min(0).max(100).optional(), paymentEnabled: z.boolean().optional(), razorpayEnabled: z.boolean().optional(), whatsappApiEnabled: z.boolean().optional(), maintenanceMode: z.boolean().optional() }).parse(req.body); const previous = await prisma.siteSettings.findUnique({ where: { id: 1 } }); const data = await prisma.siteSettings.upsert({ where: { id: 1 }, create: { id: 1, ...input }, update: input }); await audit(req, "UPDATE", "SiteSettings", "1", previous, data); res.json({ success: true, data }); }));

adminRouter.get("/audit-logs", asyncHandler(async (_req, res) => res.json({ success: true, data: await prisma.auditLog.findMany({ take: 200, include: { adminUser: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } }) })));
