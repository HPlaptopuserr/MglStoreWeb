import { linkExistingCreditBorrower } from "./credit-borrower-link";
import { Router, type Router as ExpressRouter, type Request } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "@mgl/database";
import { canAccessPosOrganization, requirePosUser } from "./_shared";
import { parseCreditCustomerInput } from "./credit-customer.input";
import {
  CreditBorrowerError,
  findRegisteredCreditBorrower,
  resolveCreditBorrowerIdentity,
} from "../../../services/credit-borrower-identity";

const router: ExpressRouter = Router();
router.post("/pos/credit-customers/link-existing", linkExistingCreditBorrower);
const lookupKeys = new WeakMap<Request, string>();
const registeredBorrowerLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyGenerator: (req) => lookupKeys.get(req) || "unscoped",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Хэрэглэгч хайх оролдлого түр хязгаарлагдлаа. Түр хүлээгээд дахин оролдоно уу.",
  },
});

router.get("/pos/credit-customers/registered-user", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  const organizationId =
    typeof req.query.organizationId === "string"
      ? req.query.organizationId.trim()
      : "";
  if (!organizationId || !canAccessPosOrganization(actor, organizationId)) {
    return res
      .status(403)
      .json({ message: "Энэ байгууллагад зээлдэгч хайх эрхгүй байна" });
  }
  lookupKeys.set(req, `${actor.id}:${organizationId}`);
  return registeredBorrowerLimiter(req, res, async () => {
    try {
      const organization = await prisma.organization.findFirst({
        where: { id: organizationId, status: "ACTIVE", deletedAt: null },
        select: { id: true },
      });
      if (!organization)
        return res.status(404).json({ message: "Байгууллага олдсонгүй" });
      const user = await findRegisteredCreditBorrower(prisma, req.query.phone);
      res.setHeader("Cache-Control", "no-store");
      return res.json({ user });
    } catch (error: unknown) {
      if (error instanceof CreditBorrowerError)
        return res.status(error.status).json({ message: error.message });
      console.error("[POS registered borrower lookup]", error);
      return res.status(503).json({
        message:
          "MGL хэрэглэгчийн мэдээллийг шалгаж чадсангүй. Дахин оролдоно уу.",
      });
    }
  });
});

router.post("/pos/credit-customers", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    let data: ReturnType<typeof parseCreditCustomerInput>;
    try {
      data = parseCreditCustomerInput(req.body);
    } catch (error: unknown) {
      return res.status(400).json({
        message:
          error instanceof Error ? error.message : "Мэдээллээ шалгана уу",
      });
    }
    if (!canAccessPosOrganization(actor, data.organizationId))
      return res
        .status(403)
        .json({ message: "Энэ байгууллагад хэрэглэгч нэмэх эрхгүй байна" });
    const organization = await prisma.organization.findFirst({
      where: { id: data.organizationId, deletedAt: null, status: "ACTIVE" },
      select: { id: true },
    });
    if (!organization)
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    const customer = await prisma.$transaction(async (tx) => {
      const identity = await resolveCreditBorrowerIdentity(tx, data);
      const canonicalData = { ...data, ...identity };
      return tx.posCreditCustomer.upsert({
        where: {
          organizationId_normalizedBorrowerKey: {
            organizationId: data.organizationId,
            normalizedBorrowerKey: identity.normalizedBorrowerKey,
          },
        },
        create: canonicalData,
        update: identity,
        select: {
          id: true,
          borrowerUserId: true,
          targetType: true,
          borrowerId: true,
          borrowerName: true,
          borrowerPhone: true,
          borrowerEmail: true,
          borrowerAddress: true,
          workplace: true,
          department: true,
          jobTitle: true,
          employeeId: true,
          employeeName: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
    return res.json({ customer });
  } catch (error: unknown) {
    if (error instanceof CreditBorrowerError)
      return res.status(error.status).json({ message: error.message });
    console.error("[POS credit customer create]", error);
    return res
      .status(500)
      .json({ message: "Хэрэглэгч хадгалж чадсангүй. Дахин оролдоно уу." });
  }
});
export default router;
