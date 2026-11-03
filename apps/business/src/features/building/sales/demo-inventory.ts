export type UnitKind = "apartment" | "commercial" | "garage" | "parking";
export type UnitStatus = "available" | "reserved" | "sold" | "hold" | "contract" | "cancelled";
export interface SalesUnit {
  id: string;
  number: string;
  label?: string;
  planShapeId?: string;
  statusKnown?: boolean;
  kind: UnitKind;
  floor: number;
  rooms: number | null;
  area: number | null;
  price: number;
  priceKnown?: boolean;
  planSlot?: number;
  status: UnitStatus;
}
export const kinds: { id: UnitKind; label: string; description: string }[] = [
  {
    id: "apartment",
    label: "Орон сууц",
    description: "4–16 давхар · давхар бүр 4 байр",
  },
  {
    id: "commercial",
    label: "Үйлчилгээ",
    description: "1–3 давхар · тус бүр 400 м²",
  },
  {
    id: "garage",
    label: "Дулаан гарааш",
    description: "B1, B2 · тус бүр 500 автомашин",
  },
  {
    id: "parking",
    label: "Гадна зогсоол",
    description: "Гадна талбай · 1,000 автомашин",
  },
];
export const statusLabels: Record<UnitStatus, string> = {
  hold: "Түр хаасан",
  contract: "Гэрээ хүлээгдэж буй",
  cancelled: "Цуцлагдсан",
  available: "Боломжтой",
  reserved: "Захиалгатай",
  sold: "Зарагдсан",
};
export const unitTitle = (unit: SalesUnit) => unit.label || `№ ${unit.number}`;
export const unitStatusLabel = (unit: SalesUnit) => unit.statusKnown === false ? "Бүртгэлтэй холбоогүй" : statusLabels[unit.status];
export const unitAreaLabel = (unit: SalesUnit) => unit.area !== null ? `${unit.area} м²` : unit.kind === "garage" || unit.kind === "parking" ? "1 автомашин" : "Талбай оруулаагүй";
export const money = (value: number) =>
  `${new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 1 }).format(value / 1_000_000)} сая ₮`;
function status(index: number): UnitStatus {
  return index % 11 === 0 ? "sold" : index % 7 === 0 ? "reserved" : "available";
}
export function createDemoInventory(): SalesUnit[] {
  const apartments = Array.from({ length: 13 }, (_, f) =>
    [33, 44, 70, 90].map(
      (area, i): SalesUnit => ({
        id: `apt-${f + 4}-${i + 1}`,
        number: `${f + 4}${String(i + 1).padStart(2, "0")}`,
        kind: "apartment",
        floor: f + 4,
        rooms: i + 1,
        area,
        price: area * 4_500_000,
        status: status(f * 4 + i + 1),
      }),
    ),
  ).flat();
  const commercial = Array.from(
    { length: 3 },
    (_, i): SalesUnit => ({
      id: `commercial-${i + 1}`,
      number: `S-${i + 1}01`,
      kind: "commercial",
      floor: i + 1,
      rooms: null,
      area: 400,
      price: 400 * 6_000_000,
      status: "available",
    }),
  );
  const spaces = (kind: "garage" | "parking"): SalesUnit[] =>
    Array.from({ length: 1000 }, (_, i) => ({
      id: `${kind}-${i + 1}`,
      number: `${kind === "garage" ? `B${i < 500 ? 1 : 2}` : "P"}-${String(kind === "garage" ? (i % 500) + 1 : i + 1).padStart(3, "0")}`,
      kind,
      floor: kind === "garage" ? (i < 500 ? -1 : -2) : 0,
      rooms: null,
      area: null,
      price: kind === "garage" ? 40_000_000 : 15_000_000,
      status: status(i + 1),
    }));
  return [
    ...apartments,
    ...commercial,
    ...spaces("garage"),
    ...spaces("parking"),
  ];
}
export const floorLabel = (floor: number) =>
  floor > 0
    ? `${floor} давхар`
    : floor < 0
      ? `B${Math.abs(floor)}`
      : "Гадна талбай";
