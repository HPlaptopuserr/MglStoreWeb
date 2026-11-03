import {
  applyPlanRegionDetails,
  planRegionMembers,
} from "../../services/building/plan-region-details";
import purchaseRoutes from "./purchases";
import customerRoutes from "./customers";
import inquiryRoutes from "./inquiries";
import paymentsReportRoutes from "./payments-report";
import dashboardRoutes from "./dashboard";
import mediaRoutes from "./media";
import { withBuildingFacades } from "../../services/building/facade-input";
import { Router, type Router as ExpressRouter } from "express";
import { Prisma, prisma } from "@mgl/database";
import { parseBuildingBlocks } from "../../services/building/block-input";
import websiteRoutes, { websiteInclude } from "./website";
import { readWebsiteRecord } from "@mgl/types/building-website";
import editRoutes from "./edit";
import inventoryRoutes from "./inventory";
import registrationRoutes from "./registration";
import sessionRoutes from "./session";
import { buildingOrganizationScope } from "../../services/building/access";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  BuildingInputError,
  parseBuildingProject,
} from "../../services/building/project-input";

const router: ExpressRouter = Router();
router.use(registrationRoutes);
router.use(sessionRoutes);
const organizationSelect = { id: true, name: true, slug: true, logoUrl: true };
const publicScope = {
  deletedAt: null,
  status: "PUBLISHED",
  verification: "VERIFIED",
  organization: { deletedAt: null, status: "ACTIVE" },
} satisfies Prisma.BarilgaProjectWhereInput;
const projectSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  district: true,
  address: true,
  coverImageUrl: true,
  constructionStatus: true,
  organization: { select: organizationSelect },
} satisfies Prisma.BarilgaProjectSelect;

router.get("/projects", async (_req, res) => {
  const projects = await prisma.barilgaProject.findMany({
    where: publicScope,
    select: projectSelect,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ projects });
});

router.get("/projects/:id", async (req, res) => {
  const project = await prisma.barilgaProject.findFirst({
    where: { ...publicScope, id: req.params.id },
    select: {
      ...projectSelect,
      blocks: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          minPaymentPercent: true,
          maxPaymentPercent: true,
          floors: {
            orderBy: { number: "asc" },
            select: {
              id: true,
              number: true,
              units: {
                where: { published: true },
                orderBy: { unitNo: "asc" },
                select: {
                  id: true,
                  unitNo: true,
                  rooms: true,
                  areaM2: true,
                  priceTotal: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!project) return res.status(404).json({ message: "Төсөл олдсонгүй" });
  return res.json({ project });
});

router.get("/projects/:id/website", async (req, res) => {
  const project = await prisma.barilgaProject.findFirst({
    where: {
      ...publicScope,
      OR: [{ id: String(req.params.id) }, { slug: String(req.params.id) }],
    },
    include: websiteInclude,
  });
  if (!project) return res.status(404).json({ message: "Төсөл олдсонгүй" });
  const website = applyPlanRegionDetails(
    readWebsiteRecord(project.documents),
    project.blocks,
  );
  const blocks = project.blocks.map((block) => ({
    id: block.id,
    name: block.name,
    minPaymentPercent: block.minPaymentPercent,
    maxPaymentPercent: block.maxPaymentPercent,
    floors: block.floors.map((floor) => ({
      id: floor.id,
      number: floor.number,
      units: floor.units
        .map((unit, planSlot) => ({ ...unit, planSlot }))
        .filter((unit) => unit.published)
        .map((unit) => ({
          id: unit.id,
          unitNo: unit.unitNo,
          typeLabel: unit.typeLabel,
          rooms: unit.rooms,
          areaM2: unit.areaM2,
          priceTotal: unit.priceTotal,
          pricePerM2: unit.pricePerM2,
          planImageUrl: unit.planImageUrl,
          status: unit.status,
          published: true,
          planSlot: unit.planSlot,
        })),
    })),
  }));
  const publicIds = new Set(
    blocks.flatMap((block) =>
      block.floors.flatMap((floor) => floor.units.map((unit) => unit.id)),
    ),
  );
  website.unitContent = Object.fromEntries(
    Object.entries(website.unitContent ?? {}).filter(([id]) =>
      publicIds.has(id),
    ),
  );
  const visibleRegionKeys = new Set<string>();
  for (const block of blocks) {
    for (const plan of website.plansByBlock[block.id]?.plans ?? []) {
      for (const shape of plan.shapes.filter((item) => item.kind === "unit")) {
        if (planRegionMembers(website, block, plan, shape).length)
          visibleRegionKeys.add(`${block.id}:${plan.id}:${shape.id}`);
      }
    }
  }
  website.planRegionDetails = Object.fromEntries(
    Object.entries(website.planRegionDetails ?? {}).filter(([key]) =>
      visibleRegionKeys.has(key),
    ),
  );
  // Keep binding keys for hidden units so readers never fall back to positional inventory.
  for (const block of blocks) {
    const facade = website.facadesByBlock?.[block.id];
    if (facade)
      facade.regions = facade.regions.filter((region) =>
        block.floors.some(
          (floor) =>
            floor.number === region.floor &&
            floor.units.some((unit) => unit.unitNo === region.unitNo),
        ),
      );
  }
  return res.json({
    project: {
      id: project.id,
      title: project.title,
      slug: project.slug,
      description: project.description,
      district: project.district,
      address: project.address,
      coverImageUrl: project.coverImageUrl,
      status: project.status,
      verification: project.verification,
      constructionStatus: project.constructionStatus,
      updatedAt: project.updatedAt,
      website,
      blocks,
    },
  });
});

// The scope is computed once per request from current membership and identity.
router.use("/admin", requireAuth, async (req, res, next) => {
  const auth = (req as typeof req & { user: AuthPayload }).user;
  const scope = await buildingOrganizationScope(auth);
  if (!scope || !(await prisma.organization.count({ where: scope }))) {
    return res.status(403).json({
      message:
        "Барилгын байгууллагын эрх хараахан байхгүй байна. Бүртгүүлэх хэсгээр байгууллагаа нэмнэ үү.",
    });
  }
  res.locals.buildingScope = scope;
  next();
});

router.use(inquiryRoutes);
router.use(paymentsReportRoutes);
router.use(purchaseRoutes);
router.use(mediaRoutes);
router.use(inventoryRoutes);
router.use(dashboardRoutes);
router.use(customerRoutes);
router.use(editRoutes);
router.use(websiteRoutes);

router.get("/admin/organization", async (_req, res) => {
  const organization = await prisma.organization.findFirst({
    where: res.locals.buildingScope as Prisma.OrganizationWhereInput,
    select: organizationSelect,
  });
  res.json({ organization });
});

router.get("/admin/projects", async (_req, res) => {
  const projects = await prisma.barilgaProject.findMany({
    where: {
      deletedAt: null,
      organization: res.locals.buildingScope as Prisma.OrganizationWhereInput,
    },
    select: {
      ...projectSelect,
      status: true,
      verification: true,
      organizationId: true,
      _count: { select: { blocks: true } },
      blocks: {
        select: { id: true, name: true, _count: { select: { floors: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ projects });
});

router.post("/admin/projects", async (req, res) => {
  try {
    const data = parseBuildingProject(req.body as unknown);
    const blocks = parseBuildingBlocks(
      (req.body as Record<string, unknown>).blocks,
    );
    const organization = await prisma.organization.findFirst({
      where: {
        ...(res.locals.buildingScope as Prisma.OrganizationWhereInput),
      },
      select: { id: true },
    });
    if (!organization)
      return res
        .status(404)
        .json({ message: "Идэвхтэй байгууллага олдсонгүй" });
    const project = await prisma.barilgaProject.create({
      data: {
        ...data,
        organizationId: organization.id,
        blocks: { create: blocks },
        documents: withBuildingFacades(req.body.blocks, blocks),
      },
      select: { id: true, title: true },
    });
    return res.status(201).json({ project });
  } catch (error: unknown) {
    if (error instanceof BuildingInputError)
      return res.status(400).json({ message: error.message });
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ message: "Энэ URL нэртэй төсөл бүртгэгдсэн байна" });
    }
    throw error;
  }
});

export default router;
