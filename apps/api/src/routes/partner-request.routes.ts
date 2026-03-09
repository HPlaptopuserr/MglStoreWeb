import { Router, type Router as ExpressRouter } from "express";
import {
  prisma,
  Role,
  OnboardingSource,
  ApprovalStatus,
  OrgType,
  OrgStatus,
} from "@mgl/database";

const router: ExpressRouter = Router();

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

router.post("/partner-requests", async (req, res) => {
  try {
    const {
      email,
      phoneNumber,
      organizationName,
      businessCategory,
      operatingYears,
    } = req.body;

    const request = await prisma.registrationRequest.create({
      data: {
        email,
        phoneNumber,
        organizationName,
        businessCategory,
        operatingYears,
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
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/partner-requests", async (req, res) => {
  try {
    const status = req.query.status as keyof typeof ApprovalStatus | undefined;
    const search = String(req.query.search || "").trim();

    const requests = await prisma.registrationRequest.findMany({
      where: {
        requestedRole: Role.SUPPLIER,
        ...(status ? { status: ApprovalStatus[status] } : {}),
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
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.patch("/partner-requests/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    const existingRequest = await prisma.registrationRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return res.status(404).json({
        message: "Хүсэлт олдсонгүй",
      });
    }

    if (existingRequest.status !== ApprovalStatus.PENDING) {
      return res.status(400).json({
        message: "Зөвхөн PENDING хүсэлтийг approve хийж болно",
      });
    }

    if (!existingRequest.organizationName) {
      return res.status(400).json({
        message: "Байгууллагын нэр дутуу байна",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: existingRequest.email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Энэ email дээр бүртгэлтэй user аль хэдийн байна",
      });
    }

    const tempPassword = "12345678";
    const hashedPassword = await import("bcryptjs").then(
      ({ default: bcrypt }) => bcrypt.hash(tempPassword, 10),
    );

    const baseSlug = slugify(existingRequest.organizationName);
    const slug = `${baseSlug}-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      const newOrganization = await tx.organization.create({
        data: {
          name: existingRequest.organizationName!,
          slug,
          taxId: existingRequest.taxId || `TEMP-${Date.now()}`,
          type: existingRequest.organizationType || OrgType.SUPPLIER,
          status: OrgStatus.ACTIVE,
          email: existingRequest.organizationEmail || existingRequest.email,
          phone:
            existingRequest.organizationPhone || existingRequest.phoneNumber,
          address: existingRequest.organizationAddress,
          isVerified: false,
        },
      });

      const newUser = await tx.user.create({
        data: {
          email: existingRequest.email,
          passwordHash: hashedPassword,
          role: existingRequest.requestedRole || Role.SUPPLIER,
          isActive: true,
          onboardingSource: OnboardingSource.ADMIN,
          organizationId: newOrganization.id,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: newUser.id,
          organizationId: newOrganization.id,
          role: "OWNER",
          isActive: true,
        },
      });

      const updatedRequest = await tx.registrationRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: ApprovalStatus.APPROVED,
          approvedUserId: newUser.id,
          approvedAt: new Date(),
          reviewedAt: new Date(),
        },
      });

      return {
        organization: newOrganization,
        user: newUser,
        request: updatedRequest,
      };
    });

    return res.json({
      message: "Хүсэлт зөвшөөрөгдөж байгууллага болон бүртгэл үүслээ",
      data: result,
    });
  } catch (error) {
    console.error("approve error", error);

    return res.status(500).json({
      message: "Approve хийхэд алдаа гарлаа",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.patch("/partner-requests/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;

    const existingRequest = await prisma.registrationRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return res.status(404).json({
        message: "Хүсэлт олдсонгүй",
      });
    }

    if (existingRequest.status !== ApprovalStatus.PENDING) {
      return res.status(400).json({
        message: "Зөвхөн PENDING хүсэлтийг reject хийж болно",
      });
    }

    const updatedRequest = await prisma.registrationRequest.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        rejectedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    return res.json({
      message: "Хүсэлт татгалзагдлаа",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("reject error", error);

    return res.status(500).json({
      message: "Reject хийхэд алдаа гарлаа",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;