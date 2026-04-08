import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";

const router: ExpressRouter = Router();

// GET is public (used by job application form)
router.get("/job-positions", async (_req, res) => {
  try {
    const positions = await prisma.jobPosition.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json(positions);
  } catch (error) {
    console.error("get job positions error", error);
    return res.status(500).json({
      message: "Ажлын байрнуудыг авахад алдаа гарлаа",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/job-positions", requireAuth, requirePlatformPermission(Permission.MANAGE_JOB_POSITIONS), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: "Ажлын байрны нэр шаардлагатай",
      });
    }

    const trimmedName = String(name).trim();

    const slug = trimmedName
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\p{L}\p{N}-]+/gu, "");

    const exists = await prisma.jobPosition.findFirst({
      where: {
        OR: [{ name: trimmedName }, { slug }],
      },
    });

    if (exists) {
      return res.status(400).json({
        message: "Ийм ажлын байр аль хэдийн бүртгэлтэй байна",
      });
    }

    const position = await prisma.jobPosition.create({
      data: {
        name: trimmedName,
        slug,
        isActive: true,
      },
    });

    return res.json(position);
  } catch (error) {
    console.error("create job position error", error);
    return res.status(500).json({
      message: "Ажлын байр үүсгэхэд алдаа гарлаа",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.patch("/job-positions/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_JOB_POSITIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const dataToUpdate: any = {};
    
    if (name && String(name).trim()) {
      const trimmedName = String(name).trim();
      dataToUpdate.name = trimmedName;
      dataToUpdate.slug = trimmedName
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/[^\p{L}\p{N}-]+/gu, "");
    }
    
    if (isActive !== undefined) {
      dataToUpdate.isActive = Boolean(isActive);
    }

    const updated = await prisma.jobPosition.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.json(updated);
  } catch (error) {
    console.error("update job position error", error);
    return res.status(500).json({
      message: "Ажлын байр шинэчлэхэд алдаа гарлаа",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.delete("/job-positions/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_JOB_POSITIONS), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are applications
    const applicationsCount = await prisma.jobApplication.count({
      where: { jobPositionId: id },
    });

    if (applicationsCount > 0) {
      return res.status(400).json({
        message: "Энэ ажлын байранд анкет ирсэн тул устгах боломжгүй. Та идэвхгүй болгож болно.",
      });
    }

    await prisma.jobPosition.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("delete job position error", error);
    return res.status(500).json({
      message: "Ажлын байр устгахад алдаа гарлаа",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
