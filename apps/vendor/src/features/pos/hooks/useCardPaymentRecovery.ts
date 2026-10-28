"use client";
import { useEffect, useRef, useState } from "react";
import type { RecoverableCardPayment, VerifiedCardRecovery } from "@mgl/types";
import {
  getRecoverableCardPayments,
  verifyCardRecovery,
} from "../api/card-payment-recovery";

export function useCardPaymentRecovery(
  registerId: string,
  date: string,
  amount: number,
  onVerified: (payment: VerifiedCardRecovery) => void,
) {
  const [payments, setPayments] = useState<RecoverableCardPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [verifyingId, setVerifyingId] = useState("");
  const [reload, setReload] = useState(0);
  const verifying = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setPayments([]);
    void getRecoverableCardPayments(registerId, date, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setPayments(data.payments);
        setTruncated(data.truncated);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Гүйлгээнүүдийг авч чадсангүй.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [registerId, date, reload]);

  const verify = async (payment: RecoverableCardPayment) => {
    if (verifying.current) return;
    verifying.current = true;
    setVerifyingId(payment.attemptId);
    setError("");
    try {
      const verified = await verifyCardRecovery(
        payment.attemptId,
        registerId,
        amount,
      );
      onVerified(verified);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Minu төлбөрийг баталгаажуулж чадсангүй.",
      );
    } finally {
      verifying.current = false;
      setVerifyingId("");
    }
  };
  return {
    payments,
    loading,
    error,
    truncated,
    verifyingId,
    refresh: () => setReload((value) => value + 1),
    verify,
  };
}
