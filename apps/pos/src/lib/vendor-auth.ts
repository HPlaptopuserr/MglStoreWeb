import { API_BASE } from "@/lib/api";

const PHONE_PATTERN = /^[0-9+\-\s()]{7,16}$/;

type VendorLoginPayload =
  | { email: string; password: string }
  | { phone: string; password: string };

function buildVendorLoginPayload(
  identifier: string,
  password: string,
): VendorLoginPayload {
  const value = identifier.trim();
  const isPhone = PHONE_PATTERN.test(value) && !value.includes("@");

  return isPhone
    ? { phone: value, password }
    : { email: value.toLowerCase(), password };
}

export async function loginVendorUser(identifier: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/vendor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildVendorLoginPayload(identifier, password)),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Нэвтрэх үед алдаа гарлаа");
  }

  if (!data.user?.orgRole && !data.user?.organizationId) {
    throw new Error("Байгууллагад бүртгэлтэй хэрэглэгч биш байна");
  }

  localStorage.setItem("vendor_token", data.accessToken);

  const meResponse = await fetch(`${API_BASE}/auth/me`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });
  const me = meResponse.ok ? await meResponse.json().catch(() => ({})) : {};
  const nextUser = { ...data.user, ...me };

  if (!nextUser.organizationId) {
    localStorage.removeItem("vendor_token");
    throw new Error("Байгууллагын мэдээлэл олдсонгүй. Vendor portal дээр байгууллага сонгосон эсэхээ шалгана уу.");
  }

  localStorage.setItem("vendor_user", JSON.stringify(nextUser));
}
