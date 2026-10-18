export interface ApartmentType {
  code: string;
  rooms: number;
  area: number;
  count: number;
}
export interface FloorPlan {
  id: string;
  label: string;
  year: number;
  usage: "residential" | "commercial";
  floorArea: number;
  serviceArea?: number;
  commonArea: number;
  apartments: readonly ApartmentType[];
}
const lowerApartments: readonly ApartmentType[] = [
  { code: "А", rooms: 3, area: 70.10, count: 1 },
  { code: "Б", rooms: 2, area: 46.00, count: 1 },
  { code: "В", rooms: 3, area: 60.78, count: 1 },
  { code: "Г", rooms: 2, area: 52.09, count: 1 },
  { code: "Д", rooms: 1, area: 34.59, count: 1 },
  { code: "Е1, Е2", rooms: 1, area: 32.79, count: 2 },
  { code: "Ё1, Ё2", rooms: 2, area: 50.61, count: 2 },
  { code: "Ж", rooms: 2, area: 65.33, count: 1 },
  { code: "З", rooms: 2, area: 56.21, count: 1 },
  { code: "И", rooms: 2, area: 52.84, count: 1 },
  { code: "К", rooms: 2, area: 44.79, count: 1 },
  { code: "Л", rooms: 2, area: 40.46, count: 1 },
];
const upperApartments: readonly ApartmentType[] = [
  ...lowerApartments.slice(0, 4),
  { code: "М1, М2", rooms: 2, area: 69.30, count: 2 },
  { code: "Н1, Н2", rooms: 2, area: 53.92, count: 2 },
  { code: "О", rooms: 3, area: 87.43, count: 1 },
  ...lowerApartments.slice(-3),
];
export const floorPlans: readonly FloorPlan[] = [
  { id: "floor-1", label: "1-р давхар", year: 2022, usage: "commercial", floorArea: 813.43, serviceArea: 409.64, commonArea: 244.23, apartments: [] },
  { id: "floors-2-3", label: "2–3-р давхар", year: 2022, usage: "commercial", floorArea: 911.49, serviceArea: 488.20, commonArea: 309.30, apartments: [] },
  { id: "floors-4-10", label: "5–10-р давхар", year: 2023, usage: "residential", floorArea: 808.21, commonArea: 112.81, apartments: lowerApartments },
  { id: "floors-11-16", label: "11–16-р давхар", year: 2023, usage: "residential", floorArea: 808.89, commonArea: 103.55, apartments: upperApartments },
];
export function getFloorPlan(number: number): FloorPlan | undefined {
  if (!Number.isInteger(number) || number < 1 || number > 16 || number === 4) return undefined;
  return floorPlans[number === 1 ? 0 : number <= 3 ? 1 : number <= 10 ? 2 : 3];
}
export function countPlannedUnits(plan: FloorPlan): number {
  return plan.apartments.reduce((total, apartment) => total + apartment.count, 0);
}
export const plannedUnitCount = Array.from({ length: 16 }, (_, index) => getFloorPlan(index + 1))
  .reduce((total, plan) => total + (plan ? countPlannedUnits(plan) : 0), 0);
export const planAsset = (plan: FloorPlan, extension: "pdf" | "png") =>
  `/building/euro-plaza/${plan.id}.${extension}`;
