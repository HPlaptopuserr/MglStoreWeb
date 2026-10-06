export const SHIFT_HISTORY_RANGE_OPTIONS = [
  { id: "7", label: "7 хоног", description: "Сүүлийн 7 хоногийн", days: 7 },
  { id: "14", label: "14 хоног", description: "Сүүлийн 14 хоногийн", days: 14 },
  { id: "30", label: "30 хоног", description: "Сүүлийн 30 хоногийн", days: 30 },
  {
    id: "100",
    label: "100 хаалт",
    description: "Сүүлийн 100 хаалтын",
    days: null,
  },
] as const;
export type ShiftHistoryRangeId =
  (typeof SHIFT_HISTORY_RANGE_OPTIONS)[number]["id"];
