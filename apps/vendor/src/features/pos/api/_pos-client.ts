import { API } from "@/lib/api";
import { posErrorMessage } from "./pos-error-message";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
};

export class PosApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PosApiError";
    this.status = status;
    this.code = code;
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
    const message = posErrorMessage(raw, res.status);

    let code: string | undefined;
    try {
      const data: unknown = JSON.parse(raw);
      if (data && typeof data === "object" && "code" in data && typeof data.code === "string") code = data.code;
    } catch { /* Non-JSON errors have no machine-readable code. */ }
    throw new PosApiError(`${message} (HTTP ${res.status})`, res.status, code);
  }

  return (await res.json()) as T;
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
  return token || null;
}
