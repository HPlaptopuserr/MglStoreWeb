import type { StatisticsInsights } from "@/lib/statistics-api";

export type StatisticsWindow = 7 | 30 | 90 | "all";

export const dayOptions: { value: StatisticsWindow; label: string }[] = [
  { value: 7, label: "7 өдөр" },
  { value: 30, label: "30 өдөр" },
  { value: 90, label: "90 өдөр" },
  { value: "all", label: "Бүх хугацаа" },
];

export function money(value: number) {
  return new Intl.NumberFormat("mn-MN", {
    style: "currency",
    currency: "MNT",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function compact(value: number) {
  return new Intl.NumberFormat("mn-MN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

export function trendText(value: number) {
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

export function metricValue(value: number, unit: string) {
  if (unit === "MNT") return money(value);
  if (unit === "%") return `${value}%`;
  return compact(value);
}

export function windowLabel(value: StatisticsInsights["windowDays"]) {
  return value === "all" ? "Бүх хугацаа" : `${value} өдөр`;
}
