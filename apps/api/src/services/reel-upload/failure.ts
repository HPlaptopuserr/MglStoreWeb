import { ReelUploadError } from "./policy";

export type ReelUploadStage =
  | "permissions"
  | "assembly"
  | "transcode"
  | "storage"
  | "commit";

/** Log categories only: ffmpeg stderr and storage messages can include private paths or credentials. */
export function describeReelUploadFailure(
  error: unknown,
  stage: ReelUploadStage,
) {
  const record =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  const rawCode = record.code;
  const code =
    typeof rawCode === "string" && /^[A-Z0-9_]{1,40}$/.test(rawCode)
      ? rawCode
      : undefined;
  const name =
    error instanceof Error && /^[A-Za-z]{1,40}$/.test(error.name)
      ? error.name
      : "UnknownError";
  const retryableCodes = new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ENETUNREACH",
    "ECONNREFUSED",
    "P1001",
    "P1002",
    "P1008",
    "P1017",
    "P2024",
  ]);
  const retryable =
    error instanceof ReelUploadError
      ? error.status >= 500 || error.status === 429
      : name === "AbortError" ||
        (!!code && retryableCodes.has(code)) ||
        stage === "storage" ||
        stage === "commit";
  return {
    code,
    name,
    retryable,
    message:
      error instanceof ReelUploadError
        ? error.message
        : retryable
          ? "Видео боловсруулах үйлчилгээ түр тасалдлаа. Илгээлтийг дахин оролдож байна."
          : "Видео боловсруулж чадсангүй. Дахин оролдоно уу.",
  };
}
