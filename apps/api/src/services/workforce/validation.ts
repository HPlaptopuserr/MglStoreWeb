import { WorkforceError } from "./access";
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new WorkforceError(400, "Мэдээллийн бүтэц буруу");
  return value as Record<string, unknown>;
}
export function text(
  value: unknown,
  label: string,
  maximum = 500,
  optional = false,
): string {
  if (optional && (value === undefined || value === null || value === ""))
    return "";
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maximum
  )
    throw new WorkforceError(400, `${label}: 1–${maximum} тэмдэгт оруулна уу`);
  return value.trim();
}
export function number(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new WorkforceError(400, `${label}: ${min}–${max} хооронд байна`);
  return value;
}
export function integer(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  const result = number(value, label, min, max);
  if (!Number.isInteger(result))
    throw new WorkforceError(400, `${label}: бүхэл тоо байна`);
  return result;
}
export function strings(value: unknown, label: string, max = 1000): string[] {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    value.some((v) => typeof v !== "string" || !v.trim())
  )
    throw new WorkforceError(400, `${label}: жагсаалт буруу`);
  return [...new Set(value as string[])];
}
export function date(value: unknown, label: string): Date {
  const raw = text(value, label, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z)?$/.test(raw))
    throw new WorkforceError(400, `${label}: огноо, цаг буруу`);
  const parsed = new Date(raw.endsWith("Z") ? raw : `${raw}Z`);
  if (
    !Number.isFinite(+parsed) ||
    parsed.toISOString().slice(0, 10) !== raw.slice(0, 10)
  )
    throw new WorkforceError(400, `${label}: огноо буруу`);
  return parsed;
}
