import type { RegisteredCreditBorrower } from "@mgl/types";
import { registeredBorrowerPhone } from "../utils/registered-credit-borrower";
import { posRequest } from "./_pos-client";

export type ExpectedCreditBorrowerLink = {
  id: string;
  customerId: string | null;
  borrowerId: string;
  borrowerPhone: string | null;
  borrowerUserId: string | null;
};
export type LinkExistingCreditBorrowerInput = {
  organizationId: string;
  creditSaleIds: string[];
  expectedCredits: ExpectedCreditBorrowerLink[];
  borrowerUserId: string;
  borrowerPhone: string;
  companyName?: string;
};
export type LinkExistingCreditBorrowerResult = {
  linkedCreditSaleIds: string[];
  borrowerUserId: string;
  linkedCount: number;
  user: RegisteredCreditBorrower;
};

export async function linkExistingCreditBorrower(
  input: LinkExistingCreditBorrowerInput,
  signal?: AbortSignal,
): Promise<LinkExistingCreditBorrowerResult> {
  const phone = registeredBorrowerPhone(input.borrowerPhone);
  const ids = new Set(input.creditSaleIds);
  if (
    !input.organizationId ||
    !input.borrowerUserId ||
    !phone ||
    ids.size === 0 ||
    ids.size !== input.creditSaleIds.length ||
    input.expectedCredits.length !== ids.size ||
    input.expectedCredits.some((credit) => !ids.has(credit.id)) ||
    new Set(input.expectedCredits.map((credit) => credit.id)).size !== ids.size
  ) {
    throw new Error(
      "Холбох зээл болон MGL хэрэглэгчийн мэдээлэл дутуу байна. Жагсаалтаа шинэчилнэ үү.",
    );
  }
  const timeout = AbortSignal.timeout(30_000);
  const result = await posRequest<LinkExistingCreditBorrowerResult>(
    "/pos/credit-customers/link-existing",
    {
      method: "POST",
      body: { ...input, borrowerPhone: phone },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    },
  );
  if (
    !result ||
    result.borrowerUserId !== input.borrowerUserId ||
    result.linkedCount !== ids.size ||
    result.user?.id !== input.borrowerUserId ||
    result.user.phoneNumber !== phone ||
    !Array.isArray(result.linkedCreditSaleIds) ||
    result.linkedCreditSaleIds.length !== ids.size ||
    new Set(result.linkedCreditSaleIds).size !== ids.size ||
    result.linkedCreditSaleIds.some((id) => !ids.has(id))
  ) {
    throw new Error(
      "Холболтын хариу хүсэлттэй таарахгүй байна. Зээлийн жагсаалтаа шинэчилж шалгана уу.",
    );
  }
  return result;
}
