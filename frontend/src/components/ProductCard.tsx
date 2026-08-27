import { ArrowUpRight, ExternalLink, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../api/client";
import { formatINR, productWhatsAppUrl } from "../services/whatsapp";
import { deliveryImageUrl, imageSrcSet } from "../services/images";
import type { Product } from "../types";

export function ProductCard({ product }: { product: Product }) {
  const [reserving, setReserving] = useState(false); const [reservationToken, setReservationToken] = useState(() => crypto.randomUUID());
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  const whatsapp = productWhatsAppUrl("918421869308", product, 1);
  const track = (eventType: "WHATSAPP" | "AMAZON", targetUrl: string) => void api.post("/analytics/click", { eventType, productId: product.id, targetUrl }).catch(() => undefined);
  async function reserveOne() { if (reserving || !product.stockQuantity) return; const popup = window.open("about:blank", "_blank"); setReserving(true); try { await api.post("/stock-reservations", { clientToken: reservationToken, items: [{ productId: product.id, quantity: 1 }] }); track("WHATSAPP", whatsapp); setReservationToken(crypto.randomUUID()); if (popup) { popup.opener = null; popup.location.href = whatsapp; } else window.location.href = whatsapp; toast.success("One candle reserved and stock updated"); } catch (error: any) { popup?.close(); toast.error(error.response?.data?.error?.message ?? "This candle is currently unavailable"); } finally { setReserving(false); } }
  return <article className="product-card">
    <Link to={`/products/${product.slug}`} className="product-visual" aria-label={`View ${product.name}`}>
      {image ? <img src={deliveryImageUrl(image.imageUrl, 400)} srcSet={imageSrcSet(image.imageUrl)} sizes="(max-width: 768px) 50vw, 25vw" alt={image.altText} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.classList.add("image-missing"); }}/>: <div className="image-fallback"><b>DIVA CANDLES</b><span>Image Coming Soon</span></div>}
      <div className="product-badges">{product.isNewArrival && <span>New</span>}{Number(product.discountPercentage) > 0 && <span>{Math.round(Number(product.discountPercentage))}% off</span>}</div>
      <span className="visual-arrow"><ArrowUpRight size={18}/></span>
    </Link>
    <div className="product-copy">
      <div><p className="eyebrow">{product.category?.name}</p><Link to={`/products/${product.slug}`}><h3>{product.name}</h3></Link></div>
      <p className="scent">{[product.fragrance, product.waxType].filter(Boolean).join(" · ") || product.shortDescription}</p>
      <div className="stock-line">{product.stockQuantity ? "In stock" : "Out of stock"}</div>
      <div className="price-row"><div><strong>{formatINR(product.price)}</strong>{product.compareAtPrice && <del>{formatINR(product.compareAtPrice)}</del>}</div></div>
      <div className="product-actions">{product.whatsappAvailable !== false && <button type="button" disabled={reserving || !product.stockQuantity} onClick={reserveOne}><MessageCircle/> {reserving ? "Reserving…" : "WhatsApp"}</button>}{product.amazonUrl && <a href={product.amazonUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("AMAZON", product.amazonUrl!)}><ExternalLink/> Amazon</a>}</div>
    </div>
  </article>;
}
