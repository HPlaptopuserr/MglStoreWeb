export function formatRestaurantOrderNumber(
  ticketNo: string | null | undefined,
  ticketId?: string | null,
) {
  const digits = String(ticketNo || "").replace(/\D/g, "");
  if (digits) return digits.slice(-3).padStart(3, "0");

  const hash = String(ticketId || "")
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return String(hash % 1000).padStart(3, "0");
}
