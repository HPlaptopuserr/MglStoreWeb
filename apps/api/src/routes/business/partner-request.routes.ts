import { Router, type Router as ExpressRouter } from "express";
import { prisma, Role, OnboardingSource, ApprovalStatus } from "@mgl/database";
import {
  approvePartnerRequest,
  rejectPartnerRequest,
} from "../../services/partner-request.service";
import { requireAuth, requireRole } from "../../middleware/auth";

const router: ExpressRouter = Router();

router.post("/partner-requests", async (req, res) => {
  try {
    const {
      email,
      phoneNumber,
      organizationName,
      businessCategory,
      operatingYears,
      organizationType,
      taxId,
      organizationEmail,
      organizationPhone,
      organizationAddress,
      fullName,
      note,
    } = req.body;

    if (!organizationName) {
      return res.status(400).json({
        message: "organizationName шаардлагатай",
      });
    }

    if (!email && !phoneNumber) {
      return res.status(400).json({
        message: "И-мэйл эсвэл утасны дугаарын аль нэгийг оруулна уу",
      });
    }

    const request = await prisma.registrationRequest.create({
      data: {
        email,
        phoneNumber,
        organizationName,
        businessCategory,
        operatingYears:
          typeof operatingYears === "number"
            ? operatingYears
            : operatingYears
              ? Number(operatingYears)
              : null,
        organizationType,
        taxId,
        organizationEmail,
        organizationPhone,
        organizationAddress,
        fullName,
        note,
        requestedRole: Role.SUPPLIER,
        source: OnboardingSource.SELF_SERVICE,
        status: ApprovalStatus.PENDING,
      },
    });

    return res.json(request);
  } catch (error) {
    console.error("create partner request error", error);

    return res.status(500).json({
      message: "Хүсэлт үүсгэхэд алдаа гарлаа",
    });
  }
});

router.get("/partner-requests", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const status = req.query.status as keyof typeof ApprovalStatus | undefined;
    const search = String(req.query.search || "").trim();

    const requests = await prisma.registrationRequest.findMany({
      where: {
        requestedRole: Role.SUPPLIER,
        ...(status && ApprovalStatus[status]
          ? { status: ApprovalStatus[status] }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  organizationName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  phoneNumber: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  businessCategory: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(requests);
  } catch (error) {
    console.error("get partner requests error", error);

    return res.status(500).json({
      message: "Хүсэлтүүдийг авахад алдаа гарлаа",
    });
  }
});

router.patch("/partner-requests/:id/approve", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = String(req.params.id);

    const result = await approvePartnerRequest(id);

    return res.json({
      message: "Хүсэлт зөвшөөрөгдөж байгууллага болон хэрэглэгч үүслээ",
      data: result,
    });
  } catch (error) {
    console.error("approve error", error);

    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Approve хийхэд алдаа гарлаа",
    });
  }
});

router.patch("/partner-requests/:id/reject", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = String(req.params.id);

    const updatedRequest = await rejectPartnerRequest(id);

    return res.json({
      message: "Хүсэлт татгалзагдлаа",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("reject error", error);

    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Reject хийхэд алдаа гарлаа",
    });
  }
});

// One-time sync: copy phoneNumber from RegistrationRequest → User Profile
// for already-approved vendors that were created before this fix
router.post("/partner-requests/sync-profiles", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const approved = await prisma.registrationRequest.findMany({
      where: {
        status: ApprovalStatus.APPROVED,
        approvedUserId: { not: null },
        phoneNumber: { not: null },
      },
      select: {
        approvedUserId: true,
        phoneNumber: true,
        fullName: true,
        organizationName: true,
      },
    });

    let updated = 0;
    for (const req of approved) {
      if (!req.approvedUserId || !req.phoneNumber) continue;
      await prisma.profile.upsert({
        where: { userId: req.approvedUserId },
        update: { phoneNumber: req.phoneNumber },
        create: {
          userId: req.approvedUserId,
          fullName: req.fullName || req.organizationName || "",
          phoneNumber: req.phoneNumber,
        },
      });
      updated++;
    }

    return res.json({ message: `${updated} vendor profile синк хийгдлээ` });
  } catch (error) {
    console.error("sync profiles error", error);
    return res.status(500).json({ message: "Синк хийхэд алдаа гарлаа" });
  }
});

export default router;
