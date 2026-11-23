import type { RegisteredCreditBorrower } from "@mgl/types";
import { registeredBorrowerPhone } from "../utils/registered-credit-borrower";
import { posRequest } from "./_pos-client";

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
  const response: unknown = await posRequest(
    `/pos/credit-customers/registered-user?${parameters}`,
    {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    },
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
