import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { Permission, BUSINESS_CAPABILITY_OPTIONS } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { qualityOrganizationKey } from "../../services/quality-network-settings";
import {
  blockedCapabilityGrants,
  isCapability,
  parseMemberCapabilities,
  sameCapabilities,
} from "../../services/business-member-capabilities";

const router: ExpressRouter = Router();

router.patch(
  "/admin/organizations/:organizationId/members/:memberId/capabilities",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS),
  async (req, res) => {
    const capabilities = parseMemberCapabilities(req.body);
    const expected: unknown = req.body?.expectedCapabilities;
    if (
      !capabilities ||
      !Array.isArray(expected) ||
      !expected.every(isCapability)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Ажлын эрхийн утга буруу байна. Жагсаалтаа шинэчлээд дахин оролдоно уу.",
        });
    }
    const { organizationId, memberId } = req.params;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const member = await tx.organizationMember.findFirst({
          where: {
            id: memberId,
            organizationId,
            isActive: true,
            deletedAt: null,
            organization: { deletedAt: null },
          },
          select: {
            id: true,
            role: true,
            capabilities: true,
            organization: {
              select: {
                businessPosEnabled: true,
                businessSalesEnabled: true,
                businessOrdersEnabled: true,
                businessInventoryEnabled: true,
                businessAttendanceEnabled: true,
                businessTasksEnabled: true,
                businessDeliveryEnabled: true,
              },
            },
          },
        });
        if (!member)
          return {
            status: 404,
            message: "Энэ байгууллагад идэвхтэй ажилтан олдсонгүй.",
          };
        if (member.role === "OWNER")
          return {
            status: 409,
            message: "Owner-д байгууллагын нээсэн аппууд автоматаар үйлчилнэ.",
          };
        if (!sameCapabilities(member.capabilities, expected))
          return {
            status: 409,
            message:
              "Ажилтны эрх өөрчлөгдсөн байна. Жагсаалтаа шинэчлээд дахин оролдоно уу.",
          };
        const checklist = await tx.siteSetting.findUnique({
          where: { key: qualityOrganizationKey(organizationId) },
          select: { value: true },
        });
        const org = member.organization;
        const blocked = blockedCapabilityGrants(
          capabilities,
          member.capabilities,
          {
            pos: org.businessPosEnabled,
            sales: org.businessSalesEnabled,
            orders: org.businessOrdersEnabled,
            inventory: org.businessInventoryEnabled,
            attendance: org.businessAttendanceEnabled,
            tasks: org.businessTasksEnabled,
            delivery: org.businessDeliveryEnabled,
            checklist: checklist?.value === "true",
          },
        );
        if (blocked.length)
          return {
            status: 409,
            message: `Байгууллагад аппыг эхлээд нээнэ үү: ${blocked.map((key) => BUSINESS_CAPABILITY_OPTIONS[key]?.label ?? key).join(", ")}`,
          };
        // Compare-and-swap prevents silently overwriting another administrator's grants.
        const updated = await tx.organizationMember.updateMany({
          where: {
            id: member.id,
            organizationId,
            role: { not: "OWNER" },
            isActive: true,
            deletedAt: null,
            capabilities: { equals: member.capabilities },
          },
          data: { capabilities },
        });
        if (updated.count !== 1)
          return {
            status: 409,
            message: "Ажилтны эрх өөрчлөгдсөн байна. Жагсаалтаа шинэчлэнэ үү.",
          };
        return { status: 200, capabilities };
      });
      return res
        .status(result.status)
        .json(
          result.status === 200
            ? { capabilities: result.capabilities }
            : { message: result.message },
        );
    } catch (error: unknown) {
      console.error("update business member capabilities error", error);
      return res
        .status(500)
        .json({ message: "Ажилтны эрх хадгалахад алдаа гарлаа." });
    }
  },
);

export default router;
