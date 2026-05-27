import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";

const router: ExpressRouter = Router();

const getStoreBranches = async (req: any, res: any) => {
  try {
    const organizationId = String(req.query.organizationId || "").trim();
    const organizationSlug = String(req.query.organizationSlug || "").trim();
    const q = String(req.query.q || "").trim();

    const branches = await prisma.branch.findMany({
      where: {
        deletedAt: null,
        organizationId: organizationId || undefined,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { address: { contains: q, mode: "insensitive" } },
                {
                  organization: {
                    name: { contains: q, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
        organization: {
          deletedAt: null,
          status: "ACTIVE",
          slug: organizationSlug || undefined,
        },
      },
      orderBy: [{ organizationId: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    res.json(
      branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        lat: branch.lat,
        lng: branch.lng,
        latitude: branch.lat,
        longitude: branch.lng,
        hasCoordinates: branch.lat !== null && branch.lng !== null,
        organizationId: branch.organization.id,
        mapsUrl:
          branch.lat !== null && branch.lng !== null
            ? `https://maps.google.com/?q=${branch.lat},${branch.lng}`
            : null,
        organization: branch.organization,
        createdAt: branch.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error("GET /store/branches error", error);
    res.status(500).json({ message: "Салбарын байршлын мэдээлэл авахад алдаа гарлаа" });
  }
};

// Public branch locations for mobile apps. Keep both names for app compatibility.
router.get("/store/branches", getStoreBranches);
router.get("/store/locations", getStoreBranches);

export default router;
