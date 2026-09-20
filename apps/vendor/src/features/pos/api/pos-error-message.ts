/** Only display structured API messages, never a proxy or framework HTML page. */
export function posErrorMessage(raw: string, status: number): string {
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object") {
      const body = value as Record<string, unknown>;
      const message =
        typeof body.message === "string" ? body.message : body.error;
      if (
        typeof message === "string" &&
        message.trim() &&
        !/<[^>]+>/.test(message)
      ) {
        return message.slice(0, 500);
      }
    }
  } catch {
    // Non-JSON responses are common while a service restarts or deploys.
  }
  if (status === 404)
    return "POS үйлчилгээний энэ үйлдэл одоогоор боломжгүй байна. Түр хүлээгээд дахин оролдоно уу.";
  if (status === 401)
    return "Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү.";
  if (status === 403) return "Энэ үйлдлийг хийх эрх хүрэлцэхгүй байна.";
  return "POS үйлчилгээтэй холбогдоход алдаа гарлаа. Дахин оролдоно уу.";
}
