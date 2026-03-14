import { Router, type Router as ExpressRouter } from "express";
import { prisma, ApprovalStatus } from "@mgl/database";

const router: ExpressRouter = Router();

/* POST /job-applications — create new application from careers form */
router.post("/job-applications", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      registerNumber,
      age,
      gender,
      address,
      jobPosition,
      education,
      salaryExpect,
      experience,
      professionalSkills,
      personalSkills,
      languages,
    } = req.body;

    if (!firstName || !lastName || !phone) {
      return res.status(400).json({
        message: "Нэр, овог, утасны дугаар шаардлагатай",
      });
    }

    const application = await prisma.jobApplication.create({
      data: {
        firstName,
        lastName,
        phone,
        registerNumber: registerNumber || null,
        age: age ? Number(age) : null,
        gender:
          gender === "Эрэгтэй"
            ? "MALE"
            : gender === "Эмэгтэй"
              ? "FEMALE"
              : null,
        address: address || null,
        jobPosition: jobPosition || null,
        education: education || null,
        salaryExpect: salaryExpect || null,
        experience: experience || null,
        professionalSkills: professionalSkills || null,
        personalSkills: personalSkills || null,
        languages: languages || null,
        status: ApprovalStatus.PENDING,
      },
    });

    return res.json(application);
  } catch (error) {
    console.error("create job application error", error);
    return res.status(500).json({
      message: "Анкет илгээхэд алдаа гарлаа",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/* GET /job-applications — list with filtering */
router.get("/job-applications", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const search = String(req.query.search || "").trim();

    const applications = await prisma.jobApplication.findMany({
      where: {
        ...(status &&
        status !== "ALL" &&
        ApprovalStatus[status as keyof typeof ApprovalStatus]
          ? { status: ApprovalStatus[status as keyof typeof ApprovalStatus] }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  firstName: { contains: search, mode: "insensitive" as const },
                },
                {
                  lastName: { contains: search, mode: "insensitive" as const },
                },
                { phone: { contains: search, mode: "insensitive" as const } },
                {
                  jobPosition: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(applications);
  } catch (error) {
    console.error("get job applications error", error);
    return res.status(500).json({
      message: "Анкетуудыг авахад алдаа гарлаа",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/* PATCH /job-applications/:id/approve */
router.patch("/job-applications/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    const app = await prisma.jobApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ message: "Анкет олдсонгүй" });
    if (app.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Зөвхөн хүлээгдэж буй анкетыг зөвшөөрнө" });
    }

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: { status: ApprovalStatus.APPROVED, reviewedAt: new Date() },
    });

    return res.json({ message: "Анкет зөвшөөрөгдлөө", data: updated });
  } catch (error) {
    console.error("approve job application error", error);
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Алдаа гарлаа",
    });
  }
});

/* PATCH /job-applications/:id/reject */
router.patch("/job-applications/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;

    const app = await prisma.jobApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ message: "Анкет олдсонгүй" });
    if (app.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Зөвхөн хүлээгдэж буй анкетыг татгалзана" });
    }

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: { status: ApprovalStatus.REJECTED, reviewedAt: new Date() },
    });

    return res.json({ message: "Анкет татгалзагдлаа", data: updated });
  } catch (error) {
    console.error("reject job application error", error);
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Алдаа гарлаа",
    });
  }
});

export default router;
