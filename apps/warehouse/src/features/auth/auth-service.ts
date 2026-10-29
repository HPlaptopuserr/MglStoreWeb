import { API_BASE } from "@/lib/api";
import { storeSession } from "./session";

export async function signIn(identifier: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: identifier.trim(), password }),
  });
  const value: unknown = await response.json().catch(() => null);
  if (!value || typeof value !== "object")
    throw new Error("Сервертэй холбогдож чадсангүй.");
  const result = value as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      typeof result.message === "string"
        ? result.message
        : "Нэвтрэх мэдээлэл буруу байна.",
    );
  const token = result.accessToken || result.token;
  if (
    typeof token !== "string" ||
    !result.user ||
    typeof result.user !== "object"
  )
    throw new Error("Нэвтрэх хариу буруу байна.");
  const user = result.user as Record<string, unknown>;
  const optionalText = (key: string) =>
    typeof user[key] === "string" ? (user[key] as string) : undefined;
  if (
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.role !== "string"
  )
    throw new Error("Хэрэглэгчийн мэдээлэл дутуу байна.");
  storeSession(token, {
    id: user.id,
    email: user.email,
    role: user.role,
    name: optionalText("fullName") || optionalText("name") || user.email,
    orgRole: optionalText("orgRole"),
    organizationId: optionalText("organizationId"),
    organizationName: optionalText("organizationName"),
    warehouseName: optionalText("warehouseName") || "Агуулах",
  });
}
