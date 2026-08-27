import { ImagePlus, Plus, Save, Trash2, UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, unwrap } from "../api/client";
import type { TeamMember } from "../types";
import { useDialog } from "../components/DialogSystem";

function TeamEditor({ member, onSaved }: { member?: TeamMember; onSaved: () => void }) {
  const dialog = useDialog();
  const [photo, setPhoto] = useState<File>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget);
    const input = { name: form.get("name"), designation: form.get("designation"), description: form.get("description"), displayOrder: Number(form.get("displayOrder")), isFounder: form.get("isFounder") === "on", isActive: form.get("isActive") === "on" };
    try { const saved = member ? await api.patch(`/admin/team/${member.id}`, input).then(unwrap<TeamMember>) : await api.post("/admin/team", input).then(unwrap<TeamMember>); if (photo) { const body = new FormData(); body.append("image", photo); await api.post(`/admin/team/${saved.id}/photo`, body); } toast.success("Team member saved"); onSaved(); }
    catch (error: any) { toast.error(error.response?.data?.error?.message ?? "Team member could not be saved"); }
    finally { setSaving(false); }
  }

  async function deletePhoto() {
    if (!member || !await dialog.confirm({ title: "Remove team photo?", message: `Remove ${member.name}'s photo?`, confirmLabel: "Remove", dangerous: true })) return;
    try { await api.delete(`/admin/team/${member.id}/photo`); toast.success("Team photo removed"); onSaved(); }
    catch (error: any) { toast.error(error.response?.data?.error?.message ?? "Team photo could not be removed"); }
  }

  return <form className="team-admin-card" onSubmit={submit}>
    <div className="team-admin-photo">
      {member?.profileImageUrl ? <img src={member.profileImageUrl} alt=""/> : <UserRound/>}
      <label><ImagePlus/> Photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0])}/></label>
      {member?.profileImageUrl && <button type="button" className="photo-delete" onClick={deletePhoto}><Trash2/> Remove photo</button>}
    </div>
    <div className="team-admin-fields"><label>Name<input name="name" defaultValue={member?.name} required/></label><label>Designation<input name="designation" defaultValue={member?.designation} required/></label><label>Display order<input name="displayOrder" type="number" min="0" defaultValue={member?.displayOrder ?? 0} required/></label><label className="full">Description<textarea name="description" rows={4} defaultValue={member?.description} required/></label><div className="checks full"><label><input name="isFounder" type="checkbox" defaultChecked={member?.isFounder}/> Founder</label><label><input name="isActive" type="checkbox" defaultChecked={member?.isActive ?? true}/> Active</label></div><button className="button primary" disabled={saving}><Save/> {saving ? "Saving…" : "Save member"}</button></div>
  </form>;
}

export function AdminTeamPage() {
  const dialog = useDialog();
  const qc = useQueryClient(); const [adding, setAdding] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-team"], queryFn: () => api.get("/admin/team").then(unwrap<TeamMember[]>) });
  const refresh = () => { setAdding(false); qc.invalidateQueries({ queryKey: ["admin-team"] }); qc.invalidateQueries({ queryKey: ["team"] }); };
  async function remove(member: TeamMember) { if (!await dialog.confirm({ title: "Delete team member?", message: `Delete ${member.name}?`, confirmLabel: "Delete", dangerous: true })) return; await api.delete(`/admin/team/${member.id}`); toast.success("Team member deleted"); refresh(); }
  return <div className="admin-page"><header><div><p className="eyebrow">PEOPLE</p><h1>Core team</h1></div><button className="button primary" onClick={() => setAdding(!adding)}><Plus/> Add member</button></header>{adding && <TeamEditor onSaved={refresh}/>} {isLoading ? <p>Loading team…</p> : <div className="team-admin-list">{data.map((member) => <div key={member.id} className="team-admin-wrap"><TeamEditor member={member} onSaved={refresh}/><button className="team-delete" onClick={() => remove(member)}><Trash2/> Delete</button></div>)}</div>}</div>;
}
