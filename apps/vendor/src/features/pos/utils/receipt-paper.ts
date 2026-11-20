export const RECEIPT_PAPER_WIDTHS = [58, 80] as const;

export type ReceiptPaperWidth = (typeof RECEIPT_PAPER_WIDTHS)[number];

let sessionPaperWidth: ReceiptPaperWidth | undefined;

const RECEIPT_PAPER_WIDTH_STORAGE_KEY = "mgl_receipt_paper_width_mm";

export function readReceiptPaperWidth(): ReceiptPaperWidth {
  if (sessionPaperWidth !== undefined) return sessionPaperWidth ?? 58;
  if (typeof window === "undefined") return 58;
  try {
    return window.localStorage.getItem(RECEIPT_PAPER_WIDTH_STORAGE_KEY) === "80"
      ? 80
      : 58;
  } catch {
    return sessionPaperWidth ?? 58;
  }
}

export function saveReceiptPaperWidth(width: ReceiptPaperWidth) {
  sessionPaperWidth = width;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECEIPT_PAPER_WIDTH_STORAGE_KEY, String(width));
  } catch {
    // Printing remains available when browser storage is disabled.
  }
}

export type ReceiptPageMode = "receipt" | "printer";
let sessionPageMode: ReceiptPageMode | undefined;
const RECEIPT_PAGE_MODE_STORAGE_KEY = "mgl_receipt_page_mode";

/** Existing installations retain receipt-length roll printing. */
export function readReceiptPageMode(): ReceiptPageMode {
  if (sessionPageMode !== undefined) return sessionPageMode;
  if (typeof window === "undefined") return "receipt";
  try {
    return window.localStorage.getItem(RECEIPT_PAGE_MODE_STORAGE_KEY) ===
      "printer"
      ? "printer"
      : "receipt";
  } catch {
    return sessionPageMode ?? "receipt";
  }
}

export function saveReceiptPageMode(mode: ReceiptPageMode) {
  sessionPageMode = mode;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECEIPT_PAGE_MODE_STORAGE_KEY, mode);
  } catch {
    // Printing remains available when browser storage is disabled.
  }
}
