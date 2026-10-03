export const formatReportMoney = (value: number) =>
  `₮${value.toLocaleString("mn-MN", { maximumFractionDigits: 2 })}`;

export const formatReportQuantity = (value: number) =>
  value.toLocaleString("mn-MN", { maximumFractionDigits: 3 });

export const formatSaleDateTime = (value: string) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));

export const formatReportPercent = (value: number | null) =>
  value == null
    ? "—"
    : `${value.toLocaleString("mn-MN", { maximumFractionDigits: 2 })}%`;
export const formatHistoricalCost = (value: number | null) =>
  value == null ? "Мэдээлэл дутуу" : formatReportMoney(value);
