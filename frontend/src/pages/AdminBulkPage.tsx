import { Plus, Save, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { api, unwrap } from "../api/client";
import { formatINR } from "../services/whatsapp";
import type { Product } from "../types";

function BulkProductEditor({ product, refresh }: { product: Product; refresh: () => void }) {
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const nullableNumber = (name: string) => form.get(name) ? Number(form.get(name)) : null;
    await api.patch(`/admin/bulk-products/${product.id}`, { isBulkAvailable: form.get("isBulkAvailable") === "on", bulkMOQ: nullableNumber("bulkMOQ"), bulkUnit: form.get("bulkUnit") || null, bulkStartingPrice: nullableNumber("bulkStartingPrice"), bulkPriceVisible: form.get("bulkPriceVisible") === "on", bulkDescription: form.get("bulkDescription") || null, customPackagingAvailable: form.get("customPackagingAvailable") === "on", customColourAvailable: form.get("customColourAvailable") === "on", customFragranceAvailable: form.get("customFragranceAvailable") === "on", customBrandingAvailable: form.get("customBrandingAvailable") === "on", giftMessageAvailable: form.get("giftMessageAvailable") === "on", eventBrandingAvailable: form.get("eventBrandingAvailable") === "on", ribbonTagsAvailable: form.get("ribbonTagsAvailable") === "on", whatsappAvailable: form.get("whatsappAvailable") === "on" });
    toast.success(`${product.name} bulk settings saved`); refresh();
  }
  async function addTier(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await api.post(`/admin/bulk-products/${product.id}/pricing`, { minimumQuantity: Number(form.get("minimumQuantity")), maximumQuantity: form.get("maximumQuantity") ? Number(form.get("maximumQuantity")) : null, pricePerUnit: Number(form.get("pricePerUnit")), isActive: true }); toast.success("Pricing tier added"); event.currentTarget.reset(); refresh(); }
  async function editTier(event: FormEvent<HTMLFormElement>, id: number) { event.preventDefault(); const form = new FormData(event.currentTarget); await api.patch(`/admin/bulk-pricing/${id}`, { minimumQuantity: Number(form.get("minimumQuantity")), maximumQuantity: form.get("maximumQuantity") ? Number(form.get("maximumQuantity")) : null, pricePerUnit: Number(form.get("pricePerUnit")), isActive: true }); toast.success("Pricing tier updated"); refresh(); }
  async function removeTier(id: number) { await api.delete(`/admin/bulk-pricing/${id}`); refresh(); }

  const checkboxes = [["isBulkAvailable", "Bulk available"], ["bulkPriceVisible", "Show price"], ["whatsappAvailable", "WhatsApp"], ["customPackagingAvailable", "Custom packaging"], ["customColourAvailable", "Colour"], ["customFragranceAvailable", "Fragrance"], ["customBrandingAvailable", "Brand logo"], ["giftMessageAvailable", "Message"], ["eventBrandingAvailable", "Event branding"], ["ribbonTagsAvailable", "Ribbon & tags"]] as const;
  return <article className="bulk-admin-card">
    <div className="bulk-admin-heading"><div className="admin-product-mini">{product.images[0] ? <img src={product.images[0].imageUrl} alt=""/> : <span>DIVA</span>}<div><h2>{product.name}</h2><p>{product.category.name} · {formatINR(product.price)}</p></div></div><a href={`/products/${product.slug}`} target="_blank" rel="noreferrer">Preview</a></div>
    <form onSubmit={save} className="admin-form-grid"><label>MOQ<input name="bulkMOQ" type="number" min="1" defaultValue={product.bulkMOQ ?? ""}/></label><label>Unit<input name="bulkUnit" defaultValue={product.bulkUnit ?? "Pieces"}/></label><label>Starting price<input name="bulkStartingPrice" type="number" min="1" defaultValue={product.bulkStartingPrice ?? ""}/></label><label className="full">Bulk description<textarea name="bulkDescription" rows={3} defaultValue={product.bulkDescription ?? ""}/></label><div className="checks full">{checkboxes.map(([name, label]) => <label key={name}><input name={name} type="checkbox" defaultChecked={Boolean(product[name])}/>{label}</label>)}</div><button className="button primary"><Save/> Save bulk settings</button></form>
    <div className="pricing-tiers"><h3>Quantity pricing</h3>
      {product.bulkPricingTiers?.map((tier) => <form className="existing-tier" key={tier.id} onSubmit={(event) => editTier(event, tier.id)}><input name="minimumQuantity" type="number" min="1" defaultValue={tier.minimumQuantity} aria-label="Minimum quantity" required/><input name="maximumQuantity" type="number" min="1" defaultValue={tier.maximumQuantity ?? ""} aria-label="Maximum quantity" placeholder="No maximum"/><input name="pricePerUnit" type="number" min="1" defaultValue={tier.pricePerUnit} aria-label="Price per unit" required/><button title="Save pricing tier"><Save/></button><button type="button" title="Delete pricing tier" onClick={() => removeTier(tier.id)}><Trash2/></button></form>)}
      <form onSubmit={addTier}><input name="minimumQuantity" type="number" min="1" placeholder="Min" required/><input name="maximumQuantity" type="number" min="1" placeholder="Max (optional)"/><input name="pricePerUnit" type="number" min="1" placeholder="Price/unit" required/><button><Plus/> Add tier</button></form>
    </div>
  </article>;
}

export function AdminBulkPage() {
  const qc = useQueryClient(); const { data = [], isLoading } = useQuery({ queryKey: ["admin-bulk-products"], queryFn: () => api.get("/admin/bulk-products").then(unwrap<Product[]>) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-bulk-products"] }); qc.invalidateQueries({ queryKey: ["bulk-products"] }); };
  return <div className="admin-page"><header><div><p className="eyebrow">LARGE ORDERS</p><h1>Bulk products</h1></div></header>{isLoading ? <p>Loading products…</p> : <div className="bulk-admin-list">{data.map((product) => <BulkProductEditor key={product.id} product={product} refresh={refresh}/>)}</div>}</div>;
}
