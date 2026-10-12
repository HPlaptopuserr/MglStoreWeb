export const RESTAURANT_DISCOUNT_TIME_ZONE = "Asia/Ulaanbaatar";

export type RestaurantDiscountScheduleLike = {
  isEnabled: boolean;
  percent: number;
  startMinute: number;
  endMinute: number;
  timeZone: string;
};

type RestaurantDiscountProductLike = {
  isRestaurantMenuItem: boolean;
  menuCategory?: string | null;
  kitchenStation?: string | null;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function parseRestaurantDiscountTime(value: unknown): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function formatRestaurantDiscountTime(value: number): string {
  const safeValue = Math.min(1439, Math.max(0, Math.floor(value)));
  const hour = Math.floor(safeValue / 60);
  const minute = safeValue % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getMinuteInTimeZone(
  date: Date,
  timeZone = RESTAURANT_DISCOUNT_TIME_ZONE,
): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value || 0,
  );
  return hour * 60 + minute;
}

export function isRestaurantDiscountActive(
  schedule: RestaurantDiscountScheduleLike | null | undefined,
  at = new Date(),
): boolean {
  if (
    !schedule?.isEnabled ||
    schedule.percent <= 0 ||
    schedule.startMinute === schedule.endMinute
  ) {
    return false;
  }

  const currentMinute = getMinuteInTimeZone(at, schedule.timeZone);
  if (schedule.startMinute < schedule.endMinute) {
    return (
      currentMinute >= schedule.startMinute &&
      currentMinute < schedule.endMinute
    );
  }

  return (
    currentMinute >= schedule.startMinute || currentMinute < schedule.endMinute
  );
}

export function calculateRestaurantDiscountAmount(
  unitPrice: number,
  percent: number,
): number {
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return 0;
  const safePercent = Math.min(99, Math.max(0, Math.floor(percent)));
  return roundMoney(unitPrice * (safePercent / 100));
}

export function isRestaurantDiscountEligibleProduct(
  product: RestaurantDiscountProductLike,
): boolean {
  return Boolean(
    product.isRestaurantMenuItem &&
    String(product.menuCategory || "").toUpperCase() !== "DRINK" &&
    String(product.kitchenStation || "").toUpperCase() !== "BAR",
  );
}

export function mapRestaurantDiscountSchedule(
  organizationId: string,
  schedule: RestaurantDiscountScheduleLike | null,
  at = new Date(),
) {
  const value = schedule || {
    isEnabled: false,
    percent: 20,
    startMinute: 9 * 60,
    endMinute: 17 * 60,
    timeZone: RESTAURANT_DISCOUNT_TIME_ZONE,
  };

  return {
    organizationId,
    isEnabled: value.isEnabled,
    percent: value.percent,
    startTime: formatRestaurantDiscountTime(value.startMinute),
    endTime: formatRestaurantDiscountTime(value.endMinute),
    timeZone: value.timeZone,
    isActive: isRestaurantDiscountActive(value, at),
  };
}
