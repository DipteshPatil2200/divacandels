import { describe, expect, it, vi } from "vitest";
import { cartWhatsAppUrl, productWhatsAppUrl } from "./whatsapp";
import type { Product } from "../types";

const product = { id: 1, sku: "DIVA-1", name: "Moonlit Muse", slug: "moonlit-muse", description: "Candle", price: 899, discountPercentage: 0, stockQuantity: 5, stockStatus: "IN_STOCK", categoryId: 1, category: { id: 1, name: "Sculptural", slug: "sculptural", displayOrder: 0, isActive: true }, isFeatured: true, isBestSeller: false, isNewArrival: false, isCustomisable: false, isActive: true, images: [] } as Product;

describe("WhatsApp URLs", () => {
  it("encodes a product order centrally", () => {
    vi.stubGlobal("window", { location: { href: "https://divacandles.example/product/moonlit-muse" } });
    const url = productWhatsAppUrl("91 84218 69308", product, 2);
    expect(url).toContain("https://wa.me/918421869308?text=");
    expect(decodeURIComponent(url)).toContain("Product: Moonlit Muse");
    expect(decodeURIComponent(url)).toContain("Quantity: 2");
  });
  it("includes every cart line and estimated total", () => {
    const url = cartWhatsAppUrl("918421869308", [{ product, quantity: 2 }]);
    expect(decodeURIComponent(url)).toContain("Moonlit Muse × 2");
    expect(decodeURIComponent(url)).toContain("Estimated Total: ₹1,798");
  });
});
