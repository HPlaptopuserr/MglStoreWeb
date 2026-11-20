import { randomUUID } from "node:crypto";

/** Keep the readable date while avoiding collisions across registers and retries. */
export function generatePosReceiptNumber(now = new Date()): string {
  return `POS-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().replace(/-/g, "").toUpperCase()}`;
}
