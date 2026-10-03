import { API_BASE } from "@/lib/api";

export function resolveShipmentAssetUrl(url?: string | null) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return url.startsWith("/") ? `${API_BASE}${url}` : url;
}

export function isShipmentImageUrl(url?: string | null) {
  if (!url) return false;
  return (
    /^data:image\//i.test(url) ||
    /\.(png|jpe?g|webp|gif)(\?.*)?(#.*)?$/i.test(url)
  );
}
