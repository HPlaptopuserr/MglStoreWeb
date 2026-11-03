import { API, wmsFetch } from "@/lib/api";

export async function paymentRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await wmsFetch(`${API}${path}`, init);
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      response.status === 404
        ? "Төлбөрийн үйлчилгээний шинэ endpoint ачаалагдаагүй байна. Түр хүлээгээд дахин оролдоно уу."
        : "Төлбөрийн серверээс буруу хариу ирлээ. Дахин оролдоно уу.",
    );
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error("Төлбөрийн серверийн хариуг уншиж чадсангүй. Дахин оролдоно уу.");
  }
  if (!response.ok) {
    const message =
      result && typeof result === "object" && "message" in result
        ? String(result.message)
        : "Хүсэлтийг гүйцэтгэж чадсангүй.";
    throw new Error(message);
  }
  return result as T;
}
