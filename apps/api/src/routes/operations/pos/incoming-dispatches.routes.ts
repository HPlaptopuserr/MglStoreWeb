import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  fromPosStoredStockQuantity,
  normalizePosMeasureUnit,
} from "@mgl/types";
import { canAccessPosOrganization, requirePosUser } from "./_shared";

const router: ExpressRouter = Router();
const acknowledgementId = (id: string) => `dispatch-received:${id}`;

router.get("/pos/incoming-dispatches", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const organizationId = String(req.query.organizationId || "");
    if (!organizationId || !canAccessPosOrganization(actor, organizationId))
      return res
        .status(403)
        .json({ message: "Байгууллагын илгээлт харах эрхгүй байна" });
    const dispatches = await prisma.stockDispatch.findMany({
      where: { organizationId, status: { in: ["DISPATCHED", "DELIVERED"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        dispatchNumber: true,
        status: true,
        warehouse: { select: { name: true } },
        request: {
          select: {
            items: {
              select: {
                id: true,
                quantity: true,
                approvedQuantity: true,
                product: { select: { name: true, unit: true } },
              },
            },
          },
        },
      },
    });
    const acknowledgements = await prisma.auditLog.findMany({
      where: { id: { in: dispatches.map((d) => acknowledgementId(d.id)) } },
      select: { id: true, createdAt: true },
    });
    const received = new Map(
      acknowledgements.map((a) => [a.id, a.createdAt.toISOString()]),
    );
    return res.json(
      dispatches.map((d) => ({
        id: d.id,
        dispatchNumber: d.dispatchNumber,
        status: d.status,
        warehouseName: d.warehouse.name,
        receivedAt: received.get(acknowledgementId(d.id)) || null,
        items: d.request.items.map((i) => ({
          id: i.id,
          name: i.product.name,
          quantity: fromPosStoredStockQuantity(
            i.approvedQuantity ?? i.quantity,
            i.product.unit,
          ),
          unit: normalizePosMeasureUnit(i.product.unit),
        })),
      })),
    );
  } catch (error) {
    console.error("Incoming dispatch list failed", error);
    return res
      .status(500)
      .json({ message: "Илгээлтийн жагсаалт авч чадсангүй" });
  }
});

// Only identifiers and labels are needed for receiving; terminal settings stay private.
router.get("/pos/receiving-registers", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    if (!actor.organizationId)
      return res
        .status(400)
        .json({ message: "Байгууллагын мэдээлэл олдсонгүй" });
    const registers = await prisma.posRegister.findMany({
      where: {
        organizationId: actor.organizationId,
        isActive: true,
        deletedAt: null,
        activationStatus: "APPROVED",
      },
      select: {
        id: true,
        name: true,
        label: true,
        branch: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
    return res.json(registers);
  } catch (error) {
    console.error("Receiving register list failed", error);
    return res
      .status(500)
      .json({ message: "Хүлээн авах кассын жагсаалт авч чадсангүй" });
  }
});

// Receipt acknowledgement is separate from courier delivery and never transfers stock again.
router.post("/pos/incoming-dispatches/:id/receive", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const dispatch = await prisma.stockDispatch.findUnique({
      where: { id: String(req.params.id) },
      select: { id: true, organizationId: true, status: true },
    });
    if (!dispatch || !canAccessPosOrganization(actor, dispatch.organizationId))
      return res
        .status(403)
        .json({ message: "Энэ илгээлтийг хүлээн авах эрхгүй байна" });
    if (dispatch.status !== "DELIVERED")
      return res.status(409).json({
        message: "Хүргэгч хүргэлтээ баталгаажуулсны дараа хүлээн авна уу",
      });
    const acknowledgement = await prisma.auditLog.upsert({
      where: { id: acknowledgementId(dispatch.id) },
      update: {},
      create: {
        id: acknowledgementId(dispatch.id),
        userId: actor.id,
        action: "DELIVERY_STATUS_CHANGED",
        meta: {
          operation: "RECIPIENT_ACKNOWLEDGED",
          dispatchId: dispatch.id,
          organizationId: dispatch.organizationId,
        },
      },
      select: { createdAt: true },
    });
    return res.json({ receivedAt: acknowledgement.createdAt.toISOString() });
  } catch (error) {
    console.error("Incoming dispatch receipt failed", error);
    return res
      .status(500)
      .json({ message: "Хүлээн авалтыг баталгаажуулж чадсангүй" });
  }
});
export default router;
