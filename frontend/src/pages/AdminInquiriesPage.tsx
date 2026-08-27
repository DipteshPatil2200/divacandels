import { Mail, MessageCircle, Phone, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api, unwrap } from "../api/client";
import { useDialog } from "../components/DialogSystem";

type Inquiry = { id: number; inquiryNumber: string; inquiryType: string; source: string; customerName: string; phone: string; email?: string | null; emailNotificationSent: boolean; city?: string | null; quantity?: number | null; unit?: string | null; requiredDeliveryDate?: string | null; customisationRequired: boolean; customisationDetails?: string | null; budget?: string | number | null; message: string; status: string; adminNotes?: string | null; createdAt: string; product?: { name: string; sku: string } | null };
const statuses = ["NEW", "CONTACTED", "IN_PROGRESS", "CONVERTED", "CLOSED", "SPAM"];

function whatsappUrl(item: Inquiry) {
  let digits = item.phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  else if (digits.startsWith("0") && digits.length === 11) digits = `91${digits.slice(1)}`;
  const message = `Hello ${item.customerName},\n\nThank you for contacting DIVA Candles regarding inquiry ${item.inquiryNumber}. We are following up on your request.\n\nRegards,\nDIVA Candles`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function AdminInquiriesPage() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const [selected, setSelected] = useState<Inquiry>();
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-inquiries"], queryFn: () => api.get("/admin/inquiries").then(unwrap<Inquiry[]>) });
  const updateStatus = useMutation({ mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/admin/inquiries/${id}`, { status }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-inquiries"] }); toast.success("Status updated"); } });
  const deleteInquiry = useMutation({
    mutationFn: (item: Inquiry) => api.delete(`/admin/inquiries/${item.id}`).then(() => item),
    onSuccess: (item) => {
      setSelected((current) => current?.id === item.id ? undefined : current);
      void qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
      toast.success(`${item.inquiryNumber} deleted`);
    },
    onError: () => toast.error("Inquiry could not be deleted"),
  });
  const filteredInquiries = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return data;
    return data.filter((item) => [item.inquiryNumber, item.customerName, item.phone, item.email, item.city, item.inquiryType, item.source, item.message, item.status, item.product?.name, item.product?.sku]
      .some((value) => String(value ?? "").toLocaleLowerCase().includes(term)));
  }, [data, search]);

  async function confirmRemove(item: Inquiry) {
    if (await dialog.confirm({ title: "Delete Inquiry?", message: `Are you sure you want to permanently delete ${item.inquiryNumber} from ${item.customerName}?`, confirmLabel: "Delete", dangerous: true })) deleteInquiry.mutate(item);
  }
  async function setStatus(status: string) { if (!selected) return; await api.patch(`/admin/inquiries/${selected.id}`, { status }); setSelected({ ...selected, status }); toast.success(`Marked ${status.replaceAll("_", " ").toLowerCase()}`); void qc.invalidateQueries({ queryKey: ["admin-inquiries"] }); }
  async function retryEmail() { if (!selected) return; try { await api.post(`/admin/inquiries/${selected.id}/retry-notification`); setSelected({ ...selected, emailNotificationSent: true }); toast.success("Notification email sent"); void qc.invalidateQueries({ queryKey: ["admin-inquiries"] }); } catch { toast.error("Email notification could not be sent. Check SMTP settings."); } }

  return <div className="admin-page admin-inquiries-page">
    <header>
      <div><p className="eyebrow">CUSTOMER CARE</p><h1>Inquiries</h1></div>
      <label className="admin-inquiry-search"><Search aria-hidden="true"/><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search inquiries…" aria-label="Search inquiries"/>{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear inquiry search"><X/></button>}</label>
    </header>
    {!isLoading && <p className="inquiry-result-count">Showing {filteredInquiries.length} of {data.length} inquiries</p>}
    {isLoading ? <p>Loading…</p> : <div className="data-table inquiries">
      <div className="table-head"><span>Reference</span><span>Customer</span><span>Type</span><span>Message</span><span>Status</span><span>Actions</span></div>
      {filteredInquiries.map((item) => <div className="table-row" key={item.id}>
        <span><button className="inquiry-reference" onClick={() => setSelected(item)}>{item.inquiryNumber}</button><small>{new Date(item.createdAt).toLocaleDateString("en-IN")}</small></span>
        <span>{item.customerName}<small>{item.phone}</small></span>
        <span>{item.inquiryType.replaceAll("_", " ")}</span>
        <span>{item.message}</span>
        <span><select value={item.status} onChange={(event) => updateStatus.mutate({ id: item.id, status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></span>
        <span className="admin-row-actions"><button type="button" title="Delete inquiry" aria-label={`Delete inquiry ${item.inquiryNumber}`} disabled={deleteInquiry.isPending} onClick={() => confirmRemove(item)}><Trash2/></button></span>
      </div>)}
      {!filteredInquiries.length && <div className="inquiry-empty">{search ? "No inquiries match your search." : "No inquiries found."}</div>}
    </div>}
    {selected && <div className="inquiry-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="inquiry-detail-title"><div className="inquiry-detail-panel"><header><div><p className="eyebrow">INQUIRY REFERENCE</p><h2 id="inquiry-detail-title">{selected.inquiryNumber}</h2></div><button onClick={() => setSelected(undefined)} aria-label="Close inquiry details"><X/></button></header><dl className="inquiry-detail-grid"><div><dt>Customer</dt><dd>{selected.customerName}</dd></div><div><dt>Mobile</dt><dd>{selected.phone}</dd></div><div><dt>Email</dt><dd>{selected.email || "—"}</dd></div><div><dt>Source</dt><dd>{selected.source.replaceAll("_", " ")}</dd></div><div><dt>Type</dt><dd>{selected.inquiryType.replaceAll("_", " ")}</dd></div><div><dt>Status</dt><dd>{selected.status}</dd></div><div><dt>Email notification</dt><dd>{selected.emailNotificationSent ? "Sent" : "Pending / Failed"}</dd></div><div><dt>Product</dt><dd>{selected.product ? `${selected.product.name} · ${selected.product.sku}` : "—"}</dd></div><div><dt>Quantity</dt><dd>{selected.quantity ? `${selected.quantity} ${selected.unit ?? ""}` : "—"}</dd></div><div><dt>Required date</dt><dd>{selected.requiredDeliveryDate ? new Date(selected.requiredDeliveryDate).toLocaleDateString("en-IN") : "—"}</dd></div><div className="full"><dt>Customer message</dt><dd>{selected.message}</dd></div><div className="full"><dt>Admin notes</dt><dd>{selected.adminNotes || "—"}</dd></div></dl><div className="inquiry-detail-actions"><a className="button" href={`tel:${selected.phone}`}><Phone/> Call</a><a className="button whatsapp" href={whatsappUrl(selected)} target="_blank" rel="noopener noreferrer"><MessageCircle/> WhatsApp</a>{selected.email && <a className="button" href={`mailto:${selected.email}?subject=${encodeURIComponent(`DIVA Candles inquiry ${selected.inquiryNumber}`)}`}><Mail/> Email</a>}{!selected.emailNotificationSent && <button className="button" onClick={retryEmail}><RefreshCw/> Retry notification</button>}<button className="button" onClick={() => setStatus("CONTACTED")}>Mark Contacted</button><button className="button" onClick={() => setStatus("CONVERTED")}>Mark Converted</button><button className="button" onClick={() => setStatus("CLOSED")}>Close</button><button className="button" onClick={() => setStatus("SPAM")}>Mark Spam</button><button className="button inquiry-delete" disabled={deleteInquiry.isPending} onClick={() => confirmRemove(selected)}><Trash2/> Delete Inquiry</button></div></div></div>}
  </div>;
}
