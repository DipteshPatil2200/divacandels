import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { PageTransitionLoader } from "./components/PageTransitionLoader";

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const ShopPage = lazy(() => import("./pages/ShopPage").then((module) => ({ default: module.ShopPage })));
const ProductPage = lazy(() => import("./pages/ProductPage").then((module) => ({ default: module.ProductPage })));
const InquiryPage = lazy(() => import("./pages/InquiryPage").then((module) => ({ default: module.InquiryPage })));
const BulkOrdersPage = lazy(() => import("./pages/BulkOrdersPage").then((module) => ({ default: module.BulkOrdersPage })));
const CartPage = lazy(() => import("./pages/CartPage").then((module) => ({ default: module.CartPage })));
const contentPages = () => import("./pages/ContentPages");
const AboutPage = lazy(() => contentPages().then((module) => ({ default: module.AboutPage })));
const TeamPage = lazy(() => contentPages().then((module) => ({ default: module.TeamPage })));
const CarePage = lazy(() => contentPages().then((module) => ({ default: module.CarePage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const legalPages = () => import("./pages/LegalPages");
const FAQPage = lazy(() => legalPages().then((module) => ({ default: module.FAQPage })));
const PolicyPage = lazy(() => legalPages().then((module) => ({ default: module.PolicyPage })));
const adminPages = () => import("./pages/AdminPages");
const AdminLoginPage = lazy(() => adminPages().then((module) => ({ default: module.AdminLoginPage })));
const ChangePasswordPage = lazy(() => adminPages().then((module) => ({ default: module.ChangePasswordPage })));
const AdminLayout = lazy(() => import("./pages/AdminLayoutPage").then((module) => ({ default: module.AdminLayoutPage })));
const AdminDashboard = lazy(() => adminPages().then((module) => ({ default: module.AdminDashboard })));
const AdminProductsPage = lazy(() => adminPages().then((module) => ({ default: module.AdminProductsPage })));
const AdminProductForm = lazy(() => adminPages().then((module) => ({ default: module.AdminProductForm })));
const AdminInquiriesPage = lazy(() => import("./pages/AdminInquiriesPage").then((module) => ({ default: module.AdminInquiriesPage })));
const AdminSettingsPage = lazy(() => import("./pages/AdminSettingsPage").then((module) => ({ default: module.AdminSettingsPage })));
const AdminTeamPage = lazy(() => import("./pages/AdminTeamPage").then((module) => ({ default: module.AdminTeamPage })));
const AdminBulkPage = lazy(() => import("./pages/AdminBulkPage").then((module) => ({ default: module.AdminBulkPage })));
const AdminExpensesPage = lazy(() => import("./pages/AdminExpensesPage").then((module) => ({ default: module.AdminExpensesPage })));
const AdminFAQPage = lazy(() => import("./pages/AdminFAQPage").then((module) => ({ default: module.AdminFAQPage })));
const AdminContentPage = lazy(() => import("./pages/AdminContentPage").then((module) => ({ default: module.AdminContentPage })));

export default function App() { return <><PageTransitionLoader/><Suspense fallback={<div className="route-loader" role="status"><div><span className="route-loader-ring"/><strong>DIVA Candles</strong><small>Illuminating your experience…</small></div></div>}><Routes>
  <Route element={<Layout/>}>
    <Route index element={<HomePage/>}/><Route path="shop" element={<ShopPage/>}/><Route path="product/:slug" element={<ProductPage/>}/><Route path="products/:slug" element={<ProductPage/>}/><Route path="about" element={<AboutPage/>}/><Route path="about/team" element={<TeamPage/>}/><Route path="bulk-orders" element={<BulkOrdersPage/>}/><Route path="custom-orders" element={<InquiryPage type="CUSTOM_ORDER"/>}/><Route path="contact" element={<ContactPage/>}/><Route path="cart" element={<CartPage/>}/><Route path="candle-care" element={<CarePage/>}/><Route path="faqs" element={<FAQPage/>}/><Route path="faq" element={<Navigate to="/faqs" replace/>}/><Route path="terms-and-conditions" element={<PolicyPage pageKey="TERMS"/>}/><Route path="privacy-policy" element={<PolicyPage pageKey="PRIVACY_POLICY"/>}/><Route path="shipping-policy" element={<PolicyPage pageKey="SHIPPING_POLICY"/>}/><Route path="return-refund-policy" element={<PolicyPage pageKey="RETURN_REFUND_POLICY"/>}/><Route path="terms" element={<Navigate to="/terms-and-conditions" replace/>}/><Route path="privacy" element={<Navigate to="/privacy-policy" replace/>}/><Route path="shipping" element={<Navigate to="/shipping-policy" replace/>}/><Route path="returns" element={<Navigate to="/return-refund-policy" replace/>}/><Route path="*" element={<section className="page-state"><h1>404 — This light has wandered.</h1><a href="/">Return home</a></section>}/>
  </Route>
  <Route path="admin/login" element={<AdminLoginPage/>}/><Route path="admin/change-password" element={<ChangePasswordPage/>}/>
  <Route path="admin" element={<AdminLayout/>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<AdminDashboard/>}/><Route path="products" element={<AdminProductsPage/>}/><Route path="products/new" element={<AdminProductForm/>}/><Route path="products/:id" element={<AdminProductForm/>}/><Route path="bulk-orders" element={<AdminBulkPage/>}/><Route path="team" element={<AdminTeamPage/>}/><Route path="inquiries" element={<AdminInquiriesPage/>}/><Route path="expenses" element={<AdminExpensesPage/>}/><Route path="faqs" element={<AdminFAQPage/>}/><Route path="content" element={<AdminContentPage/>}/><Route path="settings" element={<AdminSettingsPage/>}/></Route>
  <Route path="/admin/*" element={<Navigate to="/admin/login" replace/>}/>
</Routes></Suspense></>; }
