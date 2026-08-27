const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

function apiOrigin(apiBaseUrl: string) {
  try { return new URL(apiBaseUrl, globalThis.location?.origin ?? "http://localhost").origin; }
  catch { return ""; }
}

/** Resolve both new relative upload paths and legacy absolute upload URLs. */
export function resolveImageUrl(url: string, apiBaseUrl = defaultApiBaseUrl) {
  const value = url.trim();
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return value;
  try {
    const parsed = new URL(value, globalThis.location?.origin ?? "http://localhost");
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${apiOrigin(apiBaseUrl)}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch { /* Keep malformed external values unchanged so the browser can report them. */ }
  return value;
}

export function deliveryImageUrl(url: string, width: number) {
  const resolved = resolveImageUrl(url);
  if (!resolved.includes("res.cloudinary.com/") || !resolved.includes("/upload/")) return resolved;
  return resolved.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

export function imageSrcSet(url: string) {
  if (!resolveImageUrl(url).includes("res.cloudinary.com/")) return undefined;
  return [200, 400, 800].map((width) => `${deliveryImageUrl(url, width)} ${width}w`).join(", ");
}
