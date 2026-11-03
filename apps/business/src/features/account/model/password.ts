export type AccountContext = "building" | "buyer" | "workforce";
export function accountContext(value: unknown): AccountContext {
  return value === "workforce" || value === "buyer" ? value : "building";
}
export function loginPath(context: AccountContext): string {
  return context === "workforce"
    ? "/attendance/login"
    : context === "buyer"
      ? "/building/buyer-login"
      : "/building/login";
}
export function normalizeRecoveryPhone(value: string): string | null {
  const digits = value.replace(/[\s()+-]/g, "").replace(/^976(?=\d{8}$)/, "");
  return /^\d{8}$/.test(digits) ? digits : null;
}
export function passwordError(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < 6 || password.length > 72)
    return "Нууц үг 6–72 тэмдэгт байна.";
  if (new TextEncoder().encode(password).length > 72)
    return "Нууц үг UTF-8 хэмжээгээр 72 байтаас хэтрэхгүй байна.";
  if (password !== confirmation)
    return "Шинэ нууц үг давтан оруулсан утгатай таарахгүй байна.";
  return null;
}
