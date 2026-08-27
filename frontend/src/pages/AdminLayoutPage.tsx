import { BookOpen, Boxes, BriefcaseBusiness, FileText, LayoutDashboard, LogOut, MessageSquareText, ReceiptIndianRupee, Settings, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { api, unwrap } from "../api/client";
import { BrandLogo } from "../components/BrandLogo";
import { DeveloperCredit } from "../components/DeveloperCredit";

export function AdminLayoutPage() {
  const navigate = useNavigate(); const { data: admin, isLoading, isError } = useQuery({ queryKey: ["admin-session"], queryFn: () => api.get("/admin/auth/me").then(unwrap<any>), retry: false });
  const links = [["Overview", "/admin/dashboard", LayoutDashboard], ["Products", "/admin/products", Boxes], ["Bulk Orders", "/admin/bulk-orders", BriefcaseBusiness], ["Team", "/admin/team", Users], ["Inquiries", "/admin/inquiries", MessageSquareText], ["FAQs", "/admin/faqs", BookOpen], ["Policies", "/admin/content", FileText], ["Expenses", "/admin/expenses", ReceiptIndianRupee], ["Settings", "/admin/settings", Settings]] as const;
  if (isLoading) return <div className="page-state">Checking secure session…</div>; if (isError || !admin) return <Navigate to="/admin/login" replace/>; if (admin.mustChangePassword) return <Navigate to="/admin/change-password" replace/>;
  return <div className="admin-shell"><aside><BrandLogo admin light/><nav>{links.map(([name, to, Icon]) => <NavLink key={to} to={to}><Icon/>{name}</NavLink>)}</nav><DeveloperCredit compact/><button onClick={async () => { await api.post("/admin/auth/logout"); navigate("/admin/login"); }}><LogOut/> Sign out</button></aside><main><Outlet/></main></div>;
}
