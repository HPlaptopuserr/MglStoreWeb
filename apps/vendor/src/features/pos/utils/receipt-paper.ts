export const RECEIPT_PAPER_WIDTHS = [58, 80] as const;

export type ReceiptPaperWidth = (typeof RECEIPT_PAPER_WIDTHS)[number];

const RECEIPT_PAPER_WIDTH_STORAGE_KEY = "mgl_receipt_paper_width_mm";

export function readReceiptPaperWidth(): ReceiptPaperWidth {
  if (typeof window === "undefined") return 58;
  return window.localStorage.getItem(RECEIPT_PAPER_WIDTH_STORAGE_KEY) === "80" ? 80 : 58;
}

export function saveReceiptPaperWidth(width: ReceiptPaperWidth) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECEIPT_PAPER_WIDTH_STORAGE_KEY, String(width));
}
