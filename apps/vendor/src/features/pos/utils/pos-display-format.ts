export const formatMoney = (value: number) =>
  `₮${Math.round(Number(value) || 0).toLocaleString("mn-MN")}`;
const padTimePart = (value: number) => String(value).padStart(2, "0");
export const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()} оны ${date.getMonth() + 1}-р сарын ${date.getDate()} ${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
};
