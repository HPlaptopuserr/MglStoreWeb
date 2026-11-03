import { API, authFetch } from "@/lib/api";

export type ProtectedSectionScope =
  | "PRODUCTS"
  | "REPORTS"
  | "RESTAURANT_POS"
  | "CUSTOMERS";

export type AccessPinStatus = {
  configured: boolean;
  updatedAt: string | null;
  canManage: boolean;
};

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message || "PIN кодын хүсэлт амжилтгүй боллоо.");
  }
  return data;
}

export async function getAccessPinStatus(
  organizationId: string,
): Promise<AccessPinStatus> {
  const query = new URLSearchParams({ organizationId });
  const response = await authFetch(
    `${API}/org/access-pin/status?${query.toString()}`,
    { cache: "no-store" },
  );
  return readResponse<AccessPinStatus>(response);
}

export async function saveAccessPin(organizationId: string, pin: string) {
  const response = await authFetch(`${API}/org/access-pin`, {
    method: "PUT",
    body: JSON.stringify({ organizationId, pin }),
  });
  return readResponse<AccessPinStatus & { message?: string }>(response);
}

export async function removeAccessPin(organizationId: string) {
  const response = await authFetch(`${API}/org/access-pin`, {
    method: "DELETE",
    body: JSON.stringify({ organizationId }),
  });
  return readResponse<AccessPinStatus>(response);
}

export async function verifyAccessPin(
  organizationId: string,
  scope: ProtectedSectionScope,
  pin: string,
) {
  const response = await authFetch(`${API}/org/access-pin/verify`, {
    method: "POST",
    body: JSON.stringify({ organizationId, scope, pin }),
  });
  return readResponse<{ verified: boolean }>(response);
}
