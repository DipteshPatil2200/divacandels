import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { DialogProvider } from "./components/DialogSystem";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
createRoot(document.getElementById("root")!).render(<StrictMode><HelmetProvider><QueryClientProvider client={client}><DialogProvider><CartProvider><BrowserRouter><App/></BrowserRouter><Toaster richColors position="top-right"/></CartProvider></DialogProvider></QueryClientProvider></HelmetProvider></StrictMode>);
