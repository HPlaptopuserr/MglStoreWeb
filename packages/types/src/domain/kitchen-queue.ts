/** Only unfinished preparation belongs on the live kitchen display. */
export const KITCHEN_QUEUE_STATUSES = ["NEW", "PREPARING"] as const;

export type KitchenQueueStatus = (typeof KITCHEN_QUEUE_STATUSES)[number];

export function isKitchenQueueStatus(
  status: string,
): status is KitchenQueueStatus {
  return KITCHEN_QUEUE_STATUSES.some((queueStatus) => queueStatus === status);
}

export const KITCHEN_TIME_ZONE = "Asia/Ulaanbaatar";
export type KitchenQueuePeriod = "today" | "previous";

const kitchenDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: KITCHEN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(value: number): string {
  const parts = kitchenDate.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Keep unfinished history accessible without mixing it into today's work. */
export function partitionKitchenQueue<
  T extends { status: string; sentAt: string },
>(tickets: readonly T[], now: number): Record<KitchenQueuePeriod, T[]> {
  const today = dateKey(now);
  const queues: Record<KitchenQueuePeriod, T[]> = { today: [], previous: [] };
  for (const ticket of tickets) {
    if (!isKitchenQueueStatus(ticket.status)) continue;
    const sentAt = Date.parse(ticket.sentAt);
    // Preserve malformed/future timestamps in the main queue for visibility.
    const period =
      Number.isFinite(sentAt) && dateKey(sentAt) < today ? "previous" : "today";
    queues[period].push(ticket);
  }
  return queues;
}
