import type { PosReceipt } from "@mgl/types";

/** Display-only copy. Never submit this receipt to payment or eBarimt APIs. */
export function withDemoEbarimt(receipt: PosReceipt): PosReceipt {
  return {
    ...receipt,
    ebarimt: {
      status: "SUCCESS",
      receiptId: "TEST-RECEIPT-000001",
      billId: "TEST-DDTD-000001",
      lottery: "TEST-AB 12345678",
      qrData: `TEST ONLY | NOT A VALID EBARIMT | ${receipt.receiptNo} | ${receipt.grandTotal} MNT`,
    },
  };
}
