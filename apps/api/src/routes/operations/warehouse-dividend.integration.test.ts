import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import viewerRoutes from "./warehouse-viewer.routes";
import { readInvestorBankAccount } from "../../services/warehouse-investor-bank-account.service";
import type { WarehouseViewerMember } from "@mgl/types";
import { prisma } from "@mgl/database";
import { currentWarehouseMonth } from "@mgl/types";
import {
  recordMonthlyDividend,
  readMonthlyDividend,
} from "../../services/warehouse-dividend.service";
import { readWarehouseInvestmentSummary } from "../../services/warehouse-investment.service";
import { createDividendDecisionService } from "../../services/warehouse-dividend-decision.service";
import type { VerifyMnStatusResponse } from "../../services/verify-mn.service";
import { WarehouseViewerError } from "../../services/warehouse-viewer.policy";

const url = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.WAREHOUSE_VIEWER_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(url.hostname) &&
  url.pathname.startsWith("/wms_test_");
const rejectsStatus = (status: number) => (error: unknown) =>
  error instanceof WarehouseViewerError && error.status === status;

test(
  "monthly dividends and verified distribution choices",
  { skip: !enabled },
  async (t) => {
    const marker = randomUUID();
    const users: string[] = [],
      warehouses: string[] = [];
    const month = currentWarehouseMonth();
    const statuses = new Map<string, VerifyMnStatusResponse>();
    let latestSession = "";
    let providerFailure = false;
    const service = createDividendDecisionService({
      createSession: async (phone) => {
        const sessionId = randomUUID(),
          expiresAt = new Date(Date.now() + 300000).toISOString();
        latestSession = sessionId;
        statuses.set(sessionId, {
          sessionId,
          phone,
          sessionStatus: "PENDING",
          expiresAt,
        });
        return {
          sessionId,
          phone,
          text: "123456",
          shortcode: "144773",
          smsUri: "sms:144773?body=123456",
          displayInstruction: "Test verification",
          expiresAt,
        };
      },
      getStatus: async (id) => {
        if (providerFailure) throw new Error("Provider unavailable");
        const status = statuses.get(id);
        assert.ok(status);
        return status;
      },
    });
    try {
      for (const label of ["Operator", "Investor", "Bank investor"]) {
        const user = await prisma.user.create({
          data: {
            email: `${label.replaceAll(" ", "-")}-${marker}@dividend.test`,
            profile: {
              create: {
                fullName: label,
                phoneNumber:
                  label === "Investor"
                    ? "99224455"
                    : label === "Bank investor"
                      ? "99224456"
                      : null,
              },
            },
          },
        });
        users.push(user.id);
      }
      for (const name of ["Own", "Other"])
        warehouses.push(
          (
            await prisma.warehouse.create({
              data: {
                name: `${name}-${marker}`,
                address: "test",
                type: "CENTRAL",
              },
            })
          ).id,
        );
      const [operatorId, investorId, bankInvestorId] = users,
        [warehouseId, otherWarehouse] = warehouses;
      const operator = { userId: operatorId, role: "USER" },
        investor = { userId: investorId, role: "USER" },
        bankInvestor = { userId: bankInvestorId, role: "USER" };
      await prisma.warehouseSetupToken.create({
        data: {
          token: marker,
          userId: operatorId,
          warehouseId,
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      for (const userId of [investorId, bankInvestorId])
        await prisma.warehouseViewer.create({
          data: { warehouseId, userId, grantedById: operatorId },
        });
      await prisma.warehouseInvestment.create({
        data: {
          warehouseId,
          userId: investorId,
          amount: "10000000.00",
          updatedById: operatorId,
        },
      });

      await t.test(
        "only scoped operator records dividend; zero is distinct from missing",
        async () => {
          await assert.rejects(
            recordMonthlyDividend(investor, warehouseId, investorId, {
              month,
              amount: "100",
              version: 0,
            }),
            rejectsStatus(403),
          );
          await assert.rejects(
            recordMonthlyDividend(operator, otherWarehouse, investorId, {
              month,
              amount: "100",
              version: 0,
            }),
            rejectsStatus(403),
          );
          const missing = await readMonthlyDividend(
            prisma,
            warehouseId,
            investorId,
            false,
          );
          assert.equal(missing.updatedAt, null);
          const zero = await recordMonthlyDividend(
            operator,
            warehouseId,
            investorId,
            { month, amount: "0.00", version: 0 },
          );
          assert.equal(zero.version, 1);
          assert.ok(
            (await readMonthlyDividend(prisma, warehouseId, investorId, false))
              .updatedAt,
          );
          await assert.rejects(
            service.start(investor, warehouseId, zero.id, {
              choice: "REINVEST",
              version: 1,
            }),
            rejectsStatus(404),
          );
          await recordMonthlyDividend(operator, warehouseId, investorId, {
            month,
            amount: "100000.50",
            version: 1,
          });
          await recordMonthlyDividend(operator, warehouseId, bankInvestorId, {
            month,
            amount: "200000.25",
            version: 0,
          });
          await prisma.warehouseInvestorDividend.create({
            data: {
              warehouseId,
              userId: investorId,
              month: month.endsWith("01")
                ? `${Number(month.slice(0, 4)) - 1}-12`
                : `${month.slice(0, 5)}${String(Number(month.slice(5)) - 1).padStart(2, "0")}`,
              amount: "999999",
              updatedById: operatorId,
            },
          });
          assert.equal(
            (await readMonthlyDividend(prisma, warehouseId, investorId, false))
              .amount,
            "100000.50",
          );
          assert.equal(
            (
              await readMonthlyDividend(
                prisma,
                warehouseId,
                bankInvestorId,
                false,
              )
            ).amount,
            "200000.25",
          );
          assert.equal(
            (await readMonthlyDividend(prisma, warehouseId, operatorId, true))
              .amount,
            "300000.75",
          );
        },
      );
      const dividend = await prisma.warehouseInvestorDividend.findUniqueOrThrow(
        {
          where: {
            warehouseId_userId_month: {
              warehouseId,
              userId: investorId,
              month,
            },
          },
        },
      );
      let challenge = await service.start(investor, warehouseId, dividend.id, {
        choice: "REINVEST",
        version: dividend.version,
      });
      await t.test(
        "pending, unavailable, wrong-phone, expired and foreign sessions never credit principal",
        async () => {
          assert.deepEqual(
            await service.confirm(investor, warehouseId, challenge.id),
            { status: "PENDING" },
          );
          await assert.rejects(
            service.confirm(bankInvestor, warehouseId, challenge.id),
            rejectsStatus(404),
          );
          await assert.rejects(
            service.confirm(investor, otherWarehouse, challenge.id),
            rejectsStatus(403),
          );
          providerFailure = true;
          await assert.rejects(
            service.confirm(investor, warehouseId, challenge.id),
            rejectsStatus(503),
          );
          providerFailure = false;
          const status = statuses.get(latestSession)!;
          assert.equal(await readInvestorBankAccount(bankInvestorId), null);
          statuses.set(latestSession, {
            ...status,
            phone: "99999999",
            sessionStatus: "VERIFIED",
            verifiedAt: new Date().toISOString(),
          });
          await assert.rejects(
            service.confirm(investor, warehouseId, challenge.id),
            rejectsStatus(403),
          );
          statuses.set(latestSession, {
            ...status,
            sessionStatus: "VERIFIED",
            verifiedAt: new Date().toISOString(),
          });
          await prisma.warehouseDividendDecision.update({
            where: { id: challenge.id },
            data: { expiresAt: new Date(Date.now() - 1) },
          });
          await assert.rejects(
            service.confirm(investor, warehouseId, challenge.id),
            rejectsStatus(410),
          );
          await prisma.warehouseDividendDecision.update({
            where: { id: challenge.id },
            data: { expiresAt: new Date(Date.now() + 300000) },
          });
          await prisma.warehouseViewer.delete({
            where: { warehouseId_userId: { warehouseId, userId: investorId } },
          });
          await assert.rejects(
            service.confirm(investor, warehouseId, challenge.id),
            rejectsStatus(403),
          );
          await prisma.warehouseViewer.create({
            data: { warehouseId, userId: investorId, grantedById: operatorId },
          });
          await prisma.profile.update({
            where: { userId: investorId },
            data: { phoneNumber: "99224457" },
          });
          await assert.rejects(
            service.confirm(investor, warehouseId, challenge.id),
            rejectsStatus(409),
          );
          await prisma.profile.update({
            where: { userId: investorId },
            data: { phoneNumber: "99224455" },
          });
          assert.equal(
            (
              await readWarehouseInvestmentSummary(
                prisma,
                warehouseId,
                investorId,
                false,
              )
            ).amount,
            "10000000.00",
          );
        },
      );
      await t.test(
        "changed monthly amount invalidates old consent and requires a new session",
        async () => {
          await recordMonthlyDividend(operator, warehouseId, investorId, {
            month,
            amount: "120000.50",
            version: dividend.version,
          });
          await assert.rejects(
            service.confirm(investor, warehouseId, challenge.id),
            rejectsStatus(409),
          );
          await prisma.warehouseDividendDecision.update({
            where: { id: challenge.id },
            data: { updatedAt: new Date(Date.now() - 31000) },
          });
          const oldId = challenge.id;
          challenge = await service.start(investor, warehouseId, dividend.id, {
            choice: "REINVEST",
            version: dividend.version + 1,
          });
          assert.notEqual(challenge.id, oldId);
          await assert.rejects(
            service.confirm(investor, warehouseId, oldId),
            rejectsStatus(404),
          );
        },
      );
      await t.test(
        "verified concurrent retries credit exact dividend once and lock the amount",
        async () => {
          const status = statuses.get(latestSession)!;
          statuses.set(latestSession, {
            ...status,
            phone: undefined,
            sessionStatus: "VERIFIED",
            verifiedAt: new Date().toISOString(),
          });
          const results = await Promise.all([
            service.confirm(investor, warehouseId, challenge.id),
            service.confirm(investor, warehouseId, challenge.id),
          ]);
          assert.ok(results.every((result) => result?.status === "CONFIRMED"));
          assert.equal(
            (
              await readWarehouseInvestmentSummary(
                prisma,
                warehouseId,
                investorId,
                false,
              )
            ).amount,
            "10120000.50",
          );
          assert.equal(
            (await readMonthlyDividend(prisma, warehouseId, investorId, false))
              .decision?.choice,
            "REINVEST",
          );
          await assert.rejects(
            recordMonthlyDividend(operator, warehouseId, investorId, {
              month,
              amount: "1",
              version: dividend.version + 1,
            }),
            rejectsStatus(409),
          );
          assert.equal(
            await prisma.auditLog.count({
              where: {
                userId: investorId,
                action: "WAREHOUSE_DIVIDEND_CONFIRMED",
              },
            }),
            1,
          );
        },
      );
      await t.test(
        "bank choice records verified bank instructions without crediting principal",
        async () => {
          const bankDividend =
            await prisma.warehouseInvestorDividend.findUniqueOrThrow({
              where: {
                warehouseId_userId_month: {
                  warehouseId,
                  userId: bankInvestorId,
                  month,
                },
              },
            });
          const bankChallenge = await service.start(
            bankInvestor,
            warehouseId,
            bankDividend.id,
            {
              choice: "BANK_TRANSFER",
              version: bankDividend.version,
              bankName: "Test bank",
              bankAccount: "1234567890",
              bankAccountName: "Bank investor",
            },
          );
          const status = statuses.get(latestSession)!;
          statuses.set(latestSession, {
            ...status,
            sessionStatus: "VERIFIED",
            verifiedAt: new Date().toISOString(),
          });
          const result = await service.confirm(
            bankInvestor,
            warehouseId,
            bankChallenge.id,
          );
          assert.equal(result?.status, "CONFIRMED");
          const account = await readInvestorBankAccount(bankInvestorId);
          assert.equal(account?.bankName, "Test bank");
          assert.equal(account?.bankAccount, "1234567890");
          assert.equal(account?.bankAccountName, "Bank investor");
          assert.equal(await readInvestorBankAccount(investorId), null);
          assert.equal(
            (
              await readMonthlyDividend(
                prisma,
                warehouseId,
                bankInvestorId,
                false,
              )
            ).decision?.bankAccount,
            "1234567890",
          );
          assert.equal(
            (
              await readWarehouseInvestmentSummary(
                prisma,
                warehouseId,
                bankInvestorId,
                false,
              )
            ).amount,
            "0.00",
          );
          assert.equal(
            (await readMonthlyDividend(prisma, warehouseId, investorId, false))
              .decision?.bankAccount,
            null,
          );
        },
      );
      await t.test(
        "saved bank details are visible only to their owner and scoped warehouse operators",
        async () => {
          const app = express();
          app.use(viewerRoutes);
          const server = app.listen(0, "127.0.0.1");
          await once(server, "listening");
          const address = server.address();
          assert.ok(address && typeof address !== "string");
          const get = (path: string, userId?: string) =>
            fetch(`http://127.0.0.1:${address.port}${path}`, {
              headers: userId
                ? {
                    Authorization: `Bearer ${jwt.sign({ userId, role: "USER", email: "test@bank.test" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
                  }
                : {},
            });
          try {
            assert.equal(
              (await get("/warehouse-viewer/bank-account")).status,
              401,
            );
            const own = await get(
              "/warehouse-viewer/bank-account",
              bankInvestorId,
            );
            assert.equal(own.status, 200);
            assert.equal(
              ((await own.json()) as { bankAccount: string }).bankAccount,
              "1234567890",
            );
            const someoneElse = await get(
              `/warehouse-viewer/bank-account?userId=${bankInvestorId}`,
              investorId,
            );
            assert.equal(await someoneElse.json(), null);
            const members = await get(
              `/warehouses/${warehouseId}/viewers`,
              operatorId,
            );
            assert.equal(members.status, 200);
            const data = (await members.json()) as WarehouseViewerMember[];
            assert.equal(
              data.find((member) => member.userId === bankInvestorId)
                ?.bankAccount?.bankAccount,
              "1234567890",
            );
            assert.equal(
              data.find((member) => member.userId === investorId)?.bankAccount,
              null,
            );
            assert.equal(
              (await get(`/warehouses/${warehouseId}/viewers`, bankInvestorId))
                .status,
              403,
            );
            assert.equal(
              (await get(`/warehouses/${otherWarehouse}/viewers`, operatorId))
                .status,
              403,
            );
          } finally {
            await new Promise<void>((resolve, reject) =>
              server.close((error) => (error ? reject(error) : resolve())),
            );
          }
        },
      );
    } finally {
      await prisma.warehouseDividendDecision.deleteMany({
        where: { dividend: { warehouseId: { in: warehouses } } },
      });
      await prisma.warehouseInvestorDividend.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouseInvestment.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouseViewer.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouseSetupToken.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouse.deleteMany({ where: { id: { in: warehouses } } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  },
);
