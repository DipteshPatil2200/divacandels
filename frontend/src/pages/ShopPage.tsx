import { SlidersHorizontal, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, unwrap } from "../api/client";
import { ProductCard } from "../components/ProductCard";
import type { Category, Product } from "../types";

export function ShopPage() {
  const [filters, setFilters] = useState({ q: "", category: "", sort: "latest" }); const [drawer, setDrawer] = useState(false);
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => api.get("/categories").then(unwrap<Category[]>) });
  const { data, isLoading } = useQuery({ queryKey: ["products", filters], queryFn: () => api.get("/products", { params: filters }).then((r) => r.data as { data: Product[]; meta: { total: number } }) });
  const filterPanel = <div className="filter-panel"><div className="filter-title"><h3>Refine</h3><button onClick={() => setDrawer(false)}><X/></button></div><label>Search<input value={filters.q} placeholder="Candle, fragrance…" onChange={(e) => setFilters({ ...filters, q: e.target.value })}/></label><label>Collection<select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All collections</option>{categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label><label>Sort by<select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}><option value="latest">Latest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label><button className="text-button" onClick={() => setFilters({ q: "", category: "", sort: "latest" })}>Clear filters</button></div>;
  return <section className="shop-page"><header className="page-hero"><p className="eyebrow">THE COLLECTION</p><h1>Find your <em>glow.</em></h1><p>Handcrafted forms and considered fragrances for every corner, celebration and mood.</p></header><div className="shop-toolbar"><span>{data?.meta.total ?? 0} pieces</span><button onClick={() => setDrawer(true)}><SlidersHorizontal size={18}/> Filters</button></div><div className="shop-layout">{filterPanel}<div>{isLoading ? <p>Gathering the collection…</p> : data?.data.length ? <div className="product-grid">{data.data.map((p) => <ProductCard key={p.id} product={p}/>)}</div> : <div className="empty"><h2>No candles found</h2><p>Try clearing a filter or searching with another word.</p></div>}</div></div>{drawer && <div className="filter-drawer">{filterPanel}</div>}</section>;
}
