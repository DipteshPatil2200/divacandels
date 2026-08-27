import axios from "axios";
import { resolveImageUrl } from "../services/images";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1", withCredentials: true, timeout: 15000 });

function resolveResponseImages(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(resolveResponseImages);
  if (!value || typeof value !== "object") return value;
  for (const [key, item] of Object.entries(value)) {
    if ((key === "imageUrl" || key === "profileImageUrl") && typeof item === "string") {
      (value as Record<string, unknown>)[key] = resolveImageUrl(item);
    } else {
      (value as Record<string, unknown>)[key] = resolveResponseImages(item);
    }
  }
  return value;
}

api.interceptors.response.use((response) => {
  response.data = resolveResponseImages(response.data);
  return response;
}, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original?._retried && !String(original?.url).includes("/auth/")) {
    original._retried = true;
    try { await api.post("/admin/auth/refresh"); return api(original); } catch { /* login required */ }
  }
  return Promise.reject(error);
});

export const unwrap = <T,>(response: { data: { data: T } }) => response.data.data;
