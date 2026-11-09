import { MGL_CLUB_PROVINCES } from "@mgl/types";
export const COMMUNITY_LOCATIONS = [
  "Улаанбаатар",
  ...MGL_CLUB_PROVINCES,
  "Гадаадад",
] as const;
export const UNSPECIFIED_LOCATION = "__unspecified__";
const key = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("mn")
    .replace(/\s+(аймаг|хот)$/iu, "")
    .replace(/[-\s]/g, "");
export function normalizeCommunityLocation(value: string): string {
  const normalized = key(value);
  if (["уб", "ub", "ulaanbaatar"].includes(normalized)) return "Улаанбаатар";
  if (normalized === "дархан") return "Дархан-Уул";
  if (normalized === "эрдэнэт") return "Орхон";
  return (
    COMMUNITY_LOCATIONS.find((location) => key(location) === normalized) ||
    value.trim()
  );
}
export function communityLocationLabel(value: string): string {
  if (value === "Дархан-Уул") return "Дархан-Уул / Дархан";
  if (value === "Орхон") return "Орхон / Эрдэнэт";
  return value;
}
export function matchesCommunityLocation(
  actual: string,
  selected: string,
): boolean {
  if (!selected) return true;
  if (selected === UNSPECIFIED_LOCATION) return !actual.trim();
  return (
    normalizeCommunityLocation(actual) === normalizeCommunityLocation(selected)
  );
}
