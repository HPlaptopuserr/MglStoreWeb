import { Router, type Router as ExpressRouter } from "express";
import { prisma, type Prisma } from "@mgl/database";
import { canAccessPosOrganization, requirePosUser } from "./_shared";
import {
  VAT_RECOVERY_ORGANIZATION_ID,
  VAT_RECOVERY_REGISTER_ID,
  VAT_RECOVERY_RECEIPTS,
} from "./ebarimt-vat-recovery.manifest";

const router: ExpressRouter = Router();
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const select = {
  id: true,
  receiptNo: true,
  organizationId: true,
  registerId: true,
  status: true,
  grandTotal: true,
  ebarimtStatus: true,
  ebarimtError: true,
  ebarimtPayload: true,
} as const;
function metadata(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return object(value) ? (value as Prisma.JsonObject) : {};
}
function recoveryState(value: Prisma.JsonValue | null) {
  const root = metadata(value);
  return object(root.vatRecovery) ? root.vatRecovery : {};
}
function rejectedSource(
  receiptNo: string,
  error: string | null,
  amount: number,
) {
  if (!error) throw new Error("Алдааны эх баримт олдсонгүй");
  const source: unknown = JSON.parse(error);
  if (
    !object(source) ||
    source.status !== "ERROR" ||
    source.id !== VAT_RECOVERY_RECEIPTS[receiptNo] ||
    source.merchantTin !== "75200179693" ||
    source.posNo !== "10052245" ||
    source.type !== "B2C_RECEIPT" ||
    source.totalAmount !== amount ||
    source.totalCityTax !== 0 ||
    typeof source.message !== "string" ||
    !source.message.includes("Шалгуур дүн")
  ) {
    throw new Error("Сэргээх баримтын эх мэдээлэл тохирохгүй байна");
  }
  return source;
}
class RecoveryConflict extends Error {}

// Read-only observations from the actual till; never expose fiscal payloads or reserve a receipt.
router.post("/pos/ebarimt-vat-recovery-diagnostics", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const body: unknown = req.body;
    if (
      !canAccessPosOrganization(actor, VAT_RECOVERY_ORGANIZATION_ID) ||
      !object(body) ||
      body.registerId !== VAT_RECOVERY_REGISTER_ID
    )
      return res
        .status(403)
        .json({ message: "Энэ кассын оношлогоонд хандах эрхгүй" });
    if (
      !["INFO_FAILED", "LIST_FAILED", "LIST_RECEIVED"].includes(
        String(body.phase),
      )
    )
      return res.status(400).json({ message: "Оношлогооны төрөл буруу байна" });
    const shortText = (value: unknown, max: number) =>
      typeof value === "string" ? value.slice(0, max) : "";
    const count = (value: unknown) =>
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 100000
        ? value
        : null;
    console.info(
      "VAT_RECOVERY_DIAGNOSTICS",
      JSON.stringify({
        registerId: VAT_RECOVERY_REGISTER_ID,
        phase: body.phase,
        version: shortText(body.version, 40),
        rawKind: shortText(body.rawKind, 20),
        keys: Array.isArray(body.keys)
          ? body.keys
              .filter(
                (key: unknown): key is string =>
                  typeof key === "string" &&
                  /^[a-zA-Z_][a-zA-Z_0-9]{0,63}$/.test(key),
              )
              .slice(0, 20)
          : [],
        recognized: body.recognized === true,
        invalidCount: count(body.invalidCount),
        matchingCount: count(body.matchingCount),
        error: shortText(body.error, 200),
      }),
    );
    return res.json({ recorded: true });
  } catch (error: unknown) {
    console.error("VAT recovery diagnostics failed", error);
    return res.status(500).json({ message: "Оношлогоог хүлээн авч чадсангүй" });
  }
});

router.get("/pos/ebarimt-vat-recovery", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    if (
      !canAccessPosOrganization(actor, VAT_RECOVERY_ORGANIZATION_ID) ||
      req.query.registerId !== VAT_RECOVERY_REGISTER_ID
    )
      return res
        .status(403)
        .json({ message: "Энэ кассын баримтыг сэргээх эрхгүй" });
    const sales = await prisma.posSale.findMany({
      where: {
        organizationId: VAT_RECOVERY_ORGANIZATION_ID,
        registerId: VAT_RECOVERY_REGISTER_ID,
        receiptNo: { in: Object.keys(VAT_RECOVERY_RECEIPTS) },
      },
      select,
      orderBy: { createdAt: "asc" },
    });
    return res.json({
      total: Object.keys(VAT_RECOVERY_RECEIPTS).length,
      receipts: sales.map((sale) => ({
        saleId: sale.id,
        receiptNo: sale.receiptNo,
        originalId: VAT_RECOVERY_RECEIPTS[sale.receiptNo],
        totalAmount: Number(sale.grandTotal),
        state:
          sale.ebarimtStatus === "SUCCESS"
            ? "COMPLETED"
            : recoveryState(sale.ebarimtPayload).state === "SUBMITTED"
              ? "SUBMITTED"
              : sale.status === "COMPLETED" && sale.ebarimtStatus === "FAILED"
                ? "READY"
                : "SKIPPED",
      })),
    });
  } catch (error: unknown) {
    console.error("VAT recovery list failed", error);
    return res
      .status(500)
      .json({ message: "Баримт сэргээх жагсаалтыг авч чадсангүй" });
  }
});

router.post("/pos/ebarimt-vat-recovery/:saleId", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    if (!canAccessPosOrganization(actor, VAT_RECOVERY_ORGANIZATION_ID))
      return res
        .status(403)
        .json({ message: "Энэ дэлгүүрийн баримтыг сэргээх эрхгүй" });
    const body: unknown = req.body;
    if (
      !object(body) ||
      !["START", "COMPLETE"].includes(String(body.action)) ||
      typeof body.requestId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.requestId)
    )
      return res
        .status(400)
        .json({ message: "Сэргээх хүсэлтийн мэдээлэл буруу" });
    const { requestId, action } = body;
    const saleId = String(req.params.saleId);
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PosSale" WHERE "id" = ${saleId} FOR UPDATE`;
      const sale = await tx.posSale.findUnique({
        where: { id: saleId },
        select,
      });
      if (
        !sale ||
        sale.organizationId !== VAT_RECOVERY_ORGANIZATION_ID ||
        sale.registerId !== VAT_RECOVERY_REGISTER_ID ||
        !VAT_RECOVERY_RECEIPTS[sale.receiptNo]
      )
        throw new RecoveryConflict("Энэ баримт сэргээх жагсаалтад байхгүй");
      const state = recoveryState(sale.ebarimtPayload);
      if (action === "START") {
        if (
          sale.status !== "COMPLETED" ||
          sale.ebarimtStatus !== "FAILED" ||
          state.state
        )
          throw new RecoveryConflict(
            "Баримт аль хэдийн илгээгдсэн эсвэл шалгах шаардлагатай байна",
          );
        const source = rejectedSource(
          sale.receiptNo,
          sale.ebarimtError,
          Number(sale.grandTotal),
        );
        // Reserve before the local financial request. No timeout/lease ever permits a blind retry.
        await tx.posSale.update({
          where: { id: sale.id },
          data: {
            ebarimtPayload: {
              ...metadata(sale.ebarimtPayload),
              vatRecovery: {
                state: "SUBMITTED",
                requestId,
                startedAt: new Date().toISOString(),
                actorId: actor.id,
                originalId: String(source.id),
                rejectedError: sale.ebarimtError,
              },
            },
          },
        });
        return { state: "SUBMITTED", source };
      }
      if (state.requestId !== requestId)
        throw new RecoveryConflict("Сэргээх хүсэлтийн дугаар тохирохгүй");
      if (sale.ebarimtStatus === "SUCCESS" && state.state === "COMPLETED")
        return { state: "COMPLETED" };
      if (
        state.state !== "SUBMITTED" ||
        sale.status !== "COMPLETED" ||
        sale.ebarimtStatus !== "FAILED"
      )
        throw new RecoveryConflict("Баримтын төлөв өөрчлөгдсөн байна");
      const response = body.response;
      if (
        !object(response) ||
        response.status !== "SUCCESS" ||
        typeof response.id !== "string" ||
        !/^\d{25,40}$/.test(response.id) ||
        response.id === VAT_RECOVERY_RECEIPTS[sale.receiptNo] ||
        response.merchantTin !== "75200179693" ||
        response.posNo !== "10052245" ||
        Number(response.totalAmount) !== Number(sale.grandTotal) ||
        Math.round(Number(response.totalVAT) * 100) !==
          Math.round((Number(sale.grandTotal) * 100) / 11) ||
        typeof response.date !== "string"
      )
        throw new RecoveryConflict(
          "PosAPI амжилттай хариу баталгаажаагүй байна",
        );
      const date = new Date(response.date.replace(" ", "T") + "+08:00");
      if (Number.isNaN(date.getTime()))
        throw new RecoveryConflict("PosAPI огноо буруу байна");
      const first =
        Array.isArray(response.receipts) && object(response.receipts[0])
          ? response.receipts[0]
          : {};
      const text = (value: unknown) =>
        typeof value === "string" ? value : null;
      const syncedAt = new Date();
      const ebarimt = {
        status: "SUCCESS",
        billId: response.id,
        receiptId: text(first.id),
        qrData: text(response.qrData),
        lottery: text(response.lottery),
        date: response.date,
        syncedAt: syncedAt.toISOString(),
      };
      const jsonResponse = JSON.parse(
        JSON.stringify(response),
      ) as Prisma.InputJsonObject;
      await tx.posSale.update({
        where: { id: sale.id },
        data: {
          ebarimtStatus: "SUCCESS",
          ebarimtBillId: ebarimt.billId,
          ebarimtReceiptId: ebarimt.receiptId,
          ebarimtQrData: ebarimt.qrData,
          ebarimtLottery: ebarimt.lottery,
          ebarimtDate: date,
          ebarimtError: null,
          ebarimtSyncedAt: syncedAt,
          ebarimtPayload: {
            ...metadata(sale.ebarimtPayload),
            response: jsonResponse,
            posApiDate: response.date,
            vatRecovery: {
              ...(state as Prisma.JsonObject),
              state: "COMPLETED",
              completedAt: syncedAt.toISOString(),
            },
          },
        },
      });
      const idempotency = await tx.posSaleIdempotency.findUnique({
        where: { receiptNo: sale.receiptNo },
        select: { response: true },
      });
      if (idempotency && object(idempotency.response))
        await tx.posSaleIdempotency.update({
          where: { receiptNo: sale.receiptNo },
          data: {
            response: {
              ...(idempotency.response as Prisma.JsonObject),
              ebarimt,
            },
          },
        });
      return { state: "COMPLETED" };
    });
    return res.json(result);
  } catch (error: unknown) {
    if (error instanceof RecoveryConflict)
      return res.status(409).json({ message: error.message });
    console.error("VAT recovery operation failed", error);
    return res.status(500).json({
      message:
        "Баримт сэргээх хүсэлтийг гүйцэтгэж чадсангүй. Давтан илгээхгүйгээр шалгана уу.",
    });
  }
});
export default router;
