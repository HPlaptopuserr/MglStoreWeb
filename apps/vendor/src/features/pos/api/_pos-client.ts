import { API } from "@/lib/api";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
};

export class PosApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PosApiError";
    this.status = status;
  }
}

export async function posRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const csrfToken = getCsrfToken();
  if (csrfToken) headers["x-csrf-token"] = csrfToken;
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("vendor_token") || localStorage.getItem("admin_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let message = "POS request failed";

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        message = parsed?.message || parsed?.error || message;
      } catch {
        message = raw.slice(0, 220);
      }
    }

    throw new PosApiError(`${message} (HTTP ${res.status})`, res.status);
  }

  return (await res.json()) as T;
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
  return token || null;
}
