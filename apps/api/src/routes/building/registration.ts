import { randomUUID } from "node:crypto";
import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { Prisma, prisma } from "@mgl/database";
import { parseBuildingRegistration } from "../../services/building/registration-input";
import { BuildingInputError } from "../../services/building/project-input";
const router: ExpressRouter = Router();
router.post(
  "/register",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Олон удаа оролдлоо. Түр хүлээгээд дахин оролдоно уу.",
    },
  }),
  async (req, res) => {
    try {
      const input = parseBuildingRegistration(req.body as unknown);
      const existing = await prisma.user.findUnique({
        where: { email: input.email },
        select: {
          id: true,
          passwordHash: true,
          isActive: true,
          deletedAt: true,
        },
      });
      if (input.mode === "new" && existing)
        return res.status(409).json({
          message:
            "Энэ и-мэйл бүртгэлтэй байна. «MGL бүртгэлтэй» сонголтоор одоогийн нууц үгээ ашиглана уу.",
        });
      if (
        input.mode === "existing" &&
        (!existing?.passwordHash ||
          !existing.isActive ||
          existing.deletedAt ||
          !(await bcrypt.compare(input.password, existing.passwordHash)))
      )
        return res
          .status(401)
          .json({ message: "И-мэйл эсвэл нууц үг буруу байна." });
      const passwordHash =
        input.mode === "new" ? await bcrypt.hash(input.password, 12) : null;
      const result = await prisma.$transaction(async (tx) => {
        const user = existing
          ? await tx.user.findFirst({
              where: {
                id: existing.id,
                isActive: true,
                deletedAt: null,
                passwordHash: existing.passwordHash,
              },
              select: { id: true },
            })
          : await tx.user.create({
              data: {
                email: input.email,
                passwordHash,
                role: "USER",
                profile: {
                  create: {
                    fullName: input.fullName,
                    phoneNumber: input.phone,
                  },
                },
              },
              select: { id: true },
            });
        if (!user)
          throw new BuildingInputError(
            "Бүртгэлийн төлөв өөрчлөгдсөн байна. Дахин оролдоно уу.",
          );
        // Never attach the applicant to an existing organization by tax ID.
        const organization = await tx.organization.create({
          data: {
            name: input.organizationName,
            taxId: input.taxId,
            slug: `building-${randomUUID()}`,
            type: "BUSINESS_CUSTOMER",
            status: "ACTIVE",
            isVerified: false,
            phone: input.phone,
            email: input.email,
            businessCategory: "Барилга",
            businessBuildingEnabled: true,
            businessPosEnabled: false,
            businessSalesEnabled: false,
            businessOrdersEnabled: false,
            businessInventoryEnabled: false,
            businessAttendanceEnabled: false,
            businessTasksEnabled: false,
            businessDeliveryEnabled: false,
            members: {
              create: { userId: user.id, role: "OWNER", isPrimary: !existing },
            },
          },
          select: { id: true },
        });
        return organization;
      });
      return res.status(201).json({
        organizationId: result.id,
        message:
          "Байгууллага бүртгэгдлээ. Нэвтэрч төслөө ноорог болгон бүртгээрэй.",
      });
    } catch (error: unknown) {
      if (error instanceof BuildingInputError)
        return res.status(400).json({ message: error.message });
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return res.status(409).json({
          message:
            "И-мэйл, утас эсвэл байгууллагын регистр аль хэдийн бүртгэлтэй байна. Бүртгэлтэй байгууллагын эзэмшигчтэй холбогдоно уу.",
        });
      throw error;
    }
  },
);
export default router;
