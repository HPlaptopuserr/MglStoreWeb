import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import { linkExistingCreditBorrower } from "./credit-borrower-link";
import {
  findRegisteredCreditBorrower,
  CreditBorrowerError,
} from "../../../services/credit-borrower-identity";
import { JWT_SECRET } from "./_shared";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.CREDIT_BORROWER_LINK_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

test(
  "local database corrections preserve legacy money and dates while linking only reviewed debts",
  { skip: !enabled },
  async (t) => {
    const app = express();
    app.use(express.json());
    app.post("/link", linkExistingCreditBorrower);
    const server = createServer(app);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    try {
      const key = randomUUID();
      const phone = `98${(BigInt(`0x${key.replace(/-/g, "").slice(0, 12)}`) % 1000000n).toString().padStart(6, "0")}`;
      const organization = await prisma.organization.create({
        data: {
          name: "Local linking integration",
          slug: key,
          taxId: key,
          status: "ACTIVE",
        },
      });
      const owner = await prisma.user.create({
        data: { email: `${key}@owner.local.invalid` },
      });
      const borrower = await prisma.user.create({
        data: {
          email: `${key}@borrower.local.invalid`,
          profile: {
            create: { fullName: "Canonical borrower", phoneNumber: phone },
          },
        },
      });
      const membership = await prisma.organizationMember.create({
        data: {
          userId: owner.id,
          organizationId: organization.id,
          role: "OWNER",
          isPrimary: true,
        },
      });
      const branch = await prisma.branch.create({
        data: {
          organizationId: organization.id,
          name: "Local linking",
          address: "Local only",
        },
      });
      const shift = await prisma.posShift.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          cashierId: owner.id,
          openingCash: 0,
        },
      });
      const customer = await prisma.posCreditCustomer.create({
        data: {
          organizationId: organization.id,
          targetType: "CUSTOMER",
          borrowerId: "legacy-id",
          borrowerName: "Legacy typo",
          borrowerPhone: "99000000",
          normalizedBorrowerKey: "CUSTOMER:legacy-id:",
        },
      });
      const loans: Prisma.PosCreditSaleGetPayload<Prisma.PosCreditSaleDefaultArgs>[] =
        [];
      for (let index = 0; index < 2; index++) {
        const sale = await prisma.posSale.create({
          data: {
            organizationId: organization.id,
            branchId: branch.id,
            shiftId: shift.id,
            cashierId: owner.id,
            receiptNo: `LOCAL-LINK-${key}-${index}`,
            paymentMethod: "CREDIT",
            subtotal: 100000,
            taxTotal: 0,
            discountTotal: 0,
            grandTotal: 100000,
          },
        });
        loans.push(
          await prisma.posCreditSale.create({
            data: {
              saleId: sale.id,
              customerId: customer.id,
              organizationId: organization.id,
              branchId: branch.id,
              shiftId: shift.id,
              cashierId: owner.id,
              targetType: "CUSTOMER",
              borrowerId: "legacy-id",
              borrowerName: "Legacy typo",
              borrowerPhone: "99000000",
              principalAmount: 100000,
              totalInterest: 1200,
              totalDue: 101200,
              paidAmount: index === 0 ? 30000 : null,
              dueDate: new Date("2026-12-31"),
              createdAt: new Date("2026-01-01"),
              updatedAt: new Date("2026-02-01"),
            },
          }),
        );
      }
      const originalCustomer = await prisma.posCreditCustomer.findUniqueOrThrow(
        { where: { id: customer.id } },
      );
      const expectedCredits = loans.map((row) => ({
        id: row.id,
        customerId: row.customerId,
        borrowerId: row.borrowerId,
        borrowerPhone: row.borrowerPhone,
        borrowerUserId: row.borrowerUserId,
      }));
      const payload = {
        organizationId: organization.id,
        creditSaleIds: loans.map((row) => row.id),
        borrowerUserId: borrower.id,
        borrowerPhone: phone,
        expectedCredits,
      };
      const post = () =>
        fetch(`http://127.0.0.1:${address.port}/link`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt.sign({ userId: owner.id, organizationId: organization.id }, JWT_SECRET)}`,
          },
          body: JSON.stringify(payload),
        });
      await t.test(
        "STAFF cannot correct another person's legacy debt",
        async () => {
          await prisma.organizationMember.update({
            where: { id: membership.id },
            data: { role: "STAFF", capabilities: ["POS_CASHIER"] },
          });
          assert.equal((await post()).status, 403);
          await prisma.organizationMember.update({
            where: { id: membership.id },
            data: { role: "OWNER" },
          });
        },
      );
      await t.test(
        "stale identity is rejected before any financial or identity changes",
        async () => {
          await prisma.posCreditSale.update({
            where: { id: loans[0]!.id },
            data: { borrowerPhone: "99223344", updatedAt: loans[0]!.updatedAt },
          });
          assert.equal((await post()).status, 409);
          await prisma.posCreditSale.update({
            where: { id: loans[0]!.id },
            data: { borrowerPhone: "99000000", updatedAt: loans[0]!.updatedAt },
          });
        },
      );
      await t.test(
        "same correction retried concurrently links once and preserves every nonidentity debt field",
        async () => {
          const responses = await Promise.all([post(), post()]);
          for (const response of responses)
            assert.equal(response.status, 200, await response.clone().text());
          const after = await prisma.posCreditSale.findMany({
            where: { id: { in: loans.map((row) => row.id) } },
          });
          const identityFields = [
            "customerId",
            "borrowerUserId",
            "borrowerId",
            "borrowerName",
            "borrowerPhone",
            "borrowerEmail",
            "employeeId",
            "employeeName",
          ];
          const finances = (row: object) =>
            JSON.stringify(
              Object.fromEntries(
                Object.entries(row).filter(
                  ([field]) => !identityFields.includes(field),
                ),
              ),
            );
          for (const before of loans) {
            const linked = after.find((row) => row.id === before.id)!;
            assert.equal(finances(linked), finances(before));
            assert.equal(linked.borrowerUserId, borrower.id);
            assert.equal(linked.borrowerName, "Canonical borrower");
            assert.equal(linked.borrowerPhone, phone);
          }
          assert.deepEqual(
            await prisma.posCreditCustomer.findUniqueOrThrow({
              where: { id: customer.id },
            }),
            { ...originalCustomer, mergedIntoId: after[0]!.customerId },
          );
          const audit = await prisma.auditLog.findMany({
            where: {
              meta: { path: ["organizationId"], equals: organization.id },
            },
          });
          assert.equal(audit.length, 1);
          assert.equal(
            (audit[0]!.meta as { customerAliases: unknown[] }).customerAliases
              .length,
            1,
          );
          assert.equal(
            (audit[0]!.meta as { event: string }).event,
            "CREDIT_BORROWER_LINKED",
          );
        },
      );
      await t.test(
        "formatted duplicate local phone profiles are ambiguous and never chosen automatically",
        async () => {
          const duplicate = await prisma.user.create({
            data: {
              email: `${key}@duplicate.local.invalid`,
              profile: {
                create: {
                  fullName: "Duplicate fixture",
                  phoneNumber: `+976 ${phone.slice(0, 4)}-${phone.slice(4)}`,
                },
              },
            },
          });
          await assert.rejects(
            findRegisteredCreditBorrower(prisma, phone),
            (error) =>
              error instanceof CreditBorrowerError && error.status === 409,
          );
          await prisma.profile.delete({ where: { userId: duplicate.id } });
          await prisma.user.delete({ where: { id: duplicate.id } });
        },
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await prisma.$disconnect();
    }
  },
);
