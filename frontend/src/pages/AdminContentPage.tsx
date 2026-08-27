import { Save } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, unwrap } from "../api/client";
import type { PageContent } from "./LegalPages";

const labels: Record<string, string> = { TERMS: "Terms & Conditions", PRIVACY_POLICY: "Privacy Policy", SHIPPING_POLICY: "Shipping Policy", RETURN_REFUND_POLICY: "Return & Refund Policy" };
export function AdminContentPage() {
  const qc = useQueryClient(); const { data = [], isLoading } = useQuery({ queryKey: ["admin-content"], queryFn: () => api.get("/admin/content").then(unwrap<PageContent[]>) }); const [selected, setSelected] = useState("TERMS"); const page = data.find((item) => item.pageKey === selected);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await api.put(`/admin/content/${selected}`, { title: form.get("title"), content: form.get("content"), isPublished: form.get("isPublished") === "on" }); toast.success(`${labels[selected]} saved`); await qc.invalidateQueries({ queryKey: ["admin-content"] }); await qc.invalidateQueries({ queryKey: ["page-content", selected] }); }
  if (isLoading) return <div className="admin-page">Loading policy content…</div>;
  return <div className="admin-page admin-content-page"><header><div><p className="eyebrow">EDITABLE WEBSITE CONTENT</p><h1>Policies</h1></div></header><nav>{Object.entries(labels).map(([key, label]) => <button key={key} className={selected === key ? "active" : ""} onClick={() => setSelected(key)}>{label}</button>)}</nav>{page && <form key={page.pageKey} onSubmit={submit}><label>Page title<input name="title" defaultValue={page.title} required/></label><label>Content<textarea name="content" rows={28} defaultValue={page.content} required/><small>Use “## Heading” on its own line to create section headings.</small></label><label className="check-line"><input name="isPublished" type="checkbox" defaultChecked={page.isPublished}/> Published on website</label><button className="button primary"><Save/> Save policy</button></form>}</div>;
}
