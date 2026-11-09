import {
  recipeBindingKey,
  type RecipeSaleSource,
  type RecipeSaleConsumption,
  type SupplyPosBinding,
} from "./recipe-consumption";
export const SUPPLY_UNITS = ["kg", "l", "pcs"] as const;
export type SupplyUnit = (typeof SUPPLY_UNITS)[number];
export type SupplyReceipt = {
  id: string;
  date: string;
  quantity: number;
  unitPrice: number;
  supplier: string;
};
export type SupplyUsage = {
  id: string;
  date: string;
  quantity: number;
  productId: string | null;
  dishName: string;
};
export type SupplyMaterial = {
  openingUnitPrice?: number | null;
  id: string;
  name: string;
  unit: SupplyUnit;
  openingQuantity: number;
  receipts: SupplyReceipt[];
  usages: SupplyUsage[];
};
export type SupplyMonth = {
  materials: SupplyMaterial[];
  posBindings?: SupplyPosBinding[];
};
export type MaterialSupplySummary = {
  unitCost: number | null;
  stockCost: number | null;
  id: string;
  name: string;
  unit: SupplyUnit;
  openingQuantity: number;
  receivedQuantity: number;
  usedQuantity: number;
  posUsedQuantity: number;
  remainingQuantity: number;
  purchaseCost: number;
  dishes: Array<{
    productId: string | null;
    name: string;
    quantity: number;
    soldServings?: number;
  }>;
};
export type SupplyMonthResponse = {
  month: string;
  data: SupplyMonth;
  version: number;
  updatedAt: string | null;
  summary: MaterialSupplySummary[];
  totalPurchaseCost: number;
  posSources: RecipeSaleSource[];
  uncapturedSaleLines: number;
};
export const isSupplyMonth = (value: unknown): value is string =>
  typeof value === "string" && /^(20\d{2})-(0[1-9]|1[0-2])$/.test(value);
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const amount = (value: unknown, positive = false): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= (positive ? 0.000001 : 0) &&
  value <= 1000000 &&
  Math.abs(value * 1000000 - Math.round(value * 1000000)) < 0.00001;
const dateInMonth = (value: unknown, month: string): value is string => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !value.startsWith(`${month}-`)
  )
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};
export function parseSupplyMonth(
  month: string,
  value: unknown,
): { ok: true; value: SupplyMonth } | { ok: false; message: string } {
  if (
    !isSupplyMonth(month) ||
    !record(value) ||
    !Array.isArray(value.materials) ||
    value.materials.length > 100
  )
    return {
      ok: false,
      message:
        "Сар эсвэл хангамжийн мэдээлэл буруу байна (100 хүртэл түүхий эд)",
    };
  const ids = new Set<string>();
  const names = new Set<string>();
  let entries = 0;
  const takeId = (id: unknown): id is string => {
    if (!text(id, 100) || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  const materials: SupplyMaterial[] = [];
  for (const [index, item] of value.materials.entries()) {
    const prefix = `${index + 1}-р түүхий эд: `;
    if (
      !record(item) ||
      !takeId(item.id) ||
      !text(item.name, 160) ||
      !SUPPLY_UNITS.some((unit) => unit === item.unit)
    )
      return { ok: false, message: prefix + "нэр, нэгжийг зөв оруулна уу" };
    const normalizedName = item.name.trim().replace(/\s+/g, " ");
    if (names.has(normalizedName.toLocaleLowerCase()))
      return {
        ok: false,
        message: prefix + "ижил нэртэй түүхий эд давхардсан байна",
      };
    names.add(normalizedName.toLocaleLowerCase());
    if (
      !amount(item.openingQuantity) ||
      (item.unit === "pcs" && !Number.isInteger(item.openingQuantity))
    )
      return {
        ok: false,
        message:
          prefix +
          "эхний үлдэгдэл 0-ээс багагүй, кг/л 6 хүртэл оронтой, ширхэг бүхэл байна",
      };
    if (
      item.openingUnitPrice !== undefined &&
      item.openingUnitPrice !== null &&
      (typeof item.openingUnitPrice !== "number" ||
        !Number.isFinite(item.openingUnitPrice) ||
        item.openingUnitPrice < 0 ||
        item.openingUnitPrice > 1000000000 ||
        Math.abs(
          item.openingUnitPrice * 100 - Math.round(item.openingUnitPrice * 100),
        ) > 0.00001 ||
        item.openingQuantity * item.openingUnitPrice > 1000000000000)
    )
      return {
        ok: false,
        message:
          prefix +
          "авсан нэгж үнэ 0-1,000,000,000₮, 2 хүртэл бутархай оронтой байна",
      };
    if (
      !Array.isArray(item.receipts) ||
      !Array.isArray(item.usages) ||
      item.receipts.length > 100 ||
      item.usages.length > 300
    )
      return {
        ok: false,
        message: prefix + "орлого 100, зарцуулалт 300 хүртэл мөр байна",
      };
    entries += item.receipts.length + item.usages.length;
    if (entries > 3000)
      return {
        ok: false,
        message: "Нэг сарын орлого, зарцуулалт нийт 3000 хүртэл мөр байна",
      };
    const receipts: SupplyReceipt[] = [];
    for (const row of item.receipts) {
      if (
        !record(row) ||
        !takeId(row.id) ||
        !dateInMonth(row.date, month) ||
        !amount(row.quantity, true) ||
        (item.unit === "pcs" && !Number.isInteger(row.quantity)) ||
        typeof row.unitPrice !== "number" ||
        !Number.isFinite(row.unitPrice) ||
        row.unitPrice < 0 ||
        row.unitPrice > 1000000000 ||
        typeof row.supplier !== "string" ||
        row.supplier.length > 160
      )
        return {
          ok: false,
          message: prefix + "орлогын огноо, хэмжээ, нэгж үнийг шалгана уу",
        };
      receipts.push({
        id: row.id,
        date: row.date,
        quantity: row.quantity,
        unitPrice: Math.round(row.unitPrice * 100) / 100,
        supplier: row.supplier.trim(),
      });
    }
    const usages: SupplyUsage[] = [];
    for (const row of item.usages) {
      if (
        !record(row) ||
        !takeId(row.id) ||
        !dateInMonth(row.date, month) ||
        !amount(row.quantity, true) ||
        (item.unit === "pcs" && !Number.isInteger(row.quantity)) ||
        !text(row.dishName, 160) ||
        !(row.productId === null || text(row.productId, 100))
      )
        return {
          ok: false,
          message:
            prefix + "зарцуулалтын огноо, хоолны нэр, хэмжээг шалгана уу",
        };
      usages.push({
        id: row.id,
        date: row.date,
        quantity: row.quantity,
        productId: row.productId,
        dishName: row.dishName.trim(),
      });
    }
    const totalCost = receipts.reduce(
      (sum, row) => sum + row.quantity * row.unitPrice,
      0,
    );
    if (totalCost > 1000000000000)
      return {
        ok: false,
        message:
          prefix + "орлогын нийт дүн хэт их байна. Нэгж, үнийг шалгана уу",
      };
    materials.push({
      id: item.id,
      name: normalizedName,
      unit: item.unit as SupplyUnit,
      openingQuantity: item.openingQuantity,
      ...(item.openingUnitPrice === undefined
        ? {}
        : { openingUnitPrice: item.openingUnitPrice as number | null }),
      receipts,
      usages,
    });
  }
  if (
    materials.reduce(
      (sum, item) =>
        sum +
        item.receipts.reduce(
          (total, row) => total + row.quantity * row.unitPrice,
          0,
        ),
      0,
    ) > 1000000000000
  )
    return {
      ok: false,
      message: "Сарын нийт худалдан авалтын дүн хэт их байна",
    };
  const posBindings: SupplyPosBinding[] = [];
  if (value.posBindings !== undefined) {
    if (!Array.isArray(value.posBindings) || value.posBindings.length > 10000)
      return { ok: false, message: "POS орцын холбоосын мэдээлэл буруу байна" };
    const materialIds = new Set(materials.map((item) => item.id));
    const keys = new Set<string>();
    for (const binding of value.posBindings) {
      if (
        !record(binding) ||
        !text(binding.productId, 100) ||
        typeof binding.ingredientIndex !== "number" ||
        !Number.isInteger(binding.ingredientIndex) ||
        binding.ingredientIndex < 0 ||
        binding.ingredientIndex > 99 ||
        !text(binding.ingredientName, 160) ||
        !text(binding.materialId, 100) ||
        !materialIds.has(binding.materialId) ||
        !SUPPLY_UNITS.some((unit) => unit === binding.unit) ||
        materials.find((material) => material.id === binding.materialId)
          ?.unit !== binding.unit
      )
        return {
          ok: false,
          message:
            "Жорын орцыг энэ сарын хангамжийн материалтай зөв холбоно уу",
        };
      const key = recipeBindingKey(
        binding.productId,
        binding.ingredientIndex,
        binding.ingredientName,
        binding.unit as SupplyUnit,
      );
      if (keys.has(key))
        return { ok: false, message: "POS орцын холбоос давхардсан байна" };
      keys.add(key);
      posBindings.push({
        productId: binding.productId,
        ingredientIndex: binding.ingredientIndex,
        ingredientName: binding.ingredientName.trim(),
        unit: binding.unit as SupplyUnit,
        materialId: binding.materialId,
      });
    }
  }
  return {
    ok: true,
    value: {
      materials,
      ...(value.posBindings === undefined ? {} : { posBindings }),
    },
  };
}
export function summarizeSupplyMonth(
  data: SupplyMonth,
  posConsumptions: readonly RecipeSaleConsumption[] = [],
): MaterialSupplySummary[] {
  return data.materials.map((item) => {
    const received = item.receipts.reduce(
      (sum, row) => sum + Math.round(row.quantity * 1000000),
      0,
    );
    const manualUsed = item.usages.reduce(
      (sum, row) => sum + Math.round(row.quantity * 1000000),
      0,
    );
    const dishes = new Map<
      string,
      {
        productId: string | null;
        name: string;
        micros: number;
        soldServings?: number;
      }
    >();
    for (const row of item.usages) {
      const key = row.productId
        ? `id:${row.productId}`
        : `name:${row.dishName.toLocaleLowerCase()}`;
      const existing = dishes.get(key) ?? {
        productId: row.productId,
        name: row.dishName,
        micros: 0,
      };
      existing.micros += Math.round(row.quantity * 1000000);
      dishes.set(key, existing);
    }
    let posMicros = 0;
    for (const consumption of posConsumptions) {
      const micros = consumption.lines
        .filter((line) => line.materialId === item.id)
        .reduce((sum, line) => sum + Math.round(line.quantity * 1000000), 0);
      if (!micros) continue;
      posMicros += micros;
      const key = `id:${consumption.productId}`;
      const existing = dishes.get(key) ?? {
        productId: consumption.productId,
        name: consumption.productName,
        micros: 0,
        soldServings: 0,
      };
      existing.micros += micros;
      existing.soldServings =
        (existing.soldServings ?? 0) + consumption.servings;
      dishes.set(key, existing);
    }
    const purchaseCost =
      item.receipts.reduce(
        (sum, row) => sum + Math.round(row.quantity * row.unitPrice * 100),
        0,
      ) / 100;
    const availableQuantity = item.openingQuantity + received / 1000000;
    const stockCost =
      item.openingQuantity > 0 && item.openingUnitPrice == null
        ? null
        : Math.round(
            (item.openingQuantity * (item.openingUnitPrice ?? 0) +
              purchaseCost) *
              100,
          ) / 100;
    const unitCost =
      availableQuantity > 0
        ? stockCost === null
          ? null
          : Math.round((stockCost / availableQuantity) * 1000000) / 1000000
        : (item.openingUnitPrice ?? null);
    const used = manualUsed + posMicros;
    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      openingQuantity: item.openingQuantity,
      receivedQuantity: received / 1000000,
      usedQuantity: used / 1000000,
      posUsedQuantity: posMicros / 1000000,
      remainingQuantity:
        (Math.round(item.openingQuantity * 1000000) + received - used) /
        1000000,
      purchaseCost,
      stockCost,
      unitCost,
      dishes: [...dishes.values()].map((row) => ({
        productId: row.productId,
        name: row.name,
        quantity: row.micros / 1000000,
        ...(row.soldServings ? { soldServings: row.soldServings } : {}),
      })),
    };
  });
}
