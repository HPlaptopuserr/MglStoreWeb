import { randomUUID } from "node:crypto";
import { prisma } from "@mgl/database";
import type { WarehouseActor } from "./warehouse-access.service";
import { assertWarehouseViewerManagement } from "./warehouse-viewer-access.service";
import { WarehouseViewerError } from "./warehouse-viewer.policy";
import { parseMinuRegistration } from "./minu-registration";
import { registerSystemQrSubMerchant } from "./systemqr";
import { CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY } from "./upgrade-minu.service";

export function paymentAccountRecords(
  value: string | null | undefined,
): Record<string, unknown>[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object" && !Array.isArray(item)),
        )
      : [];
  } catch {
    return [];
  }
}

export async function connectWarehousePaymentAccount(
  actor: WarehouseActor & { userId: string },
  warehouseId: string,
  body: unknown,
  registerMerchant = registerSystemQrSubMerchant,
) {
  await assertWarehouseViewerManagement(actor, warehouseId);
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (record.merchantCode)
    throw new WarehouseViewerError("Бүртгэлтэй дансыг жагсаалтаас сонгоно уу.");
  const input = parseMinuRegistration(
    body,
    record.corporateFlag === "1" ? "company" : "person",
  );
  if (!input)
    throw new WarehouseViewerError(
      "Данс эзэмшигч, банк болон хаягийн мэдээллээ бүрэн зөв оруулна уу.",
    );
  const result = await registerMerchant(input);
  const username = result.password
    ? result.username
    : process.env.SYSTEMQR_USERNAME?.trim();
  const password = result.password || process.env.SYSTEMQR_PASSWORD?.trim();
  if (!username || !password)
    throw new WarehouseViewerError("Minu нэвтрэх тохиргоо дутуу байна.", 503);
  const id = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY}, 0))`;
    const setting = await tx.siteSetting.findUnique({
      where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
    });
    const accounts = paymentAccountRecords(setting?.value);
    accounts.push({
      ...input,
      id,
      label: input.merchantName,
      merchantCode: result.merchantCode,
      username,
      password,
      createdAt: new Date().toISOString(),
    });
    await tx.siteSetting.upsert({
      where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
      create: {
        key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY,
        value: JSON.stringify(accounts),
      },
      update: { value: JSON.stringify(accounts) },
    });
    await tx.warehouse.update({
      where: { id: warehouseId },
      data: { paymentAccountId: id },
    });
    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "MERCHANT_CONFIGURATION_CHANGED",
        meta: { warehouseId, accountId: id, merchantCode: result.merchantCode },
      },
    });
  });
  return { paymentAccountId: id };
}
