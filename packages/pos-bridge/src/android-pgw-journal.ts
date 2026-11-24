import { OperationJournal } from "./operation-journal";
import { normalizeAndroidPgwCancellation } from "./providers/android-pgw.provider";

export function createAndroidPgwJournal(directory: string): OperationJournal {
  return new OperationJournal(directory, (id, entry) => {
    const result = entry.result;
    if (!id.startsWith("charge:")) return result;
    let request: unknown;
    try {
      request = JSON.parse(entry.fingerprint);
    } catch {
      return result;
    }
    if (
      !request ||
      typeof request !== "object" ||
      !("attemptId" in request) ||
      typeof request.attemptId !== "string" ||
      id !== `charge:${request.attemptId}` ||
      !("amount" in request) ||
      typeof request.amount !== "number" ||
      !Number.isFinite(request.amount) ||
      request.amount <= 0 ||
      !("terminalId" in request) ||
      typeof request.terminalId !== "string" ||
      request.terminalId !== entry.terminalId
    ) return result;

    // Historical journals do not record the wire amount multiplier.
    // A reply containing an amount requires reconciliation.
    return normalizeAndroidPgwCancellation(result, {
      attemptId: request.attemptId,
      amount: request.amount,
      terminalId: request.terminalId,
    }, Number.NaN);
  });
}
