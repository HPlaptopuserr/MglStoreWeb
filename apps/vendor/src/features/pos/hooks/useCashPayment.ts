"use client";

import { useRef, useState } from "react";
import { calculateCashPayment, parseCashReceivedAmount } from "@mgl/types";

export function useCashPayment(enteredAmount: string, remaining: number) {
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  let preview: ReturnType<typeof calculateCashPayment> | null = null;
  let error = "";
  if (enteredAmount.trim()) {
    try {
      preview = calculateCashPayment(
        parseCashReceivedAmount(enteredAmount),
        remaining,
      );
    } catch (cause: unknown) {
      error = cause instanceof Error ? cause.message : "Дүн буруу байна";
    }
  }
  const submit = async (action: () => void | Promise<void>) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      await action();
    } catch (cause: unknown) {
      setSubmitError(
        cause instanceof Error ? cause.message : "Төлбөр нэмэхэд алдаа гарлаа",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  return { preview, error: error || submitError, submitting, submit };
}
