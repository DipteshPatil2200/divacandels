import { ExternalLink, Facebook, Instagram, Linkedin, Menu, MessageCircle, ShoppingBag, X, Youtube } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { useCart } from "../context/CartContext";
import type { Settings } from "../types";
import { BrandLogo } from "./BrandLogo";
import { DeveloperCredit } from "./DeveloperCredit";

const links = [["Home", "/"], ["Shop", "/shop"], ["Bulk Orders", "/bulk-orders"], ["About Us", "/about"], ["Contact Us", "/contact"], ["FAQs", "/faqs"]];

export function Layout() {
  const [open, setOpen] = useState(false); const cart = useCart();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings/public").then(unwrap<Settings>), staleTime: 300000 });
  return <div className="site-shell">
    <div className="announcement">Handcrafted in small batches with premium fragrance</div>
    <header className="header"><BrandLogo/><nav>{links.map(([label, to]) => <NavLink key={to} to={to!}>{label}</NavLink>)}</nav><div className="header-actions">{settings?.amazonStoreEnabled && settings.amazonStoreUrl && <a className="amazon-header" href={settings.amazonStoreUrl} target="_blank" rel="noopener noreferrer">Amazon <ExternalLink/></a>}<Link to="/cart" className="cart-button"><ShoppingBag size={19}/><span>{cart.count}</span></Link><button className="menu-button" onClick={() => setOpen(!open)} aria-label="Open navigation">{open ? <X/> : <Menu/>}</button></div></header>
    {open && <div className="mobile-nav">{links.map(([label, to]) => <NavLink key={to} to={to!} onClick={() => setOpen(false)}>{label}</NavLink>)}</div>}
    <main><Outlet/></main>
    <footer className="footer"><div className="footer-brand"><BrandLogo light/><p>Handcrafted light for homes, hearts and unforgettable celebrations.</p><em>Illuminate Moments. Inspire Memories.</em></div><div><h4>Explore</h4><Link to="/">Home</Link><Link to="/shop">Shop</Link><Link to="/bulk-orders">Bulk Orders</Link><Link to="/about">About Us</Link><Link to="/contact">Contact Us</Link><Link to="/faqs">FAQs</Link></div><div><h4>Policies</h4><Link to="/terms-and-conditions">Terms & Conditions</Link><Link to="/privacy-policy">Privacy Policy</Link><Link to="/shipping-policy">Shipping Policy</Link><Link to="/return-refund-policy">Return & Refund Policy</Link></div><div><h4>Contact & Social</h4><a href={`tel:${(settings?.phone ?? "+918421869308").replace(/\s/g, "")}`}>{settings?.phone ?? "+91 84218 69308"}</a><a href={`mailto:${settings?.notificationEmail ?? "info.divacandles@gmail.com"}`}>{settings?.notificationEmail ?? "info.divacandles@gmail.com"}</a><div className="socials">{settings?.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram/></a>}{settings?.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook/></a>}{settings?.youtubeUrl && <a href={settings.youtubeUrl} target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube/></a>}{settings?.linkedinUrl && <a href={settings.linkedinUrl} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin/></a>}{settings?.amazonStoreEnabled && settings.amazonStoreUrl && <a href={settings.amazonStoreUrl} target="_blank" rel="noopener noreferrer" aria-label="Amazon"><ExternalLink/></a>}</div></div><div className="copyright"><span>© {new Date().getFullYear()} DIVA Candles. Crafted with intention.</span><DeveloperCredit/></div></footer>
    <a className="floating-whatsapp global" href={`https://wa.me/${settings?.whatsappNumber ?? "918421869308"}?text=${encodeURIComponent("Hello DIVA Candles,\nI would like to know more about your candle collection.")}`} target="_blank" rel="noopener noreferrer" aria-label="Chat with DIVA Candles on WhatsApp"><MessageCircle/></a>
  </div>;
}
