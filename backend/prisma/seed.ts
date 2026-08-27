import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaMssql({
  server: process.env.DB_SERVER ?? "localhost", port: Number(process.env.DB_PORT ?? 1433), database: process.env.DB_NAME ?? "DivaCandlesDB",
  user: process.env.DB_USER ?? "sa", password: process.env.DB_PASSWORD ?? "CHANGE_ME",
  options: { encrypt: process.env.DB_ENCRYPT !== "false", trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false" }
});
const prisma = new PrismaClient({ adapter });

async function seed() {
  const categorySeeds: Array<[string, string, string]> = [
    ["Sculptural Candles", "sculptural-candles", "Artful silhouettes designed to be admired."],
    ["Festive Collection", "festive-collection", "Warm, celebratory candles for meaningful occasions."],
    ["Gift Sets", "gift-sets", "Thoughtfully paired candle gifts, ready to delight."],
    ["Home Fragrance", "home-fragrance", "Layered fragrances that shape the feeling of home."],
    ["Bulk Collection", "bulk-collection", "Premium handcrafted candles available for larger celebrations and events."]
  ];
  const categories = await Promise.all(categorySeeds.map(([name, slug, description], displayOrder) => prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug, description, displayOrder } })));

  await prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, instagramUrl: "https://www.instagram.com/diva_candles_official?igsh=OXF1NTluNmZnd3g0", youtubeUrl: "https://youtube.com/@diva-07-25?si=Yi_d7oguOqCLMYpV", linkedinUrl: "https://www.linkedin.com/company/diva-candle/" } });
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? "CHANGE_THIS_STRONG_PASSWORD";
  await prisma.adminUser.upsert({ where: { email: (process.env.ADMIN_EMAIL ?? "info.divacandles@gmail.com").toLowerCase() }, update: {}, create: { name: process.env.ADMIN_NAME ?? "DIVA Candles Administrator", email: (process.env.ADMIN_EMAIL ?? "info.divacandles@gmail.com").toLowerCase(), passwordHash: await bcrypt.hash(password, 12), role: "SUPER_ADMIN", mustChangePassword: true } });

  const products: any[] = [
    { sku: "DIVA-SC-001", name: "Moonlit Muse", slug: "moonlit-muse", description: "A sculptural statement candle with soft curves and a serene vanilla-sandalwood character.", shortDescription: "Sculptural calm, warmed by vanilla and sandalwood.", fragrance: "Vanilla & Sandalwood", waxType: "Soy blend", price: 899, compareAtPrice: 1099, stockQuantity: 18, isFeatured: true, isBestSeller: true, categoryId: categories[0]!.id },
    { sku: "DIVA-FS-001", name: "Celebration Glow", slug: "celebration-glow", description: "A festive candle with notes of saffron, amber and rose, hand-finished for gifting.", shortDescription: "Saffron, amber and rose for luminous celebrations.", fragrance: "Saffron & Rose", waxType: "Coconut soy", price: 1299, compareAtPrice: 1499, stockQuantity: 12, isFeatured: true, isNewArrival: true, categoryId: categories[1]!.id },
    { sku: "DIVA-GS-001", name: "The Golden Hour Duo", slug: "golden-hour-duo", description: "Two complementary fragrances presented as an elegant ready-to-gift pairing.", shortDescription: "A polished pairing for thoughtful moments.", fragrance: "Amber & White Tea", waxType: "Soy blend", price: 1699, compareAtPrice: null, stockQuantity: 8, isFeatured: true, categoryId: categories[2]!.id },
    { sku: "DIVA-BULK-001", name: "Pink Lotus Candle", slug: "pink-lotus-candle", description: "A delicate lotus-shaped candle for elegant celebrations and event styling.", shortDescription: "Sculptural lotus candle in a soft blush tone.", fragrance: "Rose Petal", waxType: "Soy blend", price: 299, compareAtPrice: null, stockQuantity: 100, isBulkAvailable: true, bulkMOQ: 25, bulkUnit: "Pieces", bulkStartingPrice: 249, bulkPriceVisible: false, bulkDescription: "Elegant lotus candles handcrafted for weddings, festive tables and premium events.", customPackagingAvailable: true, customColourAvailable: true, customFragranceAvailable: true, categoryId: categories[4]!.id },
    { sku: "DIVA-BULK-002", name: "Rose Candle", slug: "rose-candle", description: "A detailed rose candle created for romantic tablescapes and celebrations.", shortDescription: "Petal-detailed floral candle.", fragrance: "English Rose", waxType: "Soy blend", price: 299, compareAtPrice: null, stockQuantity: 100, isBulkAvailable: true, bulkMOQ: 30, bulkUnit: "Pieces", bulkStartingPrice: 229, bulkPriceVisible: false, customPackagingAvailable: true, customColourAvailable: true, categoryId: categories[4]!.id },
    { sku: "DIVA-BULK-003", name: "Kaju Katli Candle", slug: "kaju-katli-candle", description: "A playful mithai-inspired candle made for festive collections and celebrations.", shortDescription: "Festive mithai-inspired design.", fragrance: "Saffron Almond", waxType: "Soy blend", price: 199, compareAtPrice: null, stockQuantity: 150, isBulkAvailable: true, bulkMOQ: 50, bulkUnit: "Pieces", bulkStartingPrice: 149, bulkPriceVisible: false, customPackagingAvailable: true, customBrandingAvailable: true, categoryId: categories[4]!.id },
    { sku: "DIVA-BULK-004", name: "Dessert Candle", slug: "dessert-candle", description: "A charming dessert-inspired candle with a beautifully finished top.", shortDescription: "A whimsical celebration centrepiece.", fragrance: "Vanilla Cream", waxType: "Coconut soy", price: 399, compareAtPrice: null, stockQuantity: 80, isBulkAvailable: true, bulkMOQ: 20, bulkUnit: "Pieces", bulkStartingPrice: 329, bulkPriceVisible: false, customFragranceAvailable: true, categoryId: categories[4]!.id },
    { sku: "DIVA-BULK-005", name: "Floating Candle", slug: "floating-candle", description: "Compact floating candles for water bowls, event aisles and intimate table settings.", shortDescription: "Soft floating glow for event décor.", fragrance: "Unscented", waxType: "Paraffin blend", price: 99, compareAtPrice: null, stockQuantity: 250, isBulkAvailable: true, bulkMOQ: 50, bulkUnit: "Pieces", bulkStartingPrice: 69, bulkPriceVisible: false, customColourAvailable: true, categoryId: categories[4]!.id },
    { sku: "DIVA-BULK-006", name: "Tea Light Candles", slug: "tea-light-candles", description: "Reliable tea lights for ambient installations, restaurants and events.", shortDescription: "Compact, consistent ambient light.", fragrance: "Unscented", waxType: "Paraffin blend", price: 49, compareAtPrice: null, stockQuantity: 500, isBulkAvailable: true, bulkMOQ: 100, bulkUnit: "Pieces", bulkStartingPrice: 29, bulkPriceVisible: false, categoryId: categories[4]!.id },
    { sku: "DIVA-BULK-007", name: "Luxury Candle Box", slug: "luxury-candle-box", description: "A refined candle presentation box configurable for premium occasions and brand events.", shortDescription: "Luxury presentation with custom finishing.", fragrance: "Custom", waxType: "Soy blend", price: 1499, compareAtPrice: null, stockQuantity: 50, isBulkAvailable: true, bulkMOQ: 10, bulkUnit: "Boxes", bulkStartingPrice: 1199, bulkPriceVisible: false, customPackagingAvailable: true, customBrandingAvailable: true, giftMessageAvailable: true, ribbonTagsAvailable: true, categoryId: categories[4]!.id },
    { sku: "DIVA-BULK-008", name: "Custom Candle", slug: "custom-candle", description: "A made-to-brief candle developed around your event, palette, fragrance and branding.", shortDescription: "Designed around your unique brief.", fragrance: "Custom", waxType: "Custom", price: 499, compareAtPrice: null, stockQuantity: 100, isBulkAvailable: true, bulkMOQ: 10, bulkUnit: "Pieces", bulkStartingPrice: null, bulkPriceVisible: false, isCustomisable: true, customPackagingAvailable: true, customColourAvailable: true, customFragranceAvailable: true, customBrandingAvailable: true, eventBrandingAvailable: true, ribbonTagsAvailable: true, categoryId: categories[4]!.id }
  ];
  for (const product of products) {
    const discountPercentage = product.compareAtPrice ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 10000) / 100 : 0;
    await prisma.product.upsert({ where: { sku: product.sku }, update: {}, create: { ...product, discountPercentage, stockStatus: "IN_STOCK", isActive: true } });
  }

  const team = [
    { name: "Vaishnavi Bhonde", designation: "Founder & Creative Director", description: "Vaishnavi Bhonde is the visionary behind DIVA Candles. Driven by a passion for craftsmanship and aesthetics, she leads creative direction, product innovation, quality standards, customer experience and brand development.", displayOrder: 0, isFounder: true },
    { name: "Vijay Bhonde", designation: "Mentor & Strategic Support", description: "Provides guidance, encouragement, practical support and strategic direction for the growth of DIVA Candles.", displayOrder: 1, isFounder: false },
    { name: "Premlata Bhonde", designation: "Inspiration & Operations Support", description: "Supports DIVA's journey through attention to detail, operations support, encouragement and the values that define the brand.", displayOrder: 2, isFounder: false },
    { name: "Piyush Bhonde", designation: "Business Development & Brand Support", description: "Supports business development, brand promotion, operations and market-growth initiatives.", displayOrder: 3, isFounder: false },
    { name: "Purva Bhonde", designation: "Technical Expert & Product Development Advisor", description: "Purva brings scientific expertise through her Pharmacy background, supporting fragrance composition, essential oils, perfume blending, wax proportions, clean burning and product consistency.", displayOrder: 4, isFounder: false }
  ];
  for (const member of team) {
    const existing = await prisma.teamMember.findFirst({ where: { name: member.name } });
    if (existing) await prisma.teamMember.update({ where: { id: existing.id }, data: member }); else await prisma.teamMember.create({ data: member });
  }
  console.info("DIVA Candles seed completed");
}

seed().finally(() => prisma.$disconnect());
