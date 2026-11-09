import { bindPendingRecipeSnapshots } from "../../services/pos-recipe-snapshot.service";
import { readSupplyPosSources } from "../../services/supply-pos-consumption.service";
import { Router, type Router as ExpressRouter } from "express";
import { prisma, Prisma } from "@mgl/database";
import {
  Permission,
  parseProductRecipe,
  analyzePosRecipeConsumption,
  type RecipeSaleSource,
  isSupplyMonth,
  parseSupplyMonth,
  summarizeSupplyMonth,
  type SupplyMonth,
  type SupplyMonthResponse,
} from "@mgl/types";
import { requireAuth } from "../../middleware/auth";
import { requireOrgPermission } from "../../services/permission.service";

const router: ExpressRouter = Router();
const access = requireOrgPermission(
  { from: "query" },
  Permission.MANAGE_PRODUCTS,
);
class SupplyConflict extends Error {}
const responseData = (
  month: string,
  data: SupplyMonth,
  version: number,
  updatedAt: Date | null,
  posSources: RecipeSaleSource[] = [],
  uncapturedSaleLines = 0,
): SupplyMonthResponse => {
  const analysis = analyzePosRecipeConsumption(
    data.materials,
    data.posBindings ?? [],
    posSources,
  );
  const summary = summarizeSupplyMonth(data, analysis.consumptions);
  return {
    month,
    posSources,
    uncapturedSaleLines,
    data,
    version,
    updatedAt: updatedAt?.toISOString() ?? null,
    summary,
    totalPurchaseCost:
      summary.reduce(
        (sum, item) => sum + Math.round(item.purchaseCost * 100),
        0,
      ) / 100,
  };
};

router.get(
  "/restaurant/supply-month",
  requireAuth,
  access,
  async (req, res) => {
    try {
      const organizationId = String(req.query.organizationId);
      const month = req.query.month;
      if (!isSupplyMonth(month))
        return res
          .status(400)
          .json({ message: "Сараа YYYY-MM хэлбэрээр сонгоно уу" });
      const [stored, products, pos] = await Promise.all([
        prisma.restaurantSupplyMonth.findUnique({
          where: { organizationId_month: { organizationId, month } },
        }),
        prisma.product.findMany({
          where: {
            organizationId,
            managedByWarehouseId: null,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            recipe: { select: { data: true, version: true } },
          },
          orderBy: { name: "asc" },
          take: 1000,
        }),
        readSupplyPosSources(prisma, organizationId, month),
      ]);
      const parsed = parseSupplyMonth(month, stored?.data ?? { materials: [] });
      if (!parsed.ok) throw new Error("Stored monthly supply data is invalid");
      res.setHeader("Cache-Control", "no-store");
      return res.json({
        ...responseData(
          month,
          parsed.value,
          stored?.version ?? 0,
          stored?.updatedAt ?? null,
          pos.posSources,
          pos.uncapturedSaleLines,
        ),
        products: products.map((product) => {
          const recipe = product.recipe
            ? parseProductRecipe(product.recipe.data)
            : null;
          return {
            id: product.id,
            name: product.name,
            recipe: recipe?.ok ? recipe.value : null,
            recipeVersion: product.recipe?.version ?? 0,
          };
        }),
      });
    } catch (error) {
      console.error("Read restaurant supply month failed", error);
      return res
        .status(500)
        .json({ message: "Сарын хангамжийн мэдээлэл авч чадсангүй" });
    }
  },
);

router.put(
  "/restaurant/supply-month",
  requireAuth,
  access,
  async (req, res) => {
    try {
      const organizationId = String(req.query.organizationId);
      const month = req.query.month;
      if (!isSupplyMonth(month))
        return res.status(400).json({ message: "Сар буруу байна" });
      const input: unknown = req.body;
      if (!input || typeof input !== "object" || Array.isArray(input))
        return res
          .status(400)
          .json({ message: "Хангамжийн мэдээлэл буруу байна" });
      const body = input as Record<string, unknown>;
      if (
        typeof body.expectedVersion !== "number" ||
        !Number.isSafeInteger(body.expectedVersion) ||
        body.expectedVersion < 0
      )
        return res
          .status(400)
          .json({ message: "Мэдээллийн хувилбар буруу байна" });
      const parsed = parseSupplyMonth(month, body.data);
      if (!parsed.ok) return res.status(400).json({ message: parsed.message });
      let data = parsed.value;
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
        const current = await tx.restaurantSupplyMonth.findUnique({
          where: { organizationId_month: { organizationId, month } },
          select: { version: true, data: true },
        });
        if ((current?.version ?? 0) !== body.expectedVersion)
          throw new SupplyConflict(
            "Энэ сарын мэдээллийг өөр хэрэглэгч шинэчилсэн байна. Өөрчлөлтөө тэмдэглээд дахин ачаална уу.",
          );
        if (current) {
          const old = parseSupplyMonth(month, current.data);
          if (!old.ok)
            throw new SupplyConflict(
              "Өмнөх сарын мэдээлэл буруу байна. Дахин ачаална уу.",
            );
          const previousMaterials = new Map(
            old.value.materials.map((material) => [material.id, material]),
          );
          for (const material of data.materials) {
            const previous = previousMaterials.get(material.id);
            if (
              material.openingUnitPrice === undefined &&
              previous?.openingUnitPrice !== undefined
            )
              material.openingUnitPrice = previous.openingUnitPrice;
            if (
              previous &&
              (previous.name !== material.name ||
                previous.unit !== material.unit)
            )
              throw new SupplyConflict(
                "Хадгалсан материалын нэр, хэмжих нэгжийг өөрчлөх боломжгүй. Өөр материал бол шинэ мөрөөр нэмнэ үү.",
              );
          }
          const retainedIds = new Set(
            data.materials.map((material) => material.id),
          );
          const removedIds = new Set(
            old.value.materials
              .filter((material) => !retainedIds.has(material.id))
              .map((material) => material.id),
          );
          if (removedIds.size) {
            const recipes = await tx.productRecipe.findMany({
              where: { product: { organizationId } },
              select: { data: true },
            });
            for (const stored of recipes) {
              const recipe = parseProductRecipe(stored.data);
              if (
                recipe.ok &&
                recipe.value.ingredients.some(
                  (ingredient) =>
                    ingredient.materialId &&
                    removedIds.has(ingredient.materialId),
                )
              )
                throw new SupplyConflict(
                  "Хоолны жорт холбосон материалыг устгах боломжгүй. Эхлээд бүтээгдэхүүний жорын холбоосоо өөрчилнө үү.",
                );
            }
          }
          if (data.posBindings === undefined && old.value.posBindings) {
            const merged = parseSupplyMonth(month, {
              ...data,
              posBindings: old.value.posBindings,
            });
            if (!merged.ok) throw new SupplyConflict(merged.message);
            data = merged.value;
          }
        }
        const productIds = [
          ...new Set([
            ...data.materials.flatMap((item) =>
              item.usages.flatMap((usage) =>
                usage.productId ? [usage.productId] : [],
              ),
            ),
            ...(data.posBindings ?? []).map((binding) => binding.productId),
          ]),
        ];
        if (productIds.length) {
          const owned = await tx.product.count({
            where: {
              id: { in: productIds },
              organizationId,
              managedByWarehouseId: null,
            },
          });
          if (owned !== productIds.length)
            throw new SupplyConflict(
              "Зарим хоол энэ байгууллагын бүтээгдэхүүнд хамаарахгүй байна",
            );
        }
        const json: Prisma.InputJsonObject = {
          ...(data.posBindings === undefined
            ? {}
            : {
                posBindings: data.posBindings.map((binding) => ({
                  ...binding,
                })),
              }),
          materials: data.materials.map((item) => ({
            ...item,
            receipts: item.receipts.map((row) => ({ ...row })),
            usages: item.usages.map((row) => ({ ...row })),
          })),
        };
        const existingPos = await readSupplyPosSources(
          tx,
          organizationId,
          month,
        );
        const materialUnits = new Map(
          data.materials.map((material) => [material.id, material.unit]),
        );
        for (const source of existingPos.posSources) {
          for (const binding of source.bindings ?? []) {
            if (materialUnits.get(binding.materialId) !== binding.unit)
              throw new SupplyConflict(
                "Борлуулалтад зарцуулагдсан материалыг устгах эсвэл нэгжийг солих боломжгүй",
              );
          }
        }
        await bindPendingRecipeSnapshots(tx, organizationId, month, data);
        const pos = await readSupplyPosSources(tx, organizationId, month);
        const stored = await tx.restaurantSupplyMonth.upsert({
          where: { organizationId_month: { organizationId, month } },
          create: { organizationId, month, data: json },
          update: { data: json, version: { increment: 1 } },
        });
        return { stored, pos };
      });
      const { stored, pos } = result;
      res.setHeader("Cache-Control", "no-store");
      return res.json(
        responseData(
          month,
          data,
          stored.version,
          stored.updatedAt,
          pos.posSources,
          pos.uncapturedSaleLines,
        ),
      );
    } catch (error) {
      if (error instanceof SupplyConflict)
        return res.status(409).json({ message: error.message });
      console.error("Save restaurant supply month failed", error);
      return res.status(500).json({ message: "Сарын хангамж хадгалагдсангүй" });
    }
  },
);
export default router;
