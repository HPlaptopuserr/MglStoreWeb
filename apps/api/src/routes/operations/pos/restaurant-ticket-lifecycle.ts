export type PaidRestaurantTicketStatus = "PAID" | "CLOSED";

/**
 * A paid table ticket stays occupied until staff explicitly clears the table.
 * Table-less tickets (for example, self-service kiosk orders) have nothing to
 * clear and must be closed as part of payment finalization.
 */
export function resolvePaidRestaurantTicketStatus(
  tableId: string | null | undefined,
): PaidRestaurantTicketStatus {
  return tableId ? "PAID" : "CLOSED";
}
