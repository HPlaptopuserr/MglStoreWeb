import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { prisma, Prisma } from "@mgl/database";
import { parseBuildingInquiry } from "@mgl/types/building-inquiry";

const router: ExpressRouter = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Олон хүсэлт илгээсэн байна. Түр хүлээгээд дахин оролдоно уу.",
  },
});

router.post(
  ["/projects/:id/inquiries", "/admin/projects/:id/inquiries"],
  limiter,
  async (req, res) => {
    let input;
    try {
      input = parseBuildingInquiry(req.body as unknown);
    } catch (error) {
      return res
        .status(400)
        .json({
          message:
            error instanceof Error ? error.message : "Мэдээллээ шалгана уу.",
        });
    }
    const preview = req.path.startsWith("/admin/");
    const project = await prisma.barilgaProject.findFirst({
      where: {
        id: String(req.params.id),
        deletedAt: null,
        ...(preview
          ? {
              organization: res.locals
                .buildingScope as Prisma.OrganizationWhereInput,
            }
          : {
              status: "PUBLISHED",
              verification: "VERIFIED",
              organization: { deletedAt: null, status: "ACTIVE" },
            }),
      },
      select: {
        id: true,
        blocks: {
          where: {
            floors: {
              some: {
                units: {
                  some: {
                    id: input.unitId,
                    ...(preview ? {} : { published: true }),
                  },
                },
              },
            },
          },
          select: {
            name: true,
            floors: {
              where: { units: { some: { id: input.unitId } } },
              select: {
                number: true,
                units: {
                  where: {
                    id: input.unitId,
                    ...(preview ? {} : { published: true }),
                  },
                  select: { id: true, unitNo: true, typeLabel: true },
                },
              },
            },
          },
        },
      },
    });
    const block = project?.blocks[0];
    const floor = block?.floors[0];
    const unit = floor?.units[0];
    if (!project || !block || !floor || !unit)
      return res
        .status(404)
        .json({ message: "Байр олдсонгүй. Мэдээллээ шинэчилнэ үү." });
    // The client keeps one UUID across retries; a response lost in transit cannot create duplicate leads.
    const existing = await prisma.barilgaInquiry.findUnique({
      where: { id: input.id },
      select: { projectId: true, unitId: true },
    });
    if (
      existing &&
      (existing.projectId !== project.id || existing.unitId !== unit.id)
    )
      return res
        .status(409)
        .json({ message: "Хүсэлт давхардсан байна. Цонхоо дахин нээнэ үү." });
    if (!existing) {
      try {
        await prisma.barilgaInquiry.create({
          data: {
            ...input,
            projectId: project.id,
            blockName: block.name,
            floorNumber: floor.number,
            unitNo: unit.unitNo,
            unitLabel: unit.typeLabel || unit.unitNo,
          },
        });
      } catch (error) {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          )
        )
          throw error;
      }
    }
    return res
      .status(201)
      .json({
        message:
          "Таны хүсэлтийг хүлээн авлаа. Борлуулалтын ажилтан тантай холбогдоно.",
      });
  },
);

router.get("/admin/inquiries", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 100000)
    return res.status(400).json({ message: "Хуудасны дугаар буруу байна." });
  const where: Prisma.BarilgaInquiryWhereInput = {
    project: {
      deletedAt: null,
      organization: res.locals.buildingScope as Prisma.OrganizationWhereInput,
    },
  };
  const [total, inquiries] = await prisma.$transaction([
    prisma.barilgaInquiry.count({ where }),
    prisma.barilgaInquiry.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      skip: (page - 1) * 20,
      include: { project: { select: { title: true } } },
    }),
  ]);
  return res.json({ total, inquiries });
});
export default router;
