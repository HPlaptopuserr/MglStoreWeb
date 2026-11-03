import { withRequestDeadline } from "./request-deadline";
import { API, wmsFetch } from "@/lib/api";
export class TransferRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function transferRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  return withRequestDeadline(async (signal) => {
    const response = await wmsFetch(`${API}${path}`, { ...init, signal });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof body.message === "string"
          ? body.message
          : "Хүсэлт амжилтгүй. Дахин оролдоно уу.";
      throw new TransferRequestError(message, response.status);
    }
    if (body === null) throw new Error("Серверийн хариу буруу байна");
    return body as T;
  }, init?.signal);
}
export function requestError(error: unknown) {
  return error instanceof Error ? error.message : "Холболтын алдаа гарлаа";
}
