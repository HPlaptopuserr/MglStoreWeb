import type { PosReceipt } from "@mgl/types";

/** Creates an in-memory print sample. Never submit this receipt to an API. */
export function createTestQrReceipt(source: PosReceipt): PosReceipt {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Тест QR зөвхөн хөгжүүлэлтийн орчинд боломжтой.");
  }

  const testId = `TEST-${source.receiptNo}`;
  return {
    ...source,
    id: `TEST-${source.id}`,
    receiptNo: testId,
    status: "TEST",
    ebarimt: {
      status: "SUCCESS",
      billId: testId,
      receiptId: testId,
      qrData: [
        "MGLSTORE",
        "TEST_PRINT_ONLY",
        testId,
        source.id,
        source.grandTotal,
        "NOT_A_TAX_RECEIPT",
      ].join("|"),
      lottery: "TEST",
      date: source.createdAt,
      receiptType: "B2C",
    },
  };
}
