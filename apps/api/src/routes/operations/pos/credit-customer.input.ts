import { parseCreditWorkDetails } from "./credit-work-details";
import { buildCreditBorrowerId, buildCreditBorrowerKey } from "@mgl/types";
export function parseCreditCustomerInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Хүсэлтийн мэдээлэл буруу байна");
  const body = value as Record<string, unknown>;
  const text = (
    field: string,
    label: string,
    max: number,
    required = false,
  ) => {
    const value = body[field];
    if (value != null && typeof value !== "string")
      throw new Error(`${label} буруу байна`);
    const result = typeof value === "string" ? value.trim() : "";
    if ((required && !result) || result.length > max)
      throw new Error(
        `${label}${required ? " заавал бөглөнө," : ""} ${max} тэмдэгтээс хэтрэхгүй байна`,
      );
    return result;
  };
  const targetType = body.targetType;
  if (targetType !== "CUSTOMER" && targetType !== "COMPANY")
    throw new Error("Хэрэглэгчийн төрлийг сонгоно уу");
  const organizationId = text("organizationId", "Байгууллага", 100, true);
  const borrowerName = text("borrowerName", "Нэр", 120, true);
  const borrowerPhone = text("borrowerPhone", "Утас", 30, true);
  if (
    !/^[+\d\s()-]+$/.test(borrowerPhone) ||
    !/^\d{8,15}$/.test(borrowerPhone.replace(/\D/g, ""))
  )
    throw new Error("Утасны дугаар 8–15 оронтой байна");
  const borrowerEmail = text("borrowerEmail", "И-мэйл", 254);
  if (borrowerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(borrowerEmail))
    throw new Error("И-мэйл хаяг буруу байна");
  const borrowerAddress = text("borrowerAddress", "Хаяг", 500);
  const employeeName =
    targetType === "COMPANY"
      ? text("employeeName", "Холбоо барих ажилтан", 120, true)
      : "";
  const borrowerId = buildCreditBorrowerId(
    targetType,
    borrowerName,
    borrowerPhone,
    employeeName,
  );
  const employeeId = targetType === "COMPANY" ? `${borrowerId}-employee` : null;
  return {
    organizationId,
    targetType,
    borrowerName,
    borrowerId,
    borrowerPhone,
    borrowerEmail: borrowerEmail || null,
    borrowerAddress: borrowerAddress || null,
    ...parseCreditWorkDetails({ workplace: body.workplace ?? null, department: body.department ?? null, jobTitle: body.jobTitle ?? null }),
    employeeName: employeeName || null,
    employeeId,
    normalizedBorrowerKey: buildCreditBorrowerKey({
      targetType,
      borrowerId,
      employeeId,
    }),
  };
}
