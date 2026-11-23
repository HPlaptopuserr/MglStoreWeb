import type { Request, Response } from "express";
import { prisma, Prisma } from "@mgl/database";
import { requirePosUser, canAccessPosOrganization } from "./_shared";
import { lockOrganizationInventory } from "../../../services/vendor-inventory-warehouse.service";
import {
  CreditBorrowerError,
  resolveCreditBorrowerIdentity,
} from "../../../services/credit-borrower-identity";

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const nullableText = (value: unknown) =>
  value === null || typeof value === "string";
type ExpectedCredit = {
  id: string;
  customerId: string | null;
  borrowerId: string;
  borrowerPhone: string | null;
  borrowerUserId: string | null;
};
function expectedCredit(value: unknown): value is ExpectedCredit {
  return (
    object(value) &&
    typeof value.id === "string" &&
    Boolean(value.id) &&
    typeof value.borrowerId === "string" &&
    nullableText(value.customerId) &&
    nullableText(value.borrowerPhone) &&
    nullableText(value.borrowerUserId)
  );
}
const snapshot = (credit: {
  id: string;
  customerId: string | null;
  targetType: string;
  borrowerUserId: string | null;
  borrowerId: string;
  borrowerName: string;
  borrowerPhone: string | null;
  borrowerEmail: string | null;
  employeeId: string | null;
  employeeName: string | null;
}) => ({
  id: credit.id,
  customerId: credit.customerId,
  targetType: credit.targetType,
  borrowerUserId: credit.borrowerUserId,
  borrowerId: credit.borrowerId,
  borrowerName: credit.borrowerName,
  borrowerPhone: credit.borrowerPhone,
  borrowerEmail: credit.borrowerEmail,
  employeeId: credit.employeeId,
  employeeName: credit.employeeName,
});

/** Explicit, reviewed correction of selected legacy debts. Never merges users or changes money. */
export async function linkExistingCreditBorrower(req: Request, res: Response) {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const body: unknown = req.body;
    if (!object(body))
      throw new CreditBorrowerError(400, "Холбох зээлийн мэдээлэл буруу байна");
    const organizationId = text(body.organizationId);
    const ids = Array.isArray(body.creditSaleIds)
      ? body.creditSaleIds.map(text)
      : [];
    const expected = Array.isArray(body.expectedCredits)
      ? body.expectedCredits
      : [];
    if (
      !organizationId ||
      !ids.length ||
      ids.length > 500 ||
      ids.some((id) => !id || id.length > 200) ||
      new Set(ids).size !== ids.length ||
      expected.length !== ids.length ||
      !expected.every(expectedCredit) ||
      new Set(expected.map((row) => row.id)).size !== ids.length ||
      expected.some((row) => !ids.includes(row.id))
    ) {
      throw new CreditBorrowerError(
        400,
        "Зээлүүд болон анхны зээлдэгчийн мэдээллийг бүрэн илгээнэ үү",
      );
    }
    const admin = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";
    if (!admin && !canAccessPosOrganization(actor, organizationId))
      throw new CreditBorrowerError(
        403,
        "Энэ байгууллагын зээлийг холбох эрхгүй байна",
      );
    const result = await prisma.$transaction(
      async (tx) => {
        await lockOrganizationInventory(tx, organizationId);
        if (!admin) {
          const manager = await tx.organizationMember.findFirst({
            where: {
              userId: actor.id,
              organizationId,
              isActive: true,
              deletedAt: null,
              role: { in: ["OWNER", "ADMIN"] },
            },
            select: { id: true },
          });
          if (!manager)
            throw new CreditBorrowerError(
              403,
              "Зээл холбох үйлдлийг байгууллагын owner эсвэл админ гүйцэтгэнэ",
            );
        }
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "PosCreditSale" WHERE "organizationId" = ${organizationId} AND "id" IN (${Prisma.join([...ids].sort())}) ORDER BY "id" FOR UPDATE`,
        );
        const credits = await tx.posCreditSale.findMany({
          where: { id: { in: ids }, organizationId },
          orderBy: { id: "asc" },
        });
        if (credits.length !== ids.length)
          throw new CreditBorrowerError(
            404,
            "Сонгосон зээлүүд энэ байгууллагад олдсонгүй",
          );
        if (
          credits.some(
            (credit) => credit.status !== "OPEN" && credit.status !== "OVERDUE",
          )
        )
          throw new CreditBorrowerError(
            409,
            "Зөвхөн нээлттэй зээлийг холбож болно. Жагсаалтаа шинэчилнэ үү",
          );
        const first = credits[0]!;
        if (
          credits.some(
            (credit) =>
              credit.targetType !== first.targetType ||
              credit.borrowerId !== first.borrowerId ||
              credit.employeeId !== first.employeeId,
          )
        )
          throw new CreditBorrowerError(
            409,
            "Нэг зээлдэгчийн ижил төрлийн зээлүүдийг сонгоно уу",
          );
        const identity = await resolveCreditBorrowerIdentity(tx, {
          borrowerUserId: body.borrowerUserId,
          borrowerPhone: body.borrowerPhone,
          targetType: first.targetType,
          borrowerName:
            first.targetType === "COMPANY"
              ? text(body.companyName) || first.borrowerName
              : first.borrowerName,
        });
        if (
          credits.some(
            (credit) =>
              credit.borrowerUserId !== null &&
              credit.borrowerUserId !== identity.borrowerUserId,
          )
        )
          throw new CreditBorrowerError(
            409,
            "Өөр MGL хэрэглэгчтэй холбогдсон зээлийг шилжүүлэх боломжгүй",
          );
        const user = {
          id: identity.borrowerUserId,
          fullName: identity.employeeName || identity.borrowerName,
          phoneNumber: identity.borrowerPhone,
          email: identity.borrowerEmail,
        };
        const alreadyLinked = credits.every(
          (credit) =>
            credit.borrowerUserId === identity.borrowerUserId &&
            credit.borrowerId === identity.borrowerId &&
            credit.borrowerPhone === identity.borrowerPhone &&
            credit.borrowerName === identity.borrowerName &&
            credit.borrowerEmail === identity.borrowerEmail &&
            credit.employeeName === identity.employeeName &&
            credit.employeeId === identity.employeeId,
        );
        if (alreadyLinked)
          return {
            linkedCreditSaleIds: credits.map((credit) => credit.id),
            borrowerUserId: identity.borrowerUserId,
            linkedCount: credits.length,
            user,
            unchanged: true,
          };
        for (const credit of credits) {
          const original = expected.find((row) => row.id === credit.id)!;
          if (
            credit.customerId !== original.customerId ||
            credit.borrowerId !== original.borrowerId ||
            credit.borrowerPhone !== original.borrowerPhone ||
            credit.borrowerUserId !== original.borrowerUserId
          ) {
            throw new CreditBorrowerError(
              409,
              "Зээлдэгчийн мэдээлэл өөрчлөгдсөн байна. Жагсаалтаа шинэчилж дахин сонгоно уу",
            );
          }
        }
        const customer = await tx.posCreditCustomer.upsert({
          where: {
            organizationId_normalizedBorrowerKey: {
              organizationId,
              normalizedBorrowerKey: identity.normalizedBorrowerKey,
            },
          },
          create: {
            organizationId,
            ...identity,
            borrowerAddress: first.borrowerAddress,
          },
          update: identity,
          select: { id: true, mergedIntoId: true },
        });
        if (customer.mergedIntoId)
          throw new CreditBorrowerError(
            409,
            "Зээлдэгчийн үндсэн бүртгэл өөр бүртгэлд нэгтгэгдсэн байна. Шалгаж дахин сонгоно уу",
          );
        const { normalizedBorrowerKey: _key, ...identityFields } = identity;
        const after = [];
        for (const credit of credits) {
          const updated = await tx.posCreditSale.update({
            where: { id: credit.id },
            data: {
              customerId: customer.id,
              ...identityFields,
              updatedAt: credit.updatedAt,
            },
          });
          after.push(snapshot(updated));
        }
        const customerAliases: Array<{
          customerId: string;
          previousMergedIntoId: string | null;
          mergedIntoId: string;
        }> = [];
        const previousCustomerIds = [
          ...new Set(
            credits.flatMap((credit) =>
              credit.customerId && credit.customerId !== customer.id
                ? [credit.customerId]
                : [],
            ),
          ),
        ];
        for (const previousCustomerId of previousCustomerIds) {
          const remaining = await tx.posCreditSale.count({
            where: {
              customerId: previousCustomerId,
              status: { in: ["OPEN", "OVERDUE"] },
            },
          });
          if (remaining) continue;
          const previous = await tx.posCreditCustomer.findUnique({
            where: { id: previousCustomerId },
          });
          if (
            !previous ||
            previous.organizationId !== organizationId ||
            previous.targetType !== identity.targetType ||
            (previous.borrowerUserId &&
              previous.borrowerUserId !== identity.borrowerUserId) ||
            previous.mergedIntoId
          )
            continue;
          // A company contact correction must not silently merge different employers.
          const normalizeCompany = (name: string) =>
            name
              .normalize("NFKC")
              .trim()
              .toLocaleLowerCase("mn-MN")
              .replace(/\s+/g, " ");
          if (
            identity.targetType === "COMPANY" &&
            normalizeCompany(previous.borrowerName) !==
              normalizeCompany(identity.borrowerName)
          )
            continue;
          await tx.posCreditCustomer.update({
            where: { id: previousCustomerId },
            data: { mergedIntoId: customer.id, updatedAt: previous.updatedAt },
          });
          customerAliases.push({
            customerId: previousCustomerId,
            previousMergedIntoId: previous.mergedIntoId,
            mergedIntoId: customer.id,
          });
        }
        const audit = await tx.auditLog.create({
          data: {
            userId: actor.id,
            action: "POS_REGISTER_UPDATED",
            meta: {
              event: "CREDIT_BORROWER_LINKED",
              organizationId,
              borrowerUserId: identity.borrowerUserId,
              creditSaleIds: credits.map((credit) => credit.id),
              before: credits.map(snapshot),
              after,
              customerAliases,
              financialStateUnchanged: true,
            },
          },
          select: { id: true },
        });
        return {
          linkedCreditSaleIds: credits.map((credit) => credit.id),
          borrowerUserId: identity.borrowerUserId,
          linkedCount: credits.length,
          user,
          auditId: audit.id,
        };
      },
      { timeout: 30_000 },
    );
    res.setHeader("Cache-Control", "no-store");
    return res.json(result);
  } catch (error: unknown) {
    if (error instanceof CreditBorrowerError)
      return res.status(error.status).json({ message: error.message });
    console.error("[POS existing credit borrower link]", error);
    return res.status(503).json({
      message: "Зээлдэгчийг холбож чадсангүй. Мэдээллийг хэвээр үлдээлээ.",
    });
  }
}
