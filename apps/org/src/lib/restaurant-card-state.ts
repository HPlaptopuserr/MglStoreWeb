import type { CardAttempt } from "@mgl/types";
import { getRestaurantCardAttemptStatus } from "./restaurant-pos-api";

type CardState = Pick<CardAttempt, "status" | "message">;

export function isRestaurantCardUnresolved(
  attempt: Pick<CardAttempt, "status"> | null | undefined,
  provider: string | null | undefined,
): boolean {
  return attempt?.status === "PENDING" ||
    (provider === "MINU_AGENT" && attempt?.status === "FAILED");
}

export function restaurantCardInstructions(
  attempt: CardState | null | undefined,
  cancellationRequested = false,
): { title: string; message: string } {
  if (cancellationRequested) return {
    title: "Төхөөрөмж дээр цуцална уу",
    message: "Карт уншигч төхөөрөмж дээр Буцах / Цуцлах товч дарна уу. Төлбөр цуцлагдмагц захиалга руу автоматаар буцна.",
  };
  const message = attempt?.message?.trim() || "";
  if (message.toLowerCase().includes("чипээр уншуулна уу")) return {
    title: "Картаа чипээр уншуулна уу",
    message: "Картын чиптэй үзүүрийг карт уншигчийн үүрэнд хийж, төхөөрөмжийн дэлгэц дээрх зааврыг дагана уу.",
  };
  return {
    title: "Картаа уншуулна уу",
    message: message && !/^(successful|success|ok)$/i.test(message)
      ? message : "Карт уншигч төхөөрөмж дээр картаа уншуулж, дэлгэцийн зааврыг дагана уу.",
  };
}

/** Only reads the original invoice. Never creates, cancels or charges a payment. */
export async function checkRestaurantCardCancellation(
  attemptId: string,
  provider: string | null | undefined,
): Promise<{ attempt: CardAttempt; next: "COMPLETE" | "RETURN" | "WAIT" }> {
  const attempt = await getRestaurantCardAttemptStatus(attemptId);
  if (attempt.status === "APPROVED") return { attempt, next: "COMPLETE" };
  if (attempt.status === "DECLINED" || (provider !== "MINU_AGENT" && attempt.status === "FAILED"))
    return { attempt, next: "RETURN" };
  return { attempt, next: "WAIT" };
}
