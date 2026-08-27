import { ArrowLeft, MessageCircle, PackageCheck, ShieldCheck, ShoppingBag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, unwrap } from "../api/client";
import { useCart } from "../context/CartContext";
import { formatINR, productWhatsAppUrl } from "../services/whatsapp";
import { deliveryImageUrl, imageSrcSet } from "../services/images";
import type { Product, Settings } from "../types";

export function ProductPage() {
  const { slug } = useParams(); const [quantity, setQuantity] = useState(1); const [selectedImageId, setSelectedImageId] = useState<number>(); const [reserving, setReserving] = useState(false); const [reservationToken, setReservationToken] = useState(() => crypto.randomUUID()); const cart = useCart();
  const { data: product, isLoading, isError } = useQuery({ queryKey: ["product", slug], queryFn: () => api.get(`/products/${slug}`).then(unwrap<Product>), enabled: !!slug });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings/public").then(unwrap<Settings>) });
  if (isLoading) return <div className="page-state">Preparing the details…</div>;
  if (isError || !product) return <div className="page-state"><h1>This candle has moved.</h1><Link to="/shop">Return to the collection</Link></div>;
  const image = product.images.find((item) => item.id === selectedImageId) ?? product.images.find((item) => item.isPrimary) ?? product.images[0];
  const whatsapp = productWhatsAppUrl(settings?.whatsappNumber ?? "918421869308", product, quantity);
  const track = (eventType: "WHATSAPP" | "AMAZON", targetUrl: string) => void api.post("/analytics/click", { eventType, productId: product.id, targetUrl }).catch(() => undefined);
  const addToCart = () => { cart.add(product, quantity); toast.success("Added to your WhatsApp cart"); };
  const selectedProduct = product;
  async function reserveAndOpenWhatsApp() { if (reserving || !selectedProduct.stockQuantity) return; const popup = window.open("about:blank", "_blank"); setReserving(true); try { await api.post("/stock-reservations", { clientToken: reservationToken, items: [{ productId: selectedProduct.id, quantity }] }); await api.post("/analytics/click", { eventType: "WHATSAPP", productId: selectedProduct.id, targetUrl: whatsapp }).catch(() => undefined); setReservationToken(crypto.randomUUID()); if (popup) { popup.opener = null; popup.location.href = whatsapp; } else window.location.href = whatsapp; toast.success("Quantity reserved and stock updated"); } catch (error: any) { popup?.close(); toast.error(error.response?.data?.error?.message ?? "Selected quantity is unavailable"); } finally { setReserving(false); } }
  return <section className="product-page">
    <Link to="/shop" className="back"><ArrowLeft size={17}/> Back to collection</Link>
    <div className="product-detail">
      <div className="detail-gallery-shell"><div className="detail-gallery">{image ? <img src={deliveryImageUrl(image.imageUrl, 800)} srcSet={imageSrcSet(image.imageUrl)} sizes="(max-width: 900px) 100vw, 50vw" alt={image.altText || product.name}/> : <div className="image-fallback"><b>DIVA CANDLES</b><span>Image Coming Soon</span></div>}<div className="image-note">HANDCRAFTED · SMALL BATCH</div></div>{product.images.length > 1 && <div className="detail-thumbnails" aria-label="Product photos">{product.images.map((item) => <button type="button" key={item.id} className={item.id === image?.id ? "active" : ""} onClick={() => setSelectedImageId(item.id)} aria-label={`View ${item.altText || product.name}`}><img src={deliveryImageUrl(item.imageUrl, 200)} alt="" loading="lazy"/></button>)}</div>}</div>
      <div className="detail-copy"><p className="eyebrow">{product.category.name} · {product.sku}</p><h1>{product.name}</h1><p className="detail-scent">{product.fragrance}</p><div className="detail-price"><strong>{formatINR(product.price)}</strong>{product.compareAtPrice && <del>{formatINR(product.compareAtPrice)}</del>}</div><p className="description">{product.description}</p><dl>{product.waxType && <><dt>Wax</dt><dd>{product.waxType}</dd></>}{product.burnTime && <><dt>Burn time</dt><dd>{product.burnTime}</dd></>}{product.weight && <><dt>Weight</dt><dd>{product.weight}</dd></>}<dt>Availability</dt><dd className={product.stockQuantity ? "in-stock" : "out-stock"}>{product.stockQuantity ? "In stock" : "Currently unavailable"}</dd></dl><div className="purchase-row"><div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}>+</button></div><button className="button primary grow" disabled={!product.stockQuantity} onClick={addToCart}><ShoppingBag size={18}/> Add to cart</button></div><button type="button" className="button whatsapp" disabled={reserving || !product.stockQuantity} onClick={reserveAndOpenWhatsApp}><MessageCircle size={18}/> {reserving ? "Reserving…" : "Order directly on WhatsApp"}</button>{product.amazonUrl && <a href={product.amazonUrl} target="_blank" rel="noopener noreferrer" className="button amazon" onClick={() => track("AMAZON", product.amazonUrl!)}>Buy on Amazon</a>}<div className="detail-assurances"><span><PackageCheck/>Carefully packed</span><span><ShieldCheck/>Secure inquiry handling</span></div></div>
    </div>
    <div className="mobile-product-actions"><button type="button" className="button whatsapp" disabled={reserving || !product.stockQuantity} onClick={reserveAndOpenWhatsApp}><MessageCircle/> {reserving ? "Reserving…" : "WhatsApp"}</button>{product.amazonUrl ? <a href={product.amazonUrl} target="_blank" rel="noopener noreferrer" className="button amazon" onClick={() => track("AMAZON", product.amazonUrl!)}>Amazon</a> : <button className="button primary" disabled={!product.stockQuantity} onClick={addToCart}><ShoppingBag/> Add to cart</button>}</div>
  </section>;
}
