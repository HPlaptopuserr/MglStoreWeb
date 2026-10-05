export function formatMerchantDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("mn-MN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ulaanbaatar" }).format(new Date(value)) : "Бүртгэгдээгүй";
}

