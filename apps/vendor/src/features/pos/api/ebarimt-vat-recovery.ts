import { posRequest } from "./_pos-client";
import {
  correctRejectedEbarimtVat,
  getLocalEbarimtInfo,
  getLocalEbarimtInvalidReceipts,
} from "./ebarimt";
import type { RegisterConfig } from "../types/pos.types";

export interface VatRecoveryEntry {
  saleId: string;
  receiptNo: string;
  originalId: string;
  totalAmount: number;
  state: "READY" | "SUBMITTED" | "COMPLETED" | "SKIPPED";
}
export interface VatRecoveryList {
  total: number;
  receipts: VatRecoveryEntry[];
}
interface SavedAttempt {
  requestId: string;
  response?: unknown;
}
const REGISTER_ID = "d453a52d-dbb0-472d-8220-b01fd11d22fc";
export const isVatRecoveryRegister = (registerId: string) =>
  registerId === REGISTER_ID;
export const loadVatRecovery = () =>
  posRequest<VatRecoveryList>(
    `/pos/ebarimt-vat-recovery?registerId=${REGISTER_ID}`,
  );
const storageKey = (entry: VatRecoveryEntry) =>
  `vendor-vat-recovery:20261111:${REGISTER_ID}:${entry.saleId}`;
function readAttempt(entry: VatRecoveryEntry): SavedAttempt | null {
  const raw = localStorage.getItem(storageKey(entry));
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("requestId" in value) ||
    typeof value.requestId !== "string"
  )
    throw new Error(
      "Сэргээх хадгалсан хүсэлт буруу байна. Давтан илгээхгүйгээр шалгана уу.",
    );
  return {
    requestId: value.requestId,
    ...("response" in value ? { response: value.response } : {}),
  };
}
async function complete(entry: VatRecoveryEntry, attempt: SavedAttempt) {
  await posRequest(`/pos/ebarimt-vat-recovery/${entry.saleId}`, {
    method: "POST",
    body: {
      action: "COMPLETE",
      requestId: attempt.requestId,
      response: attempt.response,
    },
  });
  localStorage.removeItem(storageKey(entry));
}

/** Every uncertain request stays reserved on the server and is never automatically resubmitted. */
export async function recoverVatReceipts(
  register: RegisterConfig,
  shouldContinue: () => boolean,
  progress: (message: string) => void,
): Promise<VatRecoveryList> {
  if (!isVatRecoveryRegister(register.id))
    throw new Error("Энэ касс сэргээх жагсаалтад байхгүй.");
  const info = await getLocalEbarimtInfo(register);
  if (
    String(info.posNo) !== "10052245" ||
    !info.merchants?.some(
      (merchant) =>
        merchant.tin === "75200179693" && merchant.vatPayer !== false,
    )
  )
    throw new Error("Энэ компьютерт MGL-299-ийн PosAPI холбогдоогүй байна.");
  const list = await loadVatRecovery();
  const invalid = await getLocalEbarimtInvalidReceipts(register);
  const invalidIds = new Set(invalid.map((receipt) => receipt.id));
  for (const entry of list.receipts) {
    if (!shouldContinue()) break;
    if (entry.state === "COMPLETED" || entry.state === "SKIPPED") continue;
    progress(`${entry.receiptNo} баримтыг шалгаж байна…`);
    const saved = readAttempt(entry);
    if (saved?.response) {
      await complete(entry, saved); // Only persist the known response; never issue again.
      continue;
    }
    if (
      saved ||
      entry.state === "SUBMITTED" ||
      !invalidIds.has(entry.originalId)
    )
      continue;
    const attempt: SavedAttempt = { requestId: crypto.randomUUID() };
    // If browser storage is unavailable, stop before reserving or issuing a receipt.
    localStorage.setItem(storageKey(entry), JSON.stringify(attempt));
    const started = await posRequest<{ source: unknown }>(
      `/pos/ebarimt-vat-recovery/${entry.saleId}`,
      {
        method: "POST",
        body: { action: "START", requestId: attempt.requestId },
      },
    );
    const response = await correctRejectedEbarimtVat(
      started.source,
      entry.receiptNo,
      entry.originalId,
      entry.totalAmount,
      register,
    );
    const completed = { ...attempt, response };
    localStorage.setItem(storageKey(entry), JSON.stringify(completed));
    await complete(entry, completed);
  }
  return loadVatRecovery();
}
