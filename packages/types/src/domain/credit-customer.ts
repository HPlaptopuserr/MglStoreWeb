export type CreditCustomerTarget = "CUSTOMER" | "COMPANY";
const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яөүё-]/gi, "")
    .slice(0, 60);
export function buildCreditBorrowerId(
  targetType: CreditCustomerTarget,
  name: string,
  phone: string,
  employeeName: string,
) {
  const phoneKey = phone.replace(/\D/g, "");
  return targetType === "CUSTOMER"
    ? `customer-${phoneKey || slug(name)}`
    : `company-${slug(name) || "company"}-${phoneKey || slug(employeeName) || "contact"}`;
}
export function buildCreditBorrowerKey(credit: {
  targetType?: string;
  borrowerId?: string;
  employeeId?: string | null;
}) {
  return [
    credit.targetType?.trim().toUpperCase() || "",
    credit.borrowerId?.trim().toLowerCase() || "",
    credit.employeeId?.trim().toLowerCase() || "",
  ].join(":");
}
