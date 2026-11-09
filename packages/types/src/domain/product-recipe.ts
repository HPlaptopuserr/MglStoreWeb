export const RECIPE_UNITS = ["g", "kg", "ml", "l", "pcs"] as const;
export type RecipeUnit = (typeof RECIPE_UNITS)[number];
export const RECIPE_KINDS = ["FOOD", "COFFEE", "BUBBLE_TEA", "OTHER"] as const;
export type RecipeKind = (typeof RECIPE_KINDS)[number];

export type RecipeIngredient = {
  materialId?: string;
  name: string;
  quantity: number;
  unit: RecipeUnit;
  packageQuantity: number;
  packageUnit: RecipeUnit;
  packagePrice: number | null;
};

export type ProductRecipe = {
  kind: RecipeKind;
  yieldQuantity: number;
  servingLabel: string;
  ingredients: RecipeIngredient[];
  laborCost: number;
  overheadCost: number;
  instructions: string;
};

export type RecipeCost = {
  lineCosts: Array<number | null>;
  knownIngredientsCost: number;
  missingPriceCount: number;
  batchCost: number | null;
  unitCost: number | null;
};

const UNIT_FACTORS: Record<RecipeUnit, { dimension: string; factor: number }> =
  {
    g: { dimension: "mass", factor: 1 },
    kg: { dimension: "mass", factor: 1000 },
    ml: { dimension: "volume", factor: 1 },
    l: { dimension: "volume", factor: 1000 },
    pcs: { dimension: "count", factor: 1 },
  };

export const compatibleRecipeUnits = (a: RecipeUnit, b: RecipeUnit): boolean =>
  UNIT_FACTORS[a].dimension === UNIT_FACTORS[b].dimension;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isUnit = (value: unknown): value is RecipeUnit =>
  typeof value === "string" && RECIPE_UNITS.some((unit) => unit === value);
const validNumber = (
  value: unknown,
  max: number,
  positive = false,
): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  (positive ? value >= 0.000001 : value >= 0) &&
  value <= max;

export type RecipeParseResult =
  | { ok: true; value: ProductRecipe }
  | { ok: false; message: string };

/** Reject missing or incompatible inputs rather than silently treating them as zero. */
export function parseProductRecipe(input: unknown): RecipeParseResult {
  if (!isRecord(input))
    return { ok: false, message: "Жорын мэдээлэл буруу байна" };
  if (!RECIPE_KINDS.some((kind) => kind === input.kind))
    return { ok: false, message: "Жорын төрөл сонгоно уу" };
  if (!validNumber(input.yieldQuantity, 1000000, true))
    return {
      ok: false,
      message: "Жороос гарах бүтээгдэхүүний тоо 0-ээс их байна",
    };
  if (
    typeof input.servingLabel !== "string" ||
    !input.servingLabel.trim() ||
    input.servingLabel.length > 100
  )
    return {
      ok: false,
      message:
        "Нэгж бүтээгдэхүүний хэмжээ, порцыг оруулна уу (100 тэмдэгт хүртэл)",
    };
  if (
    !validNumber(input.laborCost, 1000000000) ||
    !validNumber(input.overheadCost, 1000000000)
  )
    return {
      ok: false,
      message: "Цалин болон бусад зардал 0-1,000,000,000₮ байна",
    };
  if (
    typeof input.instructions !== "string" ||
    input.instructions.length > 10000
  )
    return { ok: false, message: "Бэлтгэх заавар 10,000 тэмдэгт хүртэл байна" };
  if (
    !Array.isArray(input.ingredients) ||
    !input.ingredients.length ||
    input.ingredients.length > 100
  )
    return { ok: false, message: "Жор 1-100 мөр орцтой байна" };
  const ingredients: RecipeIngredient[] = [];
  for (const [index, row] of input.ingredients.entries()) {
    const prefix = `${index + 1}-р орц: `;
    if (
      !isRecord(row) ||
      typeof row.name !== "string" ||
      !row.name.trim() ||
      row.name.length > 160
    )
      return {
        ok: false,
        message: prefix + "нэр оруулна уу (160 тэмдэгт хүртэл)",
      };
    if (
      row.materialId !== undefined &&
      (typeof row.materialId !== "string" ||
        !row.materialId.trim() ||
        row.materialId.length > 160)
    )
      return { ok: false, message: prefix + "хангамжийн материал буруу байна" };
    if (
      !validNumber(row.quantity, 1000000, true) ||
      !validNumber(row.packageQuantity, 1000000, true)
    )
      return {
        ok: false,
        message:
          prefix +
          "орох болон савлагааны хэмжээ 0-ээс их, 1,000,000 хүртэл байна",
      };
    if (
      !isUnit(row.unit) ||
      !isUnit(row.packageUnit) ||
      !compatibleRecipeUnits(row.unit, row.packageUnit)
    )
      return {
        ok: false,
        message: prefix + "гр/кг, мл/л эсвэл ширхэгийн тохирох нэгж сонгоно уу",
      };
    if (row.unit === "pcs" && !Number.isInteger(row.quantity))
      return {
        ok: false,
        message: prefix + "ширхэгийн хэмжээ бүхэл тоо байна",
      };
    if (row.packageUnit === "pcs" && !Number.isInteger(row.packageQuantity))
      return {
        ok: false,
        message: prefix + "савлагааны ширхэг бүхэл тоо байна",
      };
    if (row.packagePrice !== null && !validNumber(row.packagePrice, 1000000000))
      return {
        ok: false,
        message: prefix + "савлагааны үнэ 0-1,000,000,000₮ байна",
      };
    const ratio =
      (row.quantity * UNIT_FACTORS[row.unit].factor) /
      (row.packageQuantity * UNIT_FACTORS[row.packageUnit].factor);
    if (
      !Number.isFinite(ratio) ||
      (row.packagePrice !== null && ratio * row.packagePrice > 1000000000)
    )
      return {
        ok: false,
        message:
          prefix + "тооцоолох өртөг хэт их байна. Хэмжээ, нэгжээ шалгана уу",
      };
    ingredients.push({
      ...(row.materialId === undefined ? {} : { materialId: row.materialId }),
      name: row.name.trim(),
      quantity: row.quantity,
      unit: row.unit,
      packageQuantity: row.packageQuantity,
      packageUnit: row.packageUnit,
      packagePrice: row.packagePrice,
    });
  }
  const knownTotal =
    ingredients.reduce(
      (sum, row) =>
        sum +
        (row.packagePrice === null
          ? 0
          : ((row.quantity * UNIT_FACTORS[row.unit].factor) /
              (row.packageQuantity * UNIT_FACTORS[row.packageUnit].factor)) *
            row.packagePrice),
      0,
    ) +
    input.laborCost +
    input.overheadCost;
  if (
    !Number.isFinite(knownTotal) ||
    knownTotal > 1000000000 ||
    knownTotal / input.yieldQuantity > 1000000000
  )
    return {
      ok: false,
      message:
        "Нийт эсвэл нэгжийн өртөг 1,000,000,000₮-өөс их байна. Хэмжээ, нэгжээ шалгана уу",
    };
  return {
    ok: true,
    value: {
      kind: input.kind as RecipeKind,
      yieldQuantity: input.yieldQuantity,
      servingLabel: input.servingLabel.trim(),
      ingredients,
      laborCost: input.laborCost,
      overheadCost: input.overheadCost,
      instructions: input.instructions.trim(),
    },
  };
}

/** All inputs are MNT. Round each ingredient to cents, then total the same displayed lines. */
export function calculateRecipeCost(recipe: ProductRecipe): RecipeCost {
  const lineCents = recipe.ingredients.map((row) =>
    row.packagePrice === null
      ? null
      : Math.round(
          (((row.quantity * UNIT_FACTORS[row.unit].factor) /
            (row.packageQuantity * UNIT_FACTORS[row.packageUnit].factor)) *
            row.packagePrice +
            Number.EPSILON) *
            100,
        ),
  );
  const knownCents = lineCents.reduce<number>(
    (total, value) => total + (value ?? 0),
    0,
  );
  const missingPriceCount = lineCents.filter((value) => value === null).length;
  const batchCents = missingPriceCount
    ? null
    : knownCents +
      Math.round(recipe.laborCost * 100) +
      Math.round(recipe.overheadCost * 100);
  return {
    lineCosts: lineCents.map((value) => (value === null ? null : value / 100)),
    knownIngredientsCost: knownCents / 100,
    missingPriceCount,
    batchCost: batchCents === null ? null : batchCents / 100,
    unitCost:
      batchCents === null
        ? null
        : Math.round(batchCents / recipe.yieldQuantity) / 100,
  };
}

export type RecipeSupplyChoice = {
  id: string;
  name: string;
  unit: "kg" | "l" | "pcs";
  unitPrice: number | null;
};
export type ProductRecipeResponse = {
  supply?: { month: string; materials: RecipeSupplyChoice[] };

  recipe: ProductRecipe | null;
  version: number;
  updatedAt: string | null;
  cost: RecipeCost | null;
};
