import { Router, type Router as ExpressRouter } from "express";
import { prisma, CardTerminalRequestStatus, AuditAction } from "@mgl/database";
import { requireAuth } from "../../middleware/auth";
import { requirePlatformPermission } from "../../middleware/auth";
import { Permission } from "@mgl/types";

const router: ExpressRouter = Router();

async function resolveOrganizationId(userId: string, explicitOrgId?: string): Promise<string | null> {
  if (explicitOrgId) {
    const member = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: explicitOrgId },
      select: { organizationId: true },
    });
    return member?.organizationId || null;
  }
  const member = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });
  return member?.organizationId || null;
}

/**
 * GET /api/vendor/card-terminal-requests/my
 * Vendor өөрийн байгууллагын card terminal хүсэлтийг харах
 */
router.get("/vendor/card-terminal-requests/my", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const explicitOrgId = req.query.organizationId as string | undefined;
    const organizationId = await resolveOrganizationId(userId, explicitOrgId);

    if (!organizationId) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    const requests = await prisma.cardTerminalRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(requests);
  } catch (error) {
    console.error("card-terminal-requests/my error", error);
    return res.status(500).json({ message: "Серверийн алдаа" });
  }
});

/**
 * POST /api/vendor/card-terminal-requests
 * Vendor card terminal үйлчилгээ хүсэх
 */
router.post("/vendor/card-terminal-requests", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { organizationId: explicitOrgId, contactName, contactPhone, contactEmail, providerType, businessNote } =
      req.body as {
        organizationId?: string;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
        providerType?: string;
        businessNote?: string;
      };

    const organizationId = await resolveOrganizationId(userId, explicitOrgId);
    if (!organizationId) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    if (!contactName || !contactPhone || !providerType) {
      return res.status(400).json({ message: "contactName, contactPhone, providerType шаардлагатай" });
    }

    // Check if there's already a pending/approved request
    const existing = await prisma.cardTerminalRequest.findFirst({
      where: {
        organizationId,
        status: { in: [CardTerminalRequestStatus.PENDING, CardTerminalRequestStatus.APPROVED] },
      },
    });

    if (existing) {
      return res.status(409).json({
        message:
          existing.status === CardTerminalRequestStatus.APPROVED
            ? "Таны card terminal аль хэдийн идэвхжсэн байна"
            : "Таны хүсэлт хянагдаж байна. Хариу хүлээнэ үү",
        request: existing,
      });
    }

    const request = await prisma.cardTerminalRequest.create({
      data: {
        organizationId,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail ? contactEmail.trim() : null,
        providerType: providerType.trim(),
        businessNote: businessNote ? businessNote.trim() : null,
        status: CardTerminalRequestStatus.PENDING,
      },
    });

    void prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CARD_TERMINAL_REQUEST_CREATED,
        ip: req.ip,
        meta: { requestId: request.id, organizationId, providerType },
      },
    });

    return res.status(201).json(request);
  } catch (error) {
    console.error("card-terminal-requests POST error", error);
    return res.status(500).json({ message: "Серверийн алдаа" });
  }
});

// ─── Admin endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/card-terminal-requests
 * Admin бүх хүсэлтийг харах
 */
router.get("/admin/card-terminal-requests", requireAuth, requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS), async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const requests = await prisma.cardTerminalRequest.findMany({
      where: status ? { status: status as CardTerminalRequestStatus } : undefined,
      include: {
        organization: {
          select: { id: true, name: true, slug: true, phone: true, email: true, taxId: true },
        },
        reviewedBy: {
          select: { id: true, email: true, profile: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(requests);
  } catch (error) {
    console.error("admin card-terminal-requests GET error", error);
    return res.status(500).json({ message: "Серверийн алдаа" });
  }
});

/**
 * PATCH /api/admin/card-terminal-requests/:id
 * Admin хүсэлтийг зөвшөөрөх (credentials оруулах) эсвэл татгалзах
 */
router.patch("/admin/card-terminal-requests/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS), async (req, res) => {
  try {
    const actor = (req as any).userId as string;
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ message: "id шаардлагатай" });

    const { status, adminNote, cardTerminalId, terminalBridgeUrl } = req.body as {
      status?: string;
      adminNote?: string;
      cardTerminalId?: string;
      terminalBridgeUrl?: string;
    };

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "status APPROVED эсвэл REJECTED байх ёстой" });
    }

    if (status === "APPROVED" && !cardTerminalId) {
      return res.status(400).json({ message: "Зөвшөөрөхөд cardTerminalId шаардлагатай" });
    }

    if (terminalBridgeUrl) {
      try {
        const parsed = new URL(terminalBridgeUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return res.status(400).json({ message: "terminalBridgeUrl зөвхөн http/https байх ёстой" });
        }
      } catch {
        return res.status(400).json({ message: "terminalBridgeUrl формат буруу байна" });
      }
    }

    const existing = await prisma.cardTerminalRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    if (existing.status !== CardTerminalRequestStatus.PENDING) {
      return res.status(409).json({ message: "Аль хэдийн шийдвэрлэгдсэн хүсэлт байна" });
    }

    const updated = await prisma.cardTerminalRequest.update({
      where: { id },
      data: {
        status: status as CardTerminalRequestStatus,
        adminNote: adminNote ? adminNote.trim() : null,
        cardTerminalId: status === "APPROVED" ? (cardTerminalId?.trim() || null) : null,
        terminalBridgeUrl: status === "APPROVED" ? (terminalBridgeUrl?.trim() || null) : null,
        reviewedById: actor,
        reviewedAt: new Date(),
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    void prisma.auditLog.create({
      data: {
        userId: actor,
        action:
          status === "APPROVED"
            ? AuditAction.CARD_TERMINAL_REQUEST_APPROVED
            : AuditAction.CARD_TERMINAL_REQUEST_REJECTED,
        ip: req.ip,
        meta: { requestId: id, organizationId: existing.organizationId, status },
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("admin card-terminal-requests PATCH error", error);
    return res.status(500).json({ message: "Серверийн алдаа" });
  }
});

export default router;
