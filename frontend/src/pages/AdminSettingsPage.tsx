import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { api, unwrap } from "../api/client";
import type { Settings } from "../types";

const text = (form: FormData, key: string) => form.get(key) || null;
const enabled = (form: FormData, key: string) => form.get(key) === "on";

export function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: () => api.get("/admin/settings").then(unwrap<Settings>) });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await api.patch("/admin/settings", {
      brandName: form.get("brandName"), logoUrl: text(form, "logoUrl"), faviconUrl: text(form, "faviconUrl"),
      phone: form.get("phone"), whatsappNumber: form.get("whatsappNumber"), notificationEmail: form.get("notificationEmail"),
      address: text(form, "address"), businessHours: text(form, "businessHours"), googleMapsUrl: text(form, "googleMapsUrl"),
      instagramUrl: text(form, "instagramUrl"), facebookUrl: text(form, "facebookUrl"), youtubeUrl: text(form, "youtubeUrl"), linkedinUrl: text(form, "linkedinUrl"),
      amazonStoreUrl: text(form, "amazonStoreUrl"), amazonStoreEnabled: enabled(form, "amazonStoreEnabled"),
      seoTitle: text(form, "seoTitle"), seoDescription: text(form, "seoDescription"), homepageHeroTitle: text(form, "homepageHeroTitle"), homepageHeroText: text(form, "homepageHeroText"),
      currency: form.get("currency"), taxPercentage: Number(form.get("taxPercentage") || 0), paymentEnabled: enabled(form, "paymentEnabled"), razorpayEnabled: enabled(form, "razorpayEnabled"), whatsappApiEnabled: enabled(form, "whatsappApiEnabled"), maintenanceMode: enabled(form, "maintenanceMode")
    });
    await Promise.all([qc.invalidateQueries({ queryKey: ["admin-settings"] }), qc.invalidateQueries({ queryKey: ["settings"] })]); toast.success("All site settings updated");
  }
  if (isLoading || !data) return <div className="page-state">Loading settings…</div>;
  return <div className="admin-page form-page"><header><div><p className="eyebrow">GLOBAL CONFIGURATION</p><h1>Site settings</h1></div></header><form onSubmit={submit} className="settings-form">
    <section className="settings-section"><h2>Brand & Images</h2><div className="admin-form-grid"><label>Brand name<input name="brandName" defaultValue={data.brandName}/></label><label>Logo HTTPS URL<input name="logoUrl" type="url" defaultValue={data.logoUrl}/></label><label>Favicon HTTPS URL<input name="faviconUrl" type="url" defaultValue={data.faviconUrl}/></label></div></section>
    <section className="settings-section"><h2>Contact, Email & WhatsApp</h2><div className="admin-form-grid"><label>Phone<input name="phone" defaultValue={data.phone}/></label><label>WhatsApp number<input name="whatsappNumber" defaultValue={data.whatsappNumber}/></label><label>Notification email<input name="notificationEmail" type="email" defaultValue={data.notificationEmail}/></label><div className="checks full"><label><input name="whatsappApiEnabled" type="checkbox" defaultChecked={data.whatsappApiEnabled}/> WhatsApp API enabled</label></div></div></section>
    <section className="settings-section"><h2>Social Media & Amazon</h2><div className="admin-form-grid"><label>Instagram URL<input name="instagramUrl" type="url" defaultValue={data.instagramUrl}/></label><label>Facebook URL<input name="facebookUrl" type="url" defaultValue={data.facebookUrl}/><small>Icon remains hidden while blank.</small></label><label>YouTube URL<input name="youtubeUrl" type="url" defaultValue={data.youtubeUrl}/></label><label>LinkedIn URL<input name="linkedinUrl" type="url" defaultValue={data.linkedinUrl}/></label><label className="full">Amazon Store URL<input name="amazonStoreUrl" type="url" defaultValue={data.amazonStoreUrl}/></label><div className="checks full"><label><input name="amazonStoreEnabled" type="checkbox" defaultChecked={data.amazonStoreEnabled}/> Show Amazon store links</label></div></div></section>
    <section className="settings-section"><h2>SEO & Homepage</h2><div className="admin-form-grid"><label className="full">SEO title<input name="seoTitle" maxLength={160} defaultValue={data.seoTitle}/></label><label className="full">SEO description<textarea name="seoDescription" maxLength={500} rows={3} defaultValue={data.seoDescription}/></label><label className="full">Homepage hero title<input name="homepageHeroTitle" defaultValue={data.homepageHeroTitle}/></label><label className="full">Homepage hero text<textarea name="homepageHeroText" rows={3} defaultValue={data.homepageHeroText}/></label></div></section>
    <section className="settings-section"><h2>Business & Payment</h2><div className="admin-form-grid"><label>Address<input name="address" defaultValue={data.address}/></label><label>Business hours<input name="businessHours" defaultValue={data.businessHours}/></label><label>Google Maps URL<input name="googleMapsUrl" type="url" defaultValue={data.googleMapsUrl}/></label><label>Currency<input name="currency" maxLength={10} defaultValue={data.currency ?? "INR"}/></label><label>Tax percentage<input name="taxPercentage" type="number" min="0" max="100" step="0.01" defaultValue={Number(data.taxPercentage ?? 0)}/></label><div className="checks full"><label><input name="paymentEnabled" type="checkbox" defaultChecked={data.paymentEnabled}/> Online payments enabled</label><label><input name="razorpayEnabled" type="checkbox" defaultChecked={data.razorpayEnabled}/> Razorpay enabled</label><label><input name="maintenanceMode" type="checkbox" defaultChecked={data.maintenanceMode}/> Maintenance mode</label></div></div></section>
    <button className="button primary">Save all settings</button>
  </form></div>;
}
