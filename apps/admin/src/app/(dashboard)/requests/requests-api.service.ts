import { API, API_BASE, adminFetch } from "@/lib/api";
import type { TabType } from "./request.model";

export const requestsApi = {
  primary: (tab: TabType, params: URLSearchParams) => {
    const resource =
      tab === "partners" ? "partner-requests" : "job-applications";
    return adminFetch(`${API_BASE}/api/${resource}?${params}`, {
      cache: "no-store",
    });
  },
  stock: () => adminFetch(`${API}/stock-requests`, { cache: "no-store" }),
  service: () => adminFetch(`${API}/service-requests`, { cache: "no-store" }),
  cardTerminals: (status: string) => {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
    return adminFetch(`${API}/admin/card-terminal-requests${suffix}`, {
      cache: "no-store",
    });
  },
  decidePrimary: (tab: TabType, id: string, decision: "approve" | "reject") => {
    const resource =
      tab === "partners" ? "partner-requests" : "job-applications";
    return adminFetch(`${API_BASE}/api/${resource}/${id}/${decision}`, {
      method: "PATCH",
    });
  },
  updateCardTerminal: (
    id: string,
    payload: {
      status: string;
      cardTerminalId?: string;
      terminalBridgeUrl?: string;
      adminNote?: string;
    },
  ) =>
    adminFetch(`${API}/admin/card-terminal-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
