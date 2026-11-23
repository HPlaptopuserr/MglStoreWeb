import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import creditCustomersRoutes from "./credit-customers.routes";
import borrowerCreditAccountRoutes from "./borrower-credit-account.routes";
import type { RegisteredCreditBorrower } from "@mgl/types";
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
    app.use(creditCustomersRoutes);
    app.use(borrowerCreditAccountRoutes);
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
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt.sign({ userId: owner.id, organizationId: organization.id }, JWT_SECRET)}`,
      };
      const lookup = await fetch(
        `http://127.0.0.1:${address.port}/pos/credit-customers/registered-user?organizationId=${organization.id}&phone=${encodeURIComponent(`+976 ${phone}`)}`,
        { headers },
      );
      const selected: { user: RegisteredCreditBorrower | null } =
        await lookup.json();
      await t.test(
        "already issued unlinked debts select an exact registered user by phone over HTTP",
        async () => {
          assert.equal(lookup.status, 200);
          assert.ok(loans.every((row) => row.borrowerUserId === null));
          assert.equal(selected.user?.id, borrower.id);
          assert.equal(selected.user?.phoneNumber, phone);
          assert.equal(selected.user?.fullName, "Canonical borrower");
        },
      );
      assert.ok(selected.user);
      const payload = {
        organizationId: organization.id,
        creditSaleIds: loans.map((row) => row.id),
        borrowerUserId: selected.user.id,
        borrowerPhone: selected.user.phoneNumber,
        expectedCredits,
      };
      const post = () =>
        fetch(
          `http://127.0.0.1:${address.port}/pos/credit-customers/link-existing`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt.sign({ userId: owner.id, organizationId: organization.id }, JWT_SECRET)}`,
            },
            body: JSON.stringify(payload),
          },
        );
      await t.test(
        "foreign organization cannot look up or link the reviewed debts",
        async () => {
          const foreign = await prisma.organization.create({
            data: {
              name: "Foreign local test",
              slug: `foreign-${key}`,
              taxId: `foreign-${key}`,
              status: "ACTIVE",
            },
          });
          const foreignLookup = await fetch(
            `http://127.0.0.1:${address.port}/pos/credit-customers/registered-user?organizationId=${foreign.id}&phone=${phone}`,
            { headers },
          );
          assert.equal(foreignLookup.status, 403);
          const foreignLink = await fetch(
            `http://127.0.0.1:${address.port}/pos/credit-customers/link-existing`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ ...payload, organizationId: foreign.id }),
            },
          );
          assert.equal(foreignLink.status, 403);
          assert.equal(
            await prisma.posCreditSale.count({
              where: {
                id: { in: loans.map((row) => row.id) },
                borrowerUserId: { not: null },
              },
            }),
            0,
          );
        },
      );
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
        "the selected MGL account sees linked debts and another account cannot read them",
        async () => {
          const borrowerHeaders = {
            Authorization: `Bearer ${jwt.sign({ userId: borrower.id }, JWT_SECRET)}`,
          };
          const response = await fetch(
            `http://127.0.0.1:${address.port}/credit-account?userId=${owner.id}`,
            { headers: borrowerHeaders },
          );
          assert.equal(response.status, 200);
          const account: {
            credits: Array<{ id: string; remainingDue: number }>;
            totalRemaining: number;
          } = await response.json();
          assert.deepEqual(
            account.credits.map((row) => row.id).sort(),
            loans.map((row) => row.id).sort(),
          );
          assert.equal(account.totalRemaining, 170000);
          const unrelated = await fetch(
            `http://127.0.0.1:${address.port}/credit-account?userId=${borrower.id}`,
            { headers },
          );
          assert.equal(unrelated.status, 200);
          const other: { credits: unknown[]; totalRemaining: number } =
            await unrelated.json();
          assert.deepEqual(other.credits, []);
          assert.equal(other.totalRemaining, 0);
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
