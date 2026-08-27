import type { CartItem, Product } from "../types";

export const formatINR = (value: number | string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
const wa = (number: string, message: string) => `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

export function productWhatsAppUrl(number: string, product: Product, quantity: number, customerName = "", city = "") {
  return wa(number, `Hello DIVA Candles,\n\nI am interested in ordering this product:\n\nProduct: ${product.name}\nSKU: ${product.sku}\nPrice: ${formatINR(product.price)}\nQuantity: ${quantity}\nProduct Link: ${window.location.href}\n\nCustomer Name: ${customerName}\nCity: ${city}\n\nPlease confirm availability, final amount and delivery details.`);
}

export function cartWhatsAppUrl(number: string, items: CartItem[]) {
  const lines = items.map((item, i) => `${i + 1}. ${item.product.name} × ${item.quantity} – ${formatINR(Number(item.product.price) * item.quantity)}`).join("\n");
  const total = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  return wa(number, `Hello DIVA Candles,\n\nI would like to order the following products:\n\n${lines}\n\nEstimated Total: ${formatINR(total)}\n\nCustomer Name:\nMobile Number:\nCity:\nDelivery Address:\n\nPlease confirm availability, shipping charges and payment details.`);
}
