export const SESSION_UPDATED_EVENT = "warehouse-session-updated";
const TOKEN_KEY = "wms_token";
const USER_KEY = "wms_user";

export interface WarehouseSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  orgRole?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  warehouseName?: string;
}

export function storeSession(token: string, user: WarehouseSessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}

export function updateSessionName(name: string) {
  const stored: unknown = JSON.parse(localStorage.getItem(USER_KEY) || "null");
  if (stored && typeof stored === "object") {
    localStorage.setItem(USER_KEY, JSON.stringify({ ...stored, name }));
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }
}
