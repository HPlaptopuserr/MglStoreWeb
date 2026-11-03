import { applyPlanRegionDetails } from "../../services/building/plan-region-details";
import { Router, type Router as ExpressRouter } from "express";
import { prisma, type Prisma } from "@mgl/database";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { readWebsiteRecord } from "@mgl/types/building-website";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { buildingOrganizationScope } from "../../services/building/access";

const router: ExpressRouter = Router();
const directory = path.resolve(
  process.env.BUILDING_MEDIA_DIR ||
    path.join(__dirname, "../../../uploads/building"),
);
router.get(
  "/projects/:id/media/:file",
  (req, res, next) => {
    if (req.headers.authorization) return requireAuth(req, res, next);
    next();
  },
  async (req, res) => {
    const id = String(req.params.id),
      file = String(req.params.file);
    if (
      !/^[a-zA-Z0-9-]{1,100}$/.test(id) ||
      !/^[a-f0-9-]{36}\.webp$/.test(file)
    )
      return res.sendStatus(404);
    const user = (req as typeof req & { user?: AuthPayload }).user;
    const scope = user ? await buildingOrganizationScope(user) : null;
    const visible: Prisma.BarilgaProjectWhereInput = {
      id,
      deletedAt: null,
      OR: [
        {
          status: "PUBLISHED",
          verification: "VERIFIED",
          organization: { deletedAt: null, status: "ACTIVE" },
        },
        ...(scope ? [{ organization: scope }] : []),
      ],
    };
    const project = await prisma.barilgaProject.findFirst({
      where: visible,
      select: {
        documents: true,
        blocks: {
          select: {
            id: true,
            floors: {
              select: {
                id: true,
                number: true,
                units: {
                  orderBy: [{ unitNo: "asc" }, { id: "asc" }],
                  select: {
                    id: true,
                    published: true,
                    typeLabel: true,
                    rooms: true,
                    areaM2: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!project) return res.sendStatus(404);
    const ownsProject =
      scope &&
      (await prisma.barilgaProject.count({
        where: { id, deletedAt: null, organization: scope },
      }));
    if (!ownsProject) {
      const mediaUrl = `/api/building/projects/${id}/media/${file}`;
      const content =
        applyPlanRegionDetails(
          readWebsiteRecord(project.documents),
          project.blocks,
        ).unitContent ?? {};
      const referenced = project.blocks.some((block) =>
        block.floors.some((floor) =>
          floor.units.some((unit) => {
            if (!unit.published) return false;
            const details = content[unit.id];
            return (
              details &&
              [details.layout2d, details.layout3d, ...details.gallery].includes(
                mediaUrl,
              )
            );
          }),
        ),
      );
      if (!referenced) return res.sendStatus(404);
    }
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.sendFile(path.join(directory, id, file));
  },
);
router.post("/admin/projects/:id/media", async (req, res) => {
  const id = String(req.params.id);
  const project = await prisma.barilgaProject.findFirst({
    where: {
      id,
      deletedAt: null,
      organization: res.locals.buildingScope as Prisma.OrganizationWhereInput,
    },
    select: { id: true },
  });
  if (!project) return res.sendStatus(404);
  const image: unknown = req.body?.image;
  if (
    typeof image !== "string" ||
    image.length > 3_000_000 ||
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)
  )
    return res
      .status(400)
      .json({ message: "PNG, JPG, WebP зураг шаардлагатай." });
  let bytes: Buffer;
  try {
    bytes = await sharp(Buffer.from(image.split(",")[1], "base64"), {
      limitInputPixels: 25_000_000,
    })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer();
  } catch {
    return res.status(400).json({ message: "Зургийг боловсруулж чадсангүй." });
  }
  const name = `${randomUUID()}.webp`;
  await mkdir(path.join(directory, id), { recursive: true });
  await writeFile(path.join(directory, id, name), bytes, { flag: "wx" });
  return res
    .status(201)
    .json({ url: `/api/building/projects/${id}/media/${name}` });
});
export default router;
