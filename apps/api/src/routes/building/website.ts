import {
  applyPlanRegionDetails,
  planRegionMembers,
} from "../../services/building/plan-region-details";
import { syncPlanInventory } from "../../services/building/plan-inventory";
import { Router, type Router as ExpressRouter } from "express";
import { Prisma, prisma } from "@mgl/database";
import {
  regionBindingKey,
  parseBuildingFacade,
  parseWebsiteContent,
  parseUnitContent,
  emptyUnitContent,
  parseProjectMasterplan,
  readWebsiteRecord,
} from "@mgl/types/building-website";
import { parseLibrary } from "@mgl/types/building-plans";
import { BuildingInputError } from "../../services/building/project-input";
function validated<T>(parse: () => T): T {
  try {
    return parse();
  } catch (cause) {
    throw new BuildingInputError(
      cause instanceof Error ? cause.message : "Мэдээлэл буруу байна",
    );
  }
}
const router: ExpressRouter = Router();
export const websiteInclude = {
  blocks: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      floors: {
        orderBy: { number: "asc" as const },
        include: {
          units: {
            orderBy: [{ unitNo: "asc" as const }, { id: "asc" as const }],
          },
        },
      },
    },
  },
};
function bodyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BuildingInputError("Хүсэлтийн бүтэц буруу байна.");
  return value as Record<string, unknown>;
}
function documentsWithWebsite(
  documents: Prisma.JsonValue | null,
  website: unknown,
): Prisma.InputJsonValue {
  const existing =
    documents && typeof documents === "object" && !Array.isArray(documents)
      ? documents
      : {};
  return JSON.parse(
    JSON.stringify({ ...existing, website }),
  ) as Prisma.InputJsonValue;
}
function knownError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2002", "P2034"].includes(error.code)
  );
}
router.get("/admin/projects/:id/website", async (req, res) => {
  const project = await prisma.barilgaProject.findFirst({
    where: {
      OR: [{ id: String(req.params.id) }, { slug: String(req.params.id) }],
      deletedAt: null,
      organization: res.locals.buildingScope as Prisma.OrganizationWhereInput,
    },
    include: websiteInclude,
  });
  if (!project) return res.status(404).json({ message: "Төсөл олдсонгүй" });
  return res.json({
    project: {
      ...project,
      documents: undefined,
      website: applyPlanRegionDetails(
        readWebsiteRecord(project.documents),
        project.blocks,
      ),
    },
  });
});
router.patch("/admin/projects/:id/website", async (req, res) => {
  try {
    const body = bodyRecord(req.body as unknown);
    const result = await prisma.$transaction(
      async (tx) => {
        const project = await tx.barilgaProject.findFirst({
          where: {
            id: String(req.params.id),
            deletedAt: null,
            organization: res.locals
              .buildingScope as Prisma.OrganizationWhereInput,
          },
          include: websiteInclude,
        });
        if (!project) return null;
        if (body.updatedAt !== project.updatedAt.toISOString())
          throw new BuildingInputError(
            "Мэдээлэл өөрчлөгдсөн байна. Шинэчилж дахин оролдоно уу.",
          );
        const website = readWebsiteRecord(project.documents);
        const data: Prisma.BarilgaProjectUpdateManyMutationInput = {
          updatedAt: new Date(),
        };
        if (body.facade !== undefined) {
          const input = bodyRecord(body.facade);
          const block = project.blocks.find(
            (item) => item.id === input.blockId,
          );
          if (!block) throw new BuildingInputError("Блок энэ төсөлд байхгүй.");
          const facade = validated(() => parseBuildingFacade(input.value));
          if (
            facade.floorRegions?.some(
              (region) =>
                !block.floors.some((floor) => floor.number === region.floor),
            ) ||
            facade.regions.some(
              (region) =>
                !block.floors.some(
                  (floor) =>
                    floor.number === region.floor &&
                    floor.units.some((unit) => unit.unitNo === region.unitNo),
                ),
            )
          )
            throw new BuildingInputError(
              "Фасадын давхар, тоот блокийн бүртгэлтэй тохирохгүй байна.",
            );
          website.facadesByBlock = {
            ...website.facadesByBlock,
            [block.id]: facade,
          };
        }
        if (body.masterplan !== undefined) {
          const masterplan = validated(() =>
            parseProjectMasterplan(body.masterplan),
          );
          if (
            masterplan.pins.some(
              (pin) =>
                !project.blocks.some((block) => block.id === pin.blockId),
            )
          )
            throw new BuildingInputError("Блок энэ төсөлд байхгүй.");
          website.masterplan = masterplan;
        }
        if (body.content !== undefined) {
          website.content = validated(() => parseWebsiteContent(body.content));
          data.coverImageUrl = website.content.heroImageUrl || null;
        }
        if (body.basics !== undefined) {
          const basics = bodyRecord(body.basics);
          for (const key of [
            "title",
            "description",
            "district",
            "address",
          ] as const) {
            const value = basics[key];
            const max =
              key === "description" ? 5000 : key === "address" ? 500 : 180;
            if (
              typeof value !== "string" ||
              value.length > max ||
              (key === "title" && !value.trim())
            )
              throw new BuildingInputError(`${key}: мэдээлэл буруу байна.`);
            data[key] = value.trim();
          }
          const status = basics.status;
          if (!["DRAFT", "PUBLISHED", "PAUSED"].includes(String(status)))
            throw new BuildingInputError("Төслийн төлөв буруу байна.");
          if (status === "PUBLISHED" && project.verification !== "VERIFIED")
            throw new BuildingInputError(
              "Нийтлэхийн өмнө төслийг баталгаажуулах шаардлагатай. Нооргоор хадгалж болно.",
            );
          data.status = status as "DRAFT" | "PUBLISHED" | "PAUSED";
          if (
            ![
              "PLANNED",
              "UNDER_CONSTRUCTION",
              "COMPLETED",
              "HANDED_OVER",
            ].includes(String(basics.constructionStatus))
          )
            throw new BuildingInputError("Барилгын явц буруу байна.");
          data.constructionStatus = basics.constructionStatus as
            | "PLANNED"
            | "UNDER_CONSTRUCTION"
            | "COMPLETED"
            | "HANDED_OVER";
        }
        if (body.planLibrary !== undefined || body.syncPlanUnits === true) {
          if (typeof body.blockId !== "string")
            throw new BuildingInputError("Блок шаардлагатай");
          const block = project.blocks.find((item) => item.id === body.blockId);
          if (!block) throw new BuildingInputError("Блок энэ төсөлд байхгүй.");
          const library = validated(() =>
            parseLibrary(body.planLibrary ?? website.plansByBlock[block.id]),
          );
          const previousLibrary = website.plansByBlock[block.id];
          // Plan-editor changes must update shared metadata without replacing shared media.
          for (const plan of library.plans) {
            for (const shape of plan.shapes.filter(
              (item) => item.kind === "unit",
            )) {
              const shared =
                website.planRegionDetails?.[
                  regionBindingKey(block.id, plan.id, shape.id)
                ];
              if (shared) {
                shared.typeLabel = shape.label;
                shared.rooms = shape.inventory?.rooms ?? null;
                shared.areaM2 = shape.inventory?.areaM2 ?? null;
              }
            }
          }
          website.unitBindings ??= {};
          website.unitContent ??= {};
          // Preserve existing per-unit rates when migrating older plan data.
          for (const floor of block.floors) {
            for (const unit of floor.units) {
              if (
                !website.unitContent[unit.id] &&
                unit.pricePerM2 !== null &&
                (website.pricePerM2 === undefined ||
                  Number(unit.pricePerM2) !== website.pricePerM2)
              ) {
                website.unitContent[unit.id] = {
                  ...emptyUnitContent(),
                  useProjectPrice: false,
                };
              }
            }
          }
          if (body.floorCount !== undefined) {
            const count = body.floorCount;
            if (
              typeof count !== "number" ||
              !Number.isInteger(count) ||
              count < 1 ||
              count > 100
            )
              throw new BuildingInputError("Давхрын тоо 1–100 байна.");
            for (let number = 1; number <= count; number++) {
              if (!block.floors.some((floor) => floor.number === number)) {
                const created = await tx.barilgaFloor.create({
                  data: { blockId: block.id, number },
                  include: { units: true },
                });
                block.floors.push(created);
              }
            }
          }
          for (const [number, id] of Object.entries(library.assignments)) {
            const floor = block.floors.find(
              (item) => item.number === Number(number),
            );
            if (!floor)
              throw new BuildingInputError(`${number}-р давхар бүртгэгдээгүй.`);
            const plan = library.plans.find((item) => item.id === id);
            if (plan)
              await syncPlanInventory(
                tx,
                floor.id,
                floor.number,
                plan,
                website.unitBindings,
                previousLibrary?.plans.find((item) => item.id === plan.id),
              );
          }
          website.plansByBlock[block.id] = library;
        }
        if (body.pricePerM2 !== undefined) {
          const rate = body.pricePerM2;
          if (
            typeof rate !== "number" ||
            !Number.isFinite(rate) ||
            rate < 0 ||
            rate > 1000000000 ||
            Math.abs(rate * 100 - Math.round(rate * 100)) > 0.001
          )
            throw new BuildingInputError("М²-ийн үнэ буруу байна.");
          // Persist the project-wide rate as well as recalculating inventory totals.
          website.pricePerM2 = rate;
        }
        if (
          website.pricePerM2 !== undefined &&
          (body.pricePerM2 !== undefined ||
            body.planLibrary !== undefined ||
            body.syncPlanUnits === true)
        ) {
          const floors = await tx.barilgaFloor.findMany({
            where: { blockId: { in: project.blocks.map((block) => block.id) } },
            select: { id: true },
          });
          const units = await tx.barilgaUnit.findMany({
            where: { floorId: { in: floors.map((floor) => floor.id) } },
            select: { id: true, areaM2: true },
          });
          for (const unit of units) {
            if (website.unitContent?.[unit.id]?.useProjectPrice === false)
              continue;
            const total =
              unit.areaM2 === null
                ? null
                : Math.round(Number(unit.areaM2) * website.pricePerM2 * 100) /
                  100;
            if (total !== null && total > 1000000000000)
              throw new BuildingInputError("Нийт үнэ хэтэрсэн байна.");
            await tx.barilgaUnit.update({
              where: { id: unit.id },
              data: { pricePerM2: website.pricePerM2, priceTotal: total },
            });
          }
        }
        const serialized = JSON.stringify(website);
        if (Buffer.byteLength(serialized) > 15_000_000)
          throw new BuildingInputError(
            "Зураг, планын нийт хэмжээ 15 MB-аас хэтэрсэн байна.",
          );
        data.documents = documentsWithWebsite(project.documents, website);
        const update = await tx.barilgaProject.updateMany({
          where: { id: project.id, updatedAt: project.updatedAt },
          data,
        });
        if (update.count !== 1)
          throw new BuildingInputError(
            "Давхардсан өөрчлөлт. Хуудсаа шинэчилнэ үү.",
          );
        return tx.barilgaProject.findUnique({
          where: { id: project.id },
          select: { id: true, updatedAt: true },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 20000,
      },
    );
    if (!result) return res.status(404).json({ message: "Төсөл олдсонгүй" });
    return res.json({ project: result });
  } catch (error: unknown) {
    if (knownError(error))
      return res
        .status(409)
        .json({ message: "Давхардсан өөрчлөлт. Шинэчилж оролдоно уу." });
    if (error instanceof BuildingInputError)
      return res.status(400).json({ message: error.message });
    throw error;
  }
});
router.patch("/admin/projects/:id/units/:unitId", async (req, res) => {
  try {
    const body = bodyRecord(req.body as unknown);
    const result = await prisma.$transaction(
      async (tx) => {
        const project = await tx.barilgaProject.findFirst({
          where: {
            id: String(req.params.id),
            deletedAt: null,
            organization: res.locals
              .buildingScope as Prisma.OrganizationWhereInput,
          },
          include: websiteInclude,
        });
        if (!project) return null;
        if (body.updatedAt !== project.updatedAt.toISOString())
          throw new BuildingInputError(
            "Мэдээлэл өөрчлөгдсөн байна. Шинэчилнэ үү.",
          );
        const unit = await tx.barilgaUnit.findFirst({
          where: {
            id: String(req.params.unitId),
            floor: { block: { projectId: project.id } },
          },
          include: {
            reservations: {
              where: { status: "ACTIVE" },
              select: { id: true },
              take: 1,
            },
          },
        });
        if (!unit) throw new BuildingInputError("Нэгж олдсонгүй.");
        const status = String(body.status);
        if (
          ![
            "AVAILABLE",
            "RESERVED",
            "CONTRACT_PENDING",
            "SOLD",
            "HOLD",
            "CANCELLED",
          ].includes(status)
        )
          throw new BuildingInputError("Байрны төлөв буруу байна.");
        if (unit.reservations.length && status !== unit.status)
          throw new BuildingInputError(
            "Идэвхтэй захиалгатай нэгжийн төлөвийг захиалгын урсгалаар өөрчилнө.",
          );
        function decimal(value: unknown, label: string, max: number) {
          if (value === null || value === "") return null;
          const n = Number(value);
          if (
            (typeof value !== "string" && typeof value !== "number") ||
            !Number.isFinite(n) ||
            n < 0 ||
            n > max ||
            Math.abs(n * 100 - Math.round(n * 100)) > 0.001
          )
            throw new BuildingInputError(`${label} буруу байна.`);
          return n;
        }
        const website = readWebsiteRecord(project.documents);
        const content =
          body.unitContent === undefined
            ? website.unitContent?.[unit.id]
            : validated(() => parseUnitContent(body.unitContent));
        if (content) {
          for (const url of [
            content.layout2d,
            content.layout3d,
            ...content.gallery,
          ]) {
            if (
              url &&
              !url.startsWith(`/api/building/projects/${project.id}/media/`)
            )
              throw new BuildingInputError(
                "Энэ зургийг өөр төсөлд ашиглах боломжгүй.",
              );
          }
          website.unitContent = { ...website.unitContent, [unit.id]: content };
        }
        const effectiveRate =
          content?.useProjectPrice !== false
            ? (website.pricePerM2 ?? body.pricePerM2)
            : body.pricePerM2;
        const rate =
          effectiveRate === undefined
            ? undefined
            : decimal(effectiveRate, "М²-ийн үнэ", 1_000_000_000_000);
        const area = decimal(body.areaM2, "Талбай", 100000);
        if (area !== null && area <= 0)
          throw new BuildingInputError("Талбай эерэг тоо байна.");
        const price =
          rate === undefined
            ? decimal(body.priceTotal, "Нийт үнэ", 1_000_000_000_000)
            : rate !== null && area
              ? Math.round(rate * area * 100) / 100
              : null;
        if (price !== null && price > 1_000_000_000_000)
          throw new BuildingInputError("Нийт үнэ хэтэрсэн байна.");
        const rooms =
          body.rooms === null || body.rooms === "" ? null : Number(body.rooms);
        if (
          rooms !== null &&
          (!Number.isInteger(rooms) || rooms < 1 || rooms > 20)
        )
          throw new BuildingInputError("Өрөөний тоо буруу байна.");
        if (
          typeof body.typeLabel !== "string" ||
          body.typeLabel.length > 100 ||
          typeof body.published !== "boolean"
        )
          throw new BuildingInputError("Нэгжийн мэдээлэл буруу байна.");
        const unitNo = body.unitNo === undefined ? unit.unitNo : body.unitNo;
        if (
          typeof unitNo !== "string" ||
          !unitNo.trim() ||
          unitNo.trim().length > 30
        )
          throw new BuildingInputError("Байрны тоот буруу байна.");
        if (body.published && (area === null || !body.typeLabel.trim()))
          throw new BuildingInputError(
            "Нийтлэхийн өмнө нэр, талбай оруулна уу.",
          );
        if (body.planRegion !== undefined) {
          const target = bodyRecord(body.planRegion);
          const block = project.blocks.find(
            (item) => item.id === target.blockId,
          );
          const plan =
            block &&
            website.plansByBlock[block.id]?.plans.find(
              (item) => item.id === target.planId,
            );
          const shape = plan?.shapes.find(
            (item) => item.id === target.regionId && item.kind === "unit",
          );
          if (!block || !plan || !shape)
            throw new BuildingInputError("Планын бүс олдсонгүй.");
          const members = planRegionMembers(website, block, plan, shape);
          if (!members.some((item) => item.id === unit.id))
            throw new BuildingInputError(
              "Байр сонгосон планын бүсэд хамаарахгүй байна.",
            );
          const shared = content ?? emptyUnitContent();
          website.planRegionDetails ??= {};
          website.planRegionDetails[
            regionBindingKey(block.id, plan.id, shape.id)
          ] = {
            typeLabel: body.typeLabel.trim(),
            rooms,
            areaM2: area,
            content: {
              ...(shared.roomInteriors
                ? { roomInteriors: shared.roomInteriors }
                : {}),
              layout2d: shared.layout2d,
              layout3d: shared.layout3d,
              gallery: shared.gallery,
              description: shared.description,
            },
          };
          shape.label = body.typeLabel.trim();
          shape.inventory = { ...shape.inventory, rooms, areaM2: area };
          applyPlanRegionDetails(website, project.blocks);
          await tx.barilgaUnit.updateMany({
            where: { id: { in: members.map((item) => item.id) } },
            data: { rooms, areaM2: area, typeLabel: body.typeLabel.trim() },
          });
          const memberIds = new Set(members.map((item) => item.id));
          for (const sibling of block.floors
            .flatMap((floor) => floor.units)
            .filter((item) => memberIds.has(item.id) && item.id !== unit.id)) {
            const siblingRate =
              website.unitContent?.[sibling.id]?.useProjectPrice !== false
                ? (website.pricePerM2 ??
                  (sibling.pricePerM2 === null
                    ? null
                    : Number(sibling.pricePerM2)))
                : sibling.pricePerM2 === null
                  ? null
                  : Number(sibling.pricePerM2);
            const siblingTotal =
              area !== null && siblingRate !== null
                ? Math.round(area * siblingRate * 100) / 100
                : null;
            if (siblingTotal !== null && siblingTotal > 1_000_000_000_000)
              throw new BuildingInputError("Нийт үнэ хэтэрсэн байна.");
            await tx.barilgaUnit.update({
              where: { id: sibling.id },
              data: { priceTotal: siblingTotal },
            });
          }
        }
        const locked = await tx.barilgaProject.updateMany({
          where: { id: project.id, updatedAt: project.updatedAt },
          data: {
            updatedAt: new Date(),
            documents: documentsWithWebsite(project.documents, website),
          },
        });
        if (!locked.count) throw new BuildingInputError("Давхардсан өөрчлөлт.");
        await tx.barilgaUnit.update({
          where: { id: unit.id },
          data: {
            unitNo: unitNo.trim(),
            priceTotal: price,
            pricePerM2: rate === undefined ? unit.pricePerM2 : rate,
            areaM2: area,
            rooms,
            typeLabel: body.typeLabel.trim(),
            status: status as typeof unit.status,
            published: body.published,
          },
        });
        return tx.barilgaProject.findUnique({
          where: { id: project.id },
          select: { updatedAt: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!result) return res.status(404).json({ message: "Төсөл олдсонгүй" });
    return res.json({ project: result });
  } catch (error: unknown) {
    if (knownError(error))
      return res.status(409).json({ message: "Өөрчлөлт давхардлаа." });
    if (error instanceof BuildingInputError)
      return res.status(400).json({ message: error.message });
    throw error;
  }
});
export default router;
