import { Router, type Router as ExpressRouter } from "express";
import { prisma, Prisma } from "@mgl/database";
const router: ExpressRouter = Router();
const statuses = [
  "AVAILABLE",
  "RESERVED",
  "CONTRACT_PENDING",
  "SOLD",
  "HOLD",
  "CANCELLED",
] as const;
router.get("/admin/inventory-options", async (_req, res) => {
  const projects = await prisma.barilgaProject.findMany({
    where: {
      deletedAt: null,
      organization: res.locals.buildingScope as Prisma.OrganizationWhereInput,
    },
    select: {
      id: true,
      title: true,
      blocks: {
        select: {
          id: true,
          name: true,
          floors: { select: { number: true }, orderBy: { number: "asc" } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  res.json({ projects });
});
router.get("/admin/inventory", async (req, res) => {
  const status =
    typeof req.query.status === "string" ? req.query.status : "ALL";
  const page = Number(req.query.page ?? 1);
  const projectId =
    typeof req.query.project === "string" ? req.query.project : "";
  const blockId = typeof req.query.block === "string" ? req.query.block : "";
  const floor =
    typeof req.query.floor === "string" && req.query.floor !== ""
      ? Number(req.query.floor)
      : undefined;
  const search =
    typeof req.query.search === "string"
      ? req.query.search.trim().slice(0, 80)
      : "";
  if (floor !== undefined && !Number.isInteger(floor))
    return res.status(400).json({ message: "Давхар буруу" });
  if (
    (!statuses.some((s) => s === status) && status !== "ALL") ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000
  )
    return res
      .status(400)
      .json({ message: "Шүүлтүүр эсвэл хуудасны дугаар буруу байна" });
  const project = {
    deletedAt: null,
    organization: res.locals.buildingScope as Prisma.OrganizationWhereInput,
  };
  const scope: Prisma.BarilgaUnitWhereInput = { floor: { block: { project } } };
  const where: Prisma.BarilgaUnitWhereInput = {
    ...scope,
    AND: [
      {
        floor: {
          ...(floor !== undefined ? { number: floor } : {}),
          block: {
            ...(blockId ? { id: blockId } : {}),
            ...(projectId ? { projectId } : {}),
          },
        },
      },
      ...(search
        ? [{ unitNo: { contains: search, mode: "insensitive" as const } }]
        : []),
    ],
    ...(status !== "ALL"
      ? { status: status as (typeof statuses)[number] }
      : {}),
  };
  const pageSize = 20;
  const result = await prisma.$transaction(
    async (tx) => {
      const [projects, blocks, groups, total, units] = await Promise.all([
        tx.barilgaProject.count({ where: project }),
        tx.barilgaBlock.count({ where: { project } }),
        tx.barilgaUnit.groupBy({
          by: ["status"],
          where: scope,
          _count: { _all: true },
        }),
        tx.barilgaUnit.count({ where }),
        tx.barilgaUnit.findMany({
          where,
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          select: {
            id: true,
            unitNo: true,
            typeLabel: true,
            rooms: true,
            areaM2: true,
            priceTotal: true,
            pricePerM2: true,
            planImageUrl: true,
            status: true,
            published: true,
            floor: {
              select: {
                number: true,
                block: {
                  select: {
                    name: true,
                    minPaymentPercent: true,
                    maxPaymentPercent: true,
                    paymentTiers: {
                      select: {
                        id: true,
                        label: true,
                        minPercent: true,
                        maxPercent: true,
                        pricePerM2: true,
                      },
                      orderBy: { minPercent: "asc" },
                    },
                    project: {
                      select: {
                        title: true,
                        address: true,
                        district: true,
                        completesAt: true,
                        status: true,
                        verification: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);
      const count = (status: string) =>
        groups.find((g) => g.status === status)?._count._all ?? 0;
      const all = groups.reduce((sum, g) => sum + g._count._all, 0);
      return {
        summary: {
          projects,
          blocks,
          total: all,
          sold: count("SOLD"),
          unsold: all - count("SOLD"),
          available: count("AVAILABLE"),
          reserved: count("RESERVED"),
          contractPending: count("CONTRACT_PENDING"),
          hold: count("HOLD"),
          cancelled: count("CANCELLED"),
        },
        units,
        total,
        page,
        pageSize,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  res.json(result);
});
export default router;
