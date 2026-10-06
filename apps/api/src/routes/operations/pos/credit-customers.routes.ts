import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { canAccessPosOrganization, requirePosUser } from "./_shared";
import { parseCreditCustomerInput } from "./credit-customer.input";
const router: ExpressRouter = Router();
router.post("/pos/credit-customers", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    let data: ReturnType<typeof parseCreditCustomerInput>;
    try {
      data = parseCreditCustomerInput(req.body);
    } catch (error) {
      return res
        .status(400)
        .json({
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
    const customer = await prisma.posCreditCustomer.upsert({
      where: {
        organizationId_normalizedBorrowerKey: {
          organizationId: data.organizationId,
          normalizedBorrowerKey: data.normalizedBorrowerKey,
        },
      },
      create: data,
      update: {},
      select: {
        id: true,
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
    return res.json({ customer });
  } catch (error) {
    console.error("[POS credit customer create]", error);
    return res
      .status(500)
      .json({ message: "Хэрэглэгч хадгалж чадсангүй. Дахин оролдоно уу." });
  }
});
export default router;
