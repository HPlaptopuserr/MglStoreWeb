/** Only unfinished preparation belongs on the live kitchen display. */
export const KITCHEN_QUEUE_STATUSES = ["NEW", "PREPARING"] as const;

export type KitchenQueueStatus = (typeof KITCHEN_QUEUE_STATUSES)[number];

export function isKitchenQueueStatus(
  status: string,
): status is KitchenQueueStatus {
  return KITCHEN_QUEUE_STATUSES.some((queueStatus) => queueStatus === status);
}
