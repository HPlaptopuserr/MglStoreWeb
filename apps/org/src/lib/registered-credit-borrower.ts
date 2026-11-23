import type { RegisteredCreditBorrower } from "@mgl/types";
import { registeredBorrowerPhone } from "./registered-credit-borrower-state";
import { API, authFetch } from "./api";

export async function lookupRegisteredCreditBorrower(
  organizationId: string,
  phone: string,
  signal?: AbortSignal,
): Promise<RegisteredCreditBorrower | null> {
  const canonicalPhone = registeredBorrowerPhone(phone);
  if (!organizationId.trim() || !canonicalPhone)
    throw new Error("Зөв 8 оронтой утасны дугаар оруулна уу.");
  const parameters = new URLSearchParams({
    organizationId,
    phone: canonicalPhone,
  });
  const timeout = AbortSignal.timeout(15_000);
  const result = await authFetch(
    `${API}/pos/credit-customers/registered-user?${parameters}`,
    {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: "no-store",
    },
  );
  const response: unknown = await result.json();
  if (!result.ok)
    throw new Error(
      response &&
        typeof response === "object" &&
        "message" in response &&
        typeof response.message === "string"
        ? response.message
        : "MGL хэрэглэгчийг шалгаж чадсангүй. Дахин оролдоно уу.",
    );
  if (!response || typeof response !== "object" || !("user" in response))
    throw new Error("MGL хэрэглэгчийн хариу буруу байна. Дахин шалгана уу.");
  const user: unknown = response.user;
  if (user === null) return null;
  if (
    !user ||
    typeof user !== "object" ||
    !("id" in user) ||
    typeof user.id !== "string" ||
    !user.id ||
    !("fullName" in user) ||
    typeof user.fullName !== "string" ||
    !user.fullName.trim() ||
    !("phoneNumber" in user) ||
    user.phoneNumber !== canonicalPhone ||
    !("email" in user) ||
    !(user.email === null || typeof user.email === "string")
  ) {
    throw new Error(
      "MGL хэрэглэгчийн мэдээлэл дугаар болон нэртэйгээ таарахгүй байна. Профайлаа шалгаад дахин оролдоно уу.",
    );
  }
  return {
    id: user.id,
    fullName: user.fullName,
    phoneNumber: canonicalPhone,
    email: user.email,
  };
}
