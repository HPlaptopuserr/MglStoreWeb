import { API_BASE } from "@/lib/api";

export function resolveMediaUrl(url?: string | null) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }
  if (value.startsWith("//")) {
    return `${typeof window !== "undefined" ? window.location.protocol : "https:"}${value}`;
  }
  if (value.startsWith("/")) {
    return `${API_BASE}${value}`;
  }
  return value;
}
