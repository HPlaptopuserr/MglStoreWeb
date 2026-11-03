import { withBuildingFacades } from "../../services/building/facade-input";
import { Router, type Router as ExpressRouter } from "express";
import { prisma, Prisma } from "@mgl/database";
import {
  parseBuildingProject,
  BuildingInputError,
} from "../../services/building/project-input";
import { parseBlockChanges } from "../../services/building/block-changes";
import { readWebsiteRecord } from "@mgl/types/building-website";
const router: ExpressRouter = Router();
const include = {
  blocks: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      floors: { orderBy: { number: "asc" as const }, include: { units: true } },
    },
  },
};
router.get("/admin/projects/:id", async (req, res) => {
  const project = await prisma.barilgaProject.findFirst({
    where: {
      id: String(req.params.id),
      deletedAt: null,
      organization: res.locals.buildingScope as Prisma.OrganizationWhereInput,
    },
    include,
  });
  if (!project) return res.status(404).json({ message: "Төсөл олдсонгүй" });
  res.json({ project });
});
router.patch("/admin/projects/:id", async (req, res) => {
  try {
    const data = parseBuildingProject(req.body as unknown);
    const raw = req.body as {
      updatedAt?: string;
      blocks: Array<{
        id?: string;
        floors: Array<{ id?: string; units: Array<{ id?: string }> }>;
      }>;
    };
    const result = await prisma.$transaction(
      async (tx) => {
        const current = await tx.barilgaProject.findFirst({
          where: {
            id: String(req.params.id),
            deletedAt: null,
            organization: res.locals
              .buildingScope as Prisma.OrganizationWhereInput,
          },
          include,
        });
        if (!current) throw new BuildingInputError("Төсөл олдсонгүй");
        if (current.status !== "DRAFT")
          throw new BuildingInputError(
            "Одоогоор зөвхөн ноорог төслийн бүтцийг засна",
          );
        if (raw.updatedAt !== current.updatedAt.toISOString())
          throw new BuildingInputError(
            "Мэдээлэл өөрчлөгдсөн байна. Хуудсаа дахин нээнэ үү",
          );
        const changes = parseBlockChanges(req.body.blocks, current.blocks);
        const retained = new Set(
          changes
            .filter((change) => change.kind === "preserve")
            .map((change) => change.block.id),
        );
        const replaced = current.blocks.filter(
          (block) => !retained.has(block.id),
        );
        const replacedIds = replaced.map((block) => block.id);
        const website = readWebsiteRecord(current.documents);
        if (
          replaced.some(
            (block) =>
              website.plansByBlock[block.id]?.plans.length ||
              block.floors.some(
                (floor) =>
                  floor.units.some((unit) => website.unitContent?.[unit.id]) ||
                  Object.keys(website.unitBindings ?? {}).some((key) =>
                    key.startsWith(`${floor.id}:`),
                  ),
              ),
          )
        )
          throw new BuildingInputError(
            "План, зурагтай блокийн байрны мэдээллийг «Зураг, план ба байр» хэсгээс засна уу. Шинэ блокийг тусад нь нэмэх боломжтой.",
          );
        const locked = await tx.barilgaProject.updateMany({
          where: { id: current.id, updatedAt: current.updatedAt },
          data: { ...data, updatedAt: new Date() },
        });
        if (!locked.count)
          throw new BuildingInputError(
            "Мэдээлэл өөрчлөгдсөн байна. Дахин нээнэ үү",
          );
        // Inventory regeneration must never remove reservations, prices, payment tiers or published/sold records.
        const protectedUnits = await tx.barilgaUnit.count({
          where: {
            floor: { blockId: { in: replacedIds } },
            OR: [
              { status: { not: "AVAILABLE" } },
              { published: true },
              { reservations: { some: {} } },
              { priceTotal: { not: null } },
              { pricePerM2: { not: null } },
              { planImageUrl: { not: null } },
            ],
          },
        });
        const tiers = await tx.barilgaPaymentTier.count({
          where: { blockId: { in: replacedIds } },
        });
        if (protectedUnits || tiers)
          throw new BuildingInputError(
            "Үнэ, захиалга эсвэл борлуулалттай төслийн бүтцийг дахин үүсгэх боломжгүй",
          );
        await tx.barilgaBlock.deleteMany({
          where: { id: { in: replacedIds } },
        });
        for (const change of changes) {
          if (change.kind === "preserve")
            await tx.barilgaBlock.update({
              where: { id: change.block.id },
              data: {
                name: change.block.name,
                sortOrder: change.block.sortOrder,
              },
            });
        }
        await tx.barilgaProject.update({
          where: { id: current.id },
          data: {
            documents: withBuildingFacades(
              changes.map((change) => change.input),
              changes.map((change) => change.block),
              current.documents,
            ),
            blocks: {
              create: changes.flatMap((change) => {
                if (change.kind === "preserve") return [];
                const previous = current.blocks.find(
                  (b) => b.id === change.input.id,
                );
                return [
                  {
                    ...change.block,
                    minPaymentPercent: previous?.minPaymentPercent ?? 10,
                    maxPaymentPercent: previous?.maxPaymentPercent ?? 70,
                  },
                ];
              }),
            },
          },
        });
        return { id: current.id };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 20000,
      },
    );
    res.json({ project: result });
  } catch (error: unknown) {
    if (error instanceof BuildingInputError)
      return res.status(400).json({ message: error.message });
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    )
      return res.status(409).json({
        message: "Өөрчлөлт давхардлаа. Хуудсаа дахин нээгээд оролдоно уу",
      });
    throw error;
  }
});
export default router;
