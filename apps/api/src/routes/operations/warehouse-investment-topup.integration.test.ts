import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@mgl/database";
import {
  createInvestmentTopUp,
  listInvestmentTopUps,
  settleInvestmentTopUp,
} from "../../services/warehouse-investment-topup.service";
import { WarehouseViewerError } from "../../services/warehouse-viewer.policy";
import { CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY } from "../../services/upgrade-minu.service";
import { connectWarehousePaymentAccount } from "../../services/warehouse-payment-account.service";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.WAREHOUSE_VIEWER_INTEGRATION === "1" &&
  ["127.0.0.1", "localhost"].includes(database.hostname) &&
  database.pathname.startsWith("/wms_test_");
const forbidden = (error: unknown) =>
  error instanceof WarehouseViewerError && error.status === 403;

test(
  "investor deposits enforce ownership, verified payment, and exactly-once principal credits",
  { skip: !enabled },
  async (t) => {
    const marker = randomUUID();
    const users: string[] = [];
    let warehouseId = "";
    const previous = await prisma.siteSetting.findUnique({
      where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
    });
    try {
      for (const name of ["Operator", "Investor", "Outsider"]) {
        users.push(
          (
            await prisma.user.create({
              data: {
                email: `${name}-${marker}@topup.test`,
                profile: { create: { fullName: name } },
              },
            })
          ).id,
        );
      }
      const [operatorId, investorId, outsiderId] = users;
      const operator = { userId: operatorId, role: "USER" },
        investor = { userId: investorId, role: "USER" },
        outsider = { userId: outsiderId, role: "USER" };
      warehouseId = (
        await prisma.warehouse.create({
          data: {
            name: `Deposit test ${marker}`,
            address: "test",
            paymentAccountId: marker,
          },
        })
      ).id;
      await prisma.warehouseSetupToken.create({
        data: {
          token: marker,
          userId: operatorId,
          warehouseId,
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      await prisma.warehouseViewer.create({
        data: { warehouseId, userId: investorId, grantedById: operatorId },
      });
      const settings = JSON.stringify([
        {
          id: marker,
          merchantCode: "test-merchant",
          username: "test-user",
          password: "test-password",
          accountNumber: "1234567890",
          bankCode: "050000",
          merchantName: "Test receiver",
        },
      ]);
      await prisma.siteSetting.upsert({
        where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
        create: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY, value: settings },
        update: { value: settings },
      });
      const principal = async () =>
        (
          await prisma.warehouseInvestment.findUnique({
            where: { warehouseId_userId: { warehouseId, userId: investorId } },
          })
        )?.amount.toFixed(2) || "0.00";
      const request = {
        requestId: randomUUID(),
        method: "BANK_TRANSFER",
        amount: "100.25",
      };
      let bankId = "";
      await t.test(
        "outsiders and operators cannot deposit into someone else's investment",
        async () => {
          await assert.rejects(
            createInvestmentTopUp(outsider, warehouseId, request),
            forbidden,
          );
          await assert.rejects(
            createInvestmentTopUp(operator, warehouseId, request),
            forbidden,
          );
        },
      );
      await t.test(
        "bank requests survive retries, remain uncredited, and require the scoped operator",
        async () => {
          const bank = await createInvestmentTopUp(
            investor,
            warehouseId,
            request,
          );
          bankId = bank.id;
          assert.equal(bank.status, "PENDING");
          assert.equal(bank.accountNumber, "1234567890");
          assert.equal(
            (await createInvestmentTopUp(investor, warehouseId, request)).id,
            bankId,
          );
          await assert.rejects(
            createInvestmentTopUp(investor, warehouseId, {
              ...request,
              amount: "200",
            }),
          );
          assert.equal(
            (await settleInvestmentTopUp(investor, warehouseId, bankId, false))
              .status,
            "PENDING",
          );
          await assert.rejects(
            settleInvestmentTopUp(investor, warehouseId, bankId, true),
            forbidden,
          );
          await assert.rejects(
            settleInvestmentTopUp(outsider, warehouseId, bankId, true),
            forbidden,
          );
          assert.equal(await principal(), "0.00");
        },
      );
      await t.test(
        "concurrent confirmations and replay credit exactly once",
        async () => {
          const results = await Promise.all(
            Array.from({ length: 8 }, () =>
              settleInvestmentTopUp(operator, warehouseId, bankId, true),
            ),
          );
          assert.ok(results.every((item) => item.status === "PAID"));
          assert.equal(await principal(), "100.25");
          assert.equal(
            await prisma.auditLog.count({
              where: {
                userId: operatorId,
                action: "WAREHOUSE_INVESTMENT_UPDATED",
              },
            }),
            1,
          );
        },
      );
      let qrId = "";
      await t.test(
        "QR binds the exact amount and reference to the configured recipient",
        async () => {
          const qr = await createInvestmentTopUp(
            investor,
            warehouseId,
            {
              ...request,
              requestId: randomUUID(),
              method: "QR",
              amount: "200.50",
            },
            async (params, username, password) => {
              assert.equal(params.amount, 200.5);
              assert.equal(params.merchantCode, "test-merchant");
              assert.ok(params.referenceNumber.startsWith("INV-"));
              assert.equal(username, "test-user");
              assert.equal(password, "test-password");
              return { invoiceId: marker, qrText: "TEST-QR", urls: [] };
            },
          );
          qrId = qr.id;
          assert.equal(qr.qrText, "TEST-QR");
          await assert.rejects(
            settleInvestmentTopUp(operator, warehouseId, qrId, true),
          );
          await assert.rejects(
            settleInvestmentTopUp(outsider, warehouseId, qrId, false),
            forbidden,
          );
        },
      );
      await t.test(
        "unpaid and provider failures never change principal",
        async () => {
          assert.equal(
            (
              await settleInvestmentTopUp(
                investor,
                warehouseId,
                qrId,
                false,
                async () => ({ paid: false }),
              )
            ).status,
            "PENDING",
          );
          await assert.rejects(
            settleInvestmentTopUp(
              investor,
              warehouseId,
              qrId,
              false,
              async () => {
                throw new Error("offline");
              },
            ),
          );
          assert.equal(await principal(), "100.25");
        },
      );
      await t.test(
        "original invoice and merchant are used even after warehouse account changes",
        async () => {
          await prisma.warehouse.update({
            where: { id: warehouseId },
            data: { paymentAccountId: null },
          });
          const verified = async (params: {
            merchantCode: string;
            invoiceNumber: string;
          }) => {
            assert.equal(params.invoiceNumber, marker);
            assert.equal(params.merchantCode, "test-merchant");
            return { paid: true };
          };
          await Promise.all(
            Array.from({ length: 5 }, () =>
              settleInvestmentTopUp(
                investor,
                warehouseId,
                qrId,
                false,
                verified,
              ),
            ),
          );
          assert.equal(await principal(), "300.75");
          assert.equal(
            (await listInvestmentTopUps(investor, warehouseId)).length,
            2,
          );
          assert.equal(
            (await listInvestmentTopUps(operator, warehouseId)).length,
            0,
          );
          await assert.rejects(
            listInvestmentTopUps(outsider, warehouseId),
            forbidden,
          );
        },
      );
      await t.test(
        "account linking requires operator access and stores provider credentials only on the server",
        async () => {
          await assert.rejects(
            connectWarehousePaymentAccount(investor, warehouseId, {}),
            forbidden,
          );
          await assert.rejects(
            connectWarehousePaymentAccount(outsider, warehouseId, {}),
            forbidden,
          );
          await assert.rejects(
            connectWarehousePaymentAccount(operator, warehouseId, {
              merchantCode: "someone-else",
            }),
          );
          await assert.rejects(
            connectWarehousePaymentAccount(operator, warehouseId, {}),
          );
          const result = await connectWarehousePaymentAccount(
            operator,
            warehouseId,
            {
              merchantName: "Test business",
              accountNumber: "1234567890",
              bankCode: "050000",
              cityId: "20",
              districtId: "1",
              khorooId: "1",
              building: "Test",
              doorNo: "1",
              phone: "99112233",
              firstName: "Test",
              lastName: "Owner",
              registerNumber: "АА99112233",
              subCategoryId: "36",
              corporateFlag: "0",
              gender: "M",
              bank_accounts: [
                {
                  account_bank_code: "050000",
                  account_number: "1234567890",
                  account_name: "Test owner",
                  is_default: true,
                },
              ],
            },
            async () => ({
              merchantCode: "new-merchant",
              username: "new-user",
              password: "private-password",
              raw: {},
            }),
          );
          assert.deepEqual(Object.keys(result), ["paymentAccountId"]);
          assert.equal(
            (
              await prisma.warehouse.findUniqueOrThrow({
                where: { id: warehouseId },
              })
            ).paymentAccountId,
            result.paymentAccountId,
          );
          const setting = await prisma.siteSetting.findUniqueOrThrow({
            where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
          });
          assert.ok(setting.value.includes("private-password"));
        },
      );
    } finally {
      if (warehouseId) {
        await prisma.warehouseInvestmentTopUp.deleteMany({
          where: { warehouseId },
        });
        await prisma.warehouseInvestment.deleteMany({ where: { warehouseId } });
        await prisma.warehouseViewer.deleteMany({ where: { warehouseId } });
        await prisma.warehouseSetupToken.deleteMany({ where: { warehouseId } });
        await prisma.warehouse.delete({ where: { id: warehouseId } });
      }
      await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
      await prisma.profile.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      if (previous)
        await prisma.siteSetting.update({
          where: { key: previous.key },
          data: { value: previous.value },
        });
      else
        await prisma.siteSetting.deleteMany({
          where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
        });
      await prisma.$disconnect();
    }
  },
);
