import type { SupplyPosBinding } from "@mgl/types";
import type { MaterialDraft } from "./supply-draft";

export type SupplyDraftBackup = {
  materials: MaterialDraft[];
  posBindings: SupplyPosBinding[];
  version: number;
};
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const unit = (value: unknown) =>
  value === "kg" || value === "l" || value === "pcs";
const material = (value: unknown): value is MaterialDraft =>
  record(value) &&
  text(value.id) &&
  text(value.name) &&
  unit(value.unit) &&
  text(value.openingQuantity) &&
  (value.openingUnitPrice === undefined || text(value.openingUnitPrice)) &&
  (value.identityLocked === undefined ||
    typeof value.identityLocked === "boolean") &&
  Array.isArray(value.receipts) &&
  value.receipts.every(
    (row: unknown) =>
      record(row) &&
      text(row.id) &&
      text(row.date) &&
      text(row.quantity) &&
      text(row.unitPrice) &&
      text(row.supplier),
  ) &&
  Array.isArray(value.usages) &&
  value.usages.every(
    (row: unknown) =>
      record(row) &&
      text(row.id) &&
      text(row.date) &&
      text(row.quantity) &&
      text(row.dishName) &&
      (row.productId === null || text(row.productId)),
  );
const binding = (value: unknown): value is SupplyPosBinding =>
  record(value) &&
  unit(value.unit) &&
  text(value.productId) &&
  text(value.materialId) &&
  text(value.ingredientName) &&
  typeof value.ingredientIndex === "number" &&
  Number.isSafeInteger(value.ingredientIndex) &&
  value.ingredientIndex >= 0;

export const supplyDraftKey = (
  userId: string,
  organizationId: string,
  month: string,
) =>
  `mgl:supply-draft:v1:${encodeURIComponent(userId)}:${encodeURIComponent(organizationId)}:${month}`;

export function decodeSupplyDraftBackup(
  raw: string | null,
): SupplyDraftBackup | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !record(value) ||
      typeof value.version !== "number" ||
      !Number.isSafeInteger(value.version) ||
      value.version < 0 ||
      !Array.isArray(value.materials) ||
      value.materials.length > 100 ||
      !value.materials.every(material) ||
      !Array.isArray(value.posBindings) ||
      !value.posBindings.every(binding)
    )
      return null;
    return {
      materials: value.materials,
      posBindings: value.posBindings,
      version: value.version,
    };
  } catch {
    return null;
  }
}

// Lock metadata must not make an otherwise unchanged in-flight draft look dirty.
export function supplyDraftSignature(
  materials: MaterialDraft[],
  posBindings: SupplyPosBinding[],
) {
  return JSON.stringify({
    materials: materials.map((material) => {
      const value = { ...material };
      delete value.identityLocked;
      return value;
    }),
    posBindings,
  });
}
