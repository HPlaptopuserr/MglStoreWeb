export function dispatchMoney(value: string | number | null): string {
  if (value === null) return "Үнэ хадгалаагүй";
  const [whole, decimal = ""] = String(value).split(".");
  const fraction = decimal.replace(/0+$/, "");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""} ₮`;
}
export function dispatchDate(value: string) {
  return new Date(value).toLocaleString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
