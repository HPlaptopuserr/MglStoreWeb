import { API_BASE, OrgUser, saveOrgSession } from "@/lib/api";

const PHONE_PATTERN = /^[0-9+\-\s()]{7,15}$/;

type LoginPayload =
  | { email: string; password: string }
  | { phone: string; password: string };

function buildLoginPayload(identifier: string, password: string): LoginPayload {
  const value = identifier.trim();
  const isPhone = PHONE_PATTERN.test(value) && !value.includes("@");
  return isPhone
    ? { phone: value, password }
    : { email: value.toLowerCase(), password };
}

export async function loginOrgUser(identifier: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/vendor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildLoginPayload(identifier, password)),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Нэвтрэх үед алдаа гарлаа.");
  }

  if (!data.user?.organizationId) {
    throw new Error("Энэ хэрэглэгч байгууллагын эрхтэй холбогдоогүй байна.");
  }

  saveOrgSession(data.accessToken, data.user as OrgUser);
}
