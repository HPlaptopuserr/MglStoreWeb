import type { MembershipType } from "./_types";

export type FeatureRow = {
  text: string;
  enabled: boolean;
};

export function getFeatureRows(desc: string): FeatureRow[] {
  return desc
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((text) => ({
      text: text.replace(/^[-+]\s*/, ""),
      enabled: !text.startsWith("-"),
    }));
}

export function createMembershipType(index: number): MembershipType {
  return {
    value: `CUSTOM_${Date.now()}_${index + 1}`,
    label: `Шинэ card ${index + 1}`,
    price: "0₮ / сар",
    desc: "Шинэ feature мөр\n- Disabled feature мөр",
    durations: [
      { months: 1, price: 0, label: "1 сар" },
      { months: 6, price: 0, label: "6 сар" },
    ],
  };
}
