import { readRecipeSupply } from "../../services/recipe-supply.service";
import { Router, type Router as ExpressRouter } from "express";
import { prisma, Prisma } from "@mgl/database";
import {
  Permission,
  isSupplyMonth,
  compatibleRecipeUnits,
  parseProductRecipe,
  calculateRecipeCost,
  type ProductRecipeResponse,
} from "@mgl/types";
import { requireAuth } from "../../middleware/auth";
import { assertOrgPermission } from "../../services/permission.service";

const router: ExpressRouter = Router();
class RecipeConflict extends Error {}

router.get("/products/:id/recipe", requireAuth, async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: String(req.params.id), deletedAt: null },
      select: { id: true, organizationId: true, managedByWarehouseId: true },
    });
    if (!product || !product.organizationId || product.managedByWarehouseId)
      return res
        .status(404)
        .json({ message: "Байгууллагын бүтээгдэхүүн олдсонгүй" });
    if (
      !(await assertOrgPermission(
        req,
        res,
        product.organizationId,
        Permission.MANAGE_PRODUCTS,
      ))
    )
      return;
    const month = req.query.supplyMonth;
    if (month !== undefined && !isSupplyMonth(month))
      return res.status(400).json({ message: "Хангамжийн сар буруу байна" });
    const supply =
      month === undefined
        ? undefined
        : {
            month,
            materials: await readRecipeSupply(
              prisma,
              product.organizationId,
              month,
            ),
          };
    res.setHeader("Cache-Control", "no-store");
    const record = await prisma.productRecipe.findUnique({
      where: { productId: product.id },
    });
    if (!record)
      return res.json({
        ...(supply ? { supply } : {}),
        recipe: null,
        cost: null,
        version: 0,
        updatedAt: null,
      } satisfies ProductRecipeResponse);
    const parsed = parseProductRecipe(record.data);
    if (!parsed.ok) throw new Error("Stored recipe is invalid");
    return res.json({
      ...(supply ? { supply } : {}),
      recipe: parsed.value,
      cost: calculateRecipeCost(parsed.value),
      version: record.version,
      updatedAt: record.updatedAt.toISOString(),
    } satisfies ProductRecipeResponse);
  } catch (error) {
    console.error("Read product recipe failed", error);
    return res
      .status(500)
      .json({ message: "Жорын мэдээлэл авч чадсангүй. Дахин оролдоно уу." });
  }
});

router.put("/products/:id/recipe", requireAuth, async (req, res) => {
  try {
    const input: unknown = req.body;
    if (!input || typeof input !== "object" || Array.isArray(input))
      return res.status(400).json({ message: "Жорын мэдээлэл буруу байна" });
    const body = input as Record<string, unknown>;
    if (
      typeof body.expectedVersion !== "number" ||
      !Number.isSafeInteger(body.expectedVersion) ||
      body.expectedVersion < 0 ||
      typeof body.updateProductCost !== "boolean"
    )
      return res
        .status(400)
        .json({ message: "Жорын хувилбар болон өртгийн тохиргоо буруу байна" });
    const parsed = parseProductRecipe(body.recipe);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });
    const recipe = parsed.value;
    const cost = calculateRecipeCost(recipe);
    if (body.updateProductCost && cost.unitCost === null)
      return res.status(400).json({
        message:
          "Бүтээгдэхүүний өртөг шинэчлэхийн тулд бүх орцын үнийг нөхнө үү",
      });
    const product = await prisma.product.findFirst({
      where: { id: String(req.params.id), deletedAt: null },
      select: { id: true, organizationId: true, managedByWarehouseId: true },
    });
    if (!product || !product.organizationId || product.managedByWarehouseId)
      return res
        .status(404)
        .json({ message: "Байгууллагын бүтээгдэхүүн олдсонгүй" });
    const organizationId = product.organizationId;
    if (
      !(await assertOrgPermission(
        req,
        res,
        organizationId,
        Permission.MANAGE_PRODUCTS,
      ))
    )
      return;
    if (
      recipe.ingredients.some((ingredient) => ingredient.materialId) &&
      !isSupplyMonth(body.supplyMonth)
    )
      return res
        .status(400)
        .json({ message: "Орц сонгосон хангамжийн сараа заана уу" });
    const record = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
      if (isSupplyMonth(body.supplyMonth)) {
        const materials = new Map(
          (await readRecipeSupply(tx, organizationId, body.supplyMonth)).map(
            (material) => [material.id, material],
          ),
        );
        for (const ingredient of recipe.ingredients) {
          if (!ingredient.materialId) continue;
          const material = materials.get(ingredient.materialId);
          if (
            !material ||
            ingredient.name !== material.name ||
            !compatibleRecipeUnits(ingredient.unit, material.unit)
          )
            throw new RecipeConflict(
              "Сонгосон хангамжийн материал өөрчлөгдсөн эсвэл нэгж тохирохгүй байна. Дахин ачаална уу.",
            );
        }
      }
      await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${product.id} FOR UPDATE`;
      const currentProduct = await tx.product.findFirst({
        where: {
          id: product.id,
          organizationId,
          managedByWarehouseId: null,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!currentProduct)
        throw new RecipeConflict(
          "Бүтээгдэхүүний мэдээлэл өөрчлөгдсөн байна. Дахин ачаална уу.",
        );
      const current = await tx.productRecipe.findUnique({
        where: { productId: product.id },
        select: { version: true },
      });
      if ((current?.version ?? 0) !== body.expectedVersion)
        throw new RecipeConflict(
          "Жорыг өөр хэрэглэгч шинэчилсэн байна. Хадгалаагүй өөрчлөлтөө тэмдэглээд дахин ачаална уу.",
        );
      const data: Prisma.InputJsonObject = {
        ...recipe,
        ingredients: recipe.ingredients.map((row) => ({ ...row })),
      };
      const saved = await tx.productRecipe.upsert({
        where: { productId: product.id },
        create: { productId: product.id, data },
        update: { data, version: { increment: 1 } },
      });
      if (body.updateProductCost && cost.unitCost !== null)
        await tx.product.update({
          where: { id: product.id },
          data: { costPrice: cost.unitCost },
        });
      return saved;
    });
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      recipe,
      cost,
      version: record.version,
      updatedAt: record.updatedAt.toISOString(),
    } satisfies ProductRecipeResponse);
  } catch (error) {
    if (error instanceof RecipeConflict)
      return res.status(409).json({ message: error.message });
    console.error("Save product recipe failed", error);
    return res
      .status(500)
      .json({ message: "Жор хадгалагдсангүй. Дахин оролдоно уу." });
  }
});
export default router;
