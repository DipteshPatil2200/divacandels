import { MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, unwrap } from "../api/client";
import { useCart } from "../context/CartContext";
import { cartWhatsAppUrl, formatINR } from "../services/whatsapp";
import type { Settings } from "../types";

export function CartPage() {
  const cart = useCart(); const [reserving, setReserving] = useState(false); const [reservationToken, setReservationToken] = useState(() => crypto.randomUUID());
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings/public").then(unwrap<Settings>) });
  const total = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  if (!cart.items.length) return <section className="page-state"><h1>Your WhatsApp cart is waiting.</h1><p>Add pieces you love, then send the whole list to DIVA Candles in one message.</p><Link className="button primary" to="/shop">Explore candles</Link></section>;
  const url = cartWhatsAppUrl(settings?.whatsappNumber ?? "918421869308", cart.items);
  async function continueToWhatsApp() { if (reserving) return; const popup = window.open("about:blank", "_blank"); setReserving(true); try { await api.post("/stock-reservations", { clientToken: reservationToken, items: cart.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })) }); await api.post("/analytics/click", { eventType: "WHATSAPP", targetUrl: url }).catch(() => undefined); setReservationToken(crypto.randomUUID()); cart.clear(); if (popup) { popup.opener = null; popup.location.href = url; } else window.location.href = url; toast.success("Selected quantities reserved and admin stock updated"); } catch (error: any) { popup?.close(); toast.error(error.response?.data?.error?.message ?? "One or more selected quantities are unavailable"); } finally { setReserving(false); } }
  return <section className="cart-page"><header><p className="eyebrow">YOUR SELECTION</p><h1>WhatsApp cart</h1><p>No payment is taken here. Your selected quantities are deducted from available stock when you continue to WhatsApp.</p></header><div className="cart-layout"><div className="cart-list">{cart.items.map(({ product, quantity }) => <article key={product.id}><div className="cart-thumb"><div className="mini-candle"/></div><div><Link to={`/products/${product.slug}`}><h3>{product.name}</h3></Link><p>{product.fragrance}</p><strong>{formatINR(product.price)}</strong></div><div className="cart-qty"><button onClick={() => cart.setQuantity(product.id, quantity - 1)} aria-label={`Reduce ${product.name} quantity`}><Minus/></button><span>{quantity}</span><button onClick={() => cart.setQuantity(product.id, quantity + 1)} aria-label={`Increase ${product.name} quantity`}><Plus/></button></div><button className="remove" onClick={() => cart.remove(product.id)} aria-label={`Remove ${product.name}`}><Trash2/></button></article>)}</div><aside><h2>Estimated total</h2><strong>{formatINR(total)}</strong><p>Shipping, delivery and payment will be confirmed by our team.</p><button className="button whatsapp" disabled={reserving} onClick={continueToWhatsApp}><MessageCircle/> {reserving ? "Reserving stock…" : "Continue on WhatsApp"}</button><button className="text-button" onClick={cart.clear}>Clear cart</button></aside></div></section>;
}
