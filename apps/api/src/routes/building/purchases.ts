import { Router, type Router as ExpressRouter, type Request } from "express";
import { Prisma, prisma } from "@mgl/database";
import { validatePurchaseTerms, type PurchaseSnapshot } from "@mgl/types";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
const router: ExpressRouter = Router();
const identity = (req: Request) =>
  (req as Request & { user: AuthPayload }).user;
const projectScope = (scope: Prisma.OrganizationWhereInput) => ({
  deletedAt: null,
  organization: scope,
});

router.get("/admin/purchases", async (_req, res) => {
  const contracts = await prisma.barilgaPurchaseContract.findMany({
    where: {
      unit: {
        floor: { block: { project: projectScope(res.locals.buildingScope) } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ contracts });
});
router.post("/admin/purchases/buyer", async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  if (!email || email.length > 254)
    return res.status(400).json({ message: "И-мэйл оруулна уу." });
  const buyer = await prisma.user.findFirst({
    where: { email, isActive: true, deletedAt: null },
    select: { email: true },
  });
  if (!buyer || identity(req).email.toLowerCase() === email)
    return res.status(404).json({
      message: "Тусдаа идэвхтэй худалдан авагчийн бүртгэл олдсонгүй.",
    });
  res.json({ buyer });
});
router.post("/admin/purchases", async (req, res) => {
  try {
    const input = validatePurchaseTerms(req.body as unknown);
    const auth = identity(req);
    const contract = await prisma.$transaction(
      async (tx) => {
        const previous = await tx.barilgaPurchaseContract.findUnique({
          where: { requestKey: input.requestKey },
        });
        if (previous) {
          if (previous.createdById !== auth.userId)
            throw new Error("Хүсэлтийн дугаар давхардсан.");
          return previous;
        }
        const unit = await tx.barilgaUnit.findFirst({
          where: {
            id: input.unitId,
            floor: {
              block: { project: projectScope(res.locals.buildingScope) },
            },
          },
          include: {
            floor: {
              include: {
                block: {
                  include: {
                    project: {
                      include: { organization: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        });
        if (!unit || unit.status !== "AVAILABLE")
          throw new Error("Байр боломжтой төлөвт биш эсвэл хандах эрхгүй.");
        const buyer = await tx.user.findFirst({
          where: {
            email: input.buyerEmail.trim().toLowerCase(),
            isActive: true,
            deletedAt: null,
          },
        });
        if (!buyer || buyer.id === auth.userId)
          throw new Error("Худалдан авагчийн тусдаа бүртгэл шаардлагатай.");
        const lock = await tx.barilgaUnit.updateMany({
          where: { id: unit.id, status: "AVAILABLE" },
          data: { status: "CONTRACT_PENDING" },
        });
        if (lock.count !== 1)
          throw new Error("Байрыг өөр захиалгад сонгосон байна.");
        const snapshot: PurchaseSnapshot = {
          ...input,
          buyerEmail: buyer.email,
          project: unit.floor.block.project.title,
          block: unit.floor.block.name,
          floor: unit.floor.number,
          unitNo: unit.unitNo,
          area: unit.areaM2?.toString() ?? null,
          seller: unit.floor.block.project.organization.name,
        };
        return tx.barilgaPurchaseContract.create({
          data: {
            unitId: unit.id,
            buyerId: buyer.id,
            createdById: auth.userId,
            requestKey: input.requestKey,
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    res.status(201).json({ contract });
  } catch (error: unknown) {
    res.status(409).json({
      message:
        error instanceof Error ? error.message : "Захиалга хадгалж чадсангүй.",
    });
  }
});
router.get("/buyer/purchases", requireAuth, async (req, res) => {
  const contracts = await prisma.barilgaPurchaseContract.findMany({
    where: { buyerId: identity(req).userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ contracts });
});
for (const side of ["admin", "buyer"] as const) {
  router.post(
    `/${side}/purchases/:id/accept`,
    requireAuth,
    async (req, res) => {
      if (req.body?.accepted !== true)
        return res
          .status(400)
          .json({ message: "Гэрээний нөхцөлийг зөвшөөрнө үү." });
      try {
        const auth = identity(req);
        const contract = await prisma.$transaction(
          async (tx) => {
            const c = await tx.barilgaPurchaseContract.findFirst({
              where: {
                id: String(req.params.id),
                ...(side === "buyer"
                  ? { buyerId: auth.userId }
                  : {
                      unit: {
                        floor: {
                          block: {
                            project: projectScope(res.locals.buildingScope),
                          },
                        },
                      },
                    }),
              },
            });
            if (!c || (side === "admin" && c.buyerId === auth.userId))
              throw new Error("Гэрээг батлах эрхгүй.");
            if (c.status === "COMPLETED") return c;
            if (c.status !== "PENDING")
              throw new Error("Энэ гэрээг батлах боломжгүй.");
            const now = new Date();
            const updated = await tx.barilgaPurchaseContract.update({
              where: { id: c.id },
              data:
                side === "buyer"
                  ? { buyerAcceptedAt: c.buyerAcceptedAt ?? now }
                  : {
                      sellerAcceptedAt: c.sellerAcceptedAt ?? now,
                      sellerAcceptedById: c.sellerAcceptedById ?? auth.userId,
                    },
            });
            if (!updated.buyerAcceptedAt || !updated.sellerAcceptedAt)
              return updated;
            const terms = validatePurchaseTerms(c.snapshot);
            const total = new Prisma.Decimal(terms.total);
            const down = terms.schedule
              .filter((row) => row.kind === "DOWN_PAYMENT")
              .reduce((sum, row) => sum.add(row.amount), new Prisma.Decimal(0));
            const reservation = await tx.barilgaReservation.create({
              data: {
                unitId: c.unitId,
                reservedById: c.createdById,
                customerName: terms.customerName,
                customerPhone: terms.customerPhone || null,
                agreedPriceTotal: total,
                downPaymentPercent: down.div(total).mul(100).toDecimalPlaces(2),
                paymentOption: "CONTRACT_SCHEDULE",
                status: "CONVERTED",
                note: `Гэрээ № ${c.id} · Хоёр тал зөвшөөрсөн`,
                paymentSchedule: {
                  create: terms.schedule.map((row) => ({
                    amount: row.amount,
                    dueDate: new Date(`${row.date}T00:00:00+08:00`),
                    status: "PENDING",
                  })),
                },
              },
            });
            await tx.barilgaUnit.update({
              where: { id: c.unitId },
              data: { status: "SOLD" },
            });
            return tx.barilgaPurchaseContract.update({
              where: { id: c.id },
              data: { status: "COMPLETED", reservationId: reservation.id },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        res.json({ contract });
      } catch (error: unknown) {
        res.status(409).json({
          message:
            error instanceof Error
              ? error.message
              : "Баталж чадсангүй. Дахин оролдоно уу.",
        });
      }
    },
  );
}
router.post("/admin/purchases/:id/cancel", async (req, res) => {
  try {
    const contract = await prisma.$transaction(
      async (tx) => {
        const c = await tx.barilgaPurchaseContract.findFirst({
          where: {
            id: String(req.params.id),
            unit: {
              floor: {
                block: { project: projectScope(res.locals.buildingScope) },
              },
            },
          },
        });
        if (!c || c.status !== "PENDING")
          throw new Error("Зөвхөн хүлээгдэж буй гэрээг цуцална.");
        const updated = await tx.barilgaPurchaseContract.update({
          where: { id: c.id },
          data: { status: "CANCELLED" },
        });
        await tx.barilgaUnit.updateMany({
          where: { id: c.unitId, status: "CONTRACT_PENDING" },
          data: { status: "AVAILABLE" },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    res.json({ contract });
  } catch (error: unknown) {
    res
      .status(409)
      .json({
        message: error instanceof Error ? error.message : "Цуцалж чадсангүй",
      });
  }
});
export default router;
