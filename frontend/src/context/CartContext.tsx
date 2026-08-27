import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem, Product } from "../types";

type CartContextValue = { items: CartItem[]; count: number; add: (product: Product, quantity?: number) => void; remove: (id: number) => void; setQuantity: (id: number, quantity: number) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem("diva-cart") ?? "[]"); } catch { return []; } });
  useEffect(() => localStorage.setItem("diva-cart", JSON.stringify(items)), [items]);
  const value = useMemo(() => ({ items, count: items.reduce((sum, item) => sum + item.quantity, 0), add(product: Product, quantity = 1) { setItems((current) => current.some((item) => item.product.id === product.id) ? current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + quantity, product.stockQuantity) } : item) : [...current, { product, quantity }]); }, remove(id: number) { setItems((current) => current.filter((item) => item.product.id !== id)); }, setQuantity(id: number, quantity: number) { setItems((current) => current.map((item) => item.product.id === id ? { ...item, quantity: Math.max(1, Math.min(quantity, item.product.stockQuantity)) } : item)); }, clear() { setItems([]); } }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => { const value = useContext(CartContext); if (!value) throw new Error("CartProvider missing"); return value; };
