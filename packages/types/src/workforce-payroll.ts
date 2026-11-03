export interface WorkforcePayrollAccount {
  payrollBankName: string;
  payrollAccountNumber: string;
  payrollAccountHolder: string;
}
export const payrollAccountFields = [
  "payrollBankName",
  "payrollAccountNumber",
  "payrollAccountHolder",
] as const;
export function normalizePayrollAccountNumber(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}
export function payrollAccountError(
  account: WorkforcePayrollAccount,
): string | null {
  const bank = account.payrollBankName.trim();
  const number = normalizePayrollAccountNumber(account.payrollAccountNumber);
  const holder = account.payrollAccountHolder.trim();
  if (!bank && !number && !holder) return null;
  if (!bank || !number || !holder)
    return "Банк, дансны дугаар, данс эзэмшигчийн нэрийг бүрэн оруулна уу.";
  if (bank.length > 120 || holder.length > 150)
    return "Банк эсвэл данс эзэмшигчийн нэр хэт урт байна.";
  if (!/^[A-Z0-9]{6,34}$/.test(number) || !/\d/.test(number))
    return "Дансны дугаар / IBAN нь 6–34 үсэг, цифрээс бүрдэнэ. Дугаараа шалгана уу.";
  return null;
}
export function maskPayrollAccountNumber(value: string): string {
  return value ? `•••• ${value.slice(-4)}` : "";
}
