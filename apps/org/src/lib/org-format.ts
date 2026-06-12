export const money = (value?: number) =>
  `₮${Number(value || 0).toLocaleString("mn-MN")}`;

export function initials(value?: string | null) {
  return (value || "ORG").trim().slice(0, 2).toUpperCase();
}
