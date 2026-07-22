import type { StatisticsInsights } from "@/lib/statistics-api";

export type StatisticsWindow = 7 | 30 | 90 | "all";

export const dayOptions: { value: StatisticsWindow; label: string }[] = [
  { value: 7, label: "Сүүлийн 7 хоног" },
  { value: 30, label: "Сүүлийн 30 хоног" },
  { value: 90, label: "Сүүлийн 90 хоног" },
  { value: "all", label: "Бүх хугацаа" },
];

export function money(value: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
  return `${formatted} ₮`;
}

export function compact(value: number) {
  return new Intl.NumberFormat("mn-MN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

export function trendText(value: number | null) {
  if (value === null) return "Харьцуулахгүй";
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

export function metricValue(value: number, unit: string) {
  if (unit === "MNT") return money(value);
  if (unit === "%") return `${value}%`;
  return compact(value);
}

export function windowLabel(value: StatisticsInsights["windowDays"]) {
  return value === "all" ? "Бүх хугацаа" : `Сүүлийн ${value} хоног`;
}
