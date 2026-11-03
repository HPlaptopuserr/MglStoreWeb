"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";
import type { PaymentMethod } from "../constants/payment-methods";
import { paymentMethodName, paymentMethodSwitchState, preparePaymentMethodSwitch } from "../utils/payment-method-switch";
import { useEventCallback } from "./useEventCallback";

interface Options {
  entries: CheckoutPaymentEntry[];
  remaining: number;
  processing: boolean;
  disabled: boolean;
  apply: (method: PaymentMethod) => void;
  resolvePending: (entry: CheckoutPaymentEntry) => Promise<void>;
}

export function usePaymentMethodSwitch(options: Options) {
  const [target, setTarget] = useState<PaymentMethod | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const apply = useEventCallback(options.apply);
  const state = paymentMethodSwitchState(options.entries, options.remaining, options.processing);

  useEffect(() => {
    if (!target || resolving || options.disabled || state === "waiting") return;
    if (state === "ready") apply(target);
    setTarget(null);
  }, [target, resolving, options.disabled, state, apply]);

  const request = useEventCallback(async (method: PaymentMethod) => {
    if (options.disabled || inFlight.current) return;
    setError("");
    if (state === "paid") return;
    if (state === "ready") {
      setTarget(null);
      apply(method);
      return;
    }
    inFlight.current = true;
    setResolving(true);
    setTarget(method);
    try {
      await preparePaymentMethodSwitch(options.entries, options.resolvePending);
    } catch (cause: unknown) {
      setTarget(null);
      setError(cause instanceof Error ? cause.message : "Өмнөх төлбөрийн цуцлалт баталгаажаагүй байна.");
    } finally {
      inFlight.current = false;
      setResolving(false);
    }
  });

  const pendingCard = options.entries.some(entry => entry.method === "CARD" && entry.status === "pending");
  const message = error || (target
    ? resolving
      ? `Өмнөх төлбөрийг шалгаж, ${paymentMethodName[target]} руу шилжүүлж байна…`
      : pendingCard
        ? `Терминал дээр картын төлбөрийг «Цуцлах» дарна уу. Цуцлалт банкнаас баталгаажмагц ${paymentMethodName[target]} руу автоматаар шилжинэ. Дахин төлбөр бүү хийгээрэй.`
        : `Өмнөх төлбөрийн цуцлалтыг хүлээж байна. Цуцлалт баталгаажмагц ${paymentMethodName[target]} руу шилжинэ.`
    : "");

  return { request, pending: Boolean(target), resolving, message, error: Boolean(error) };
}
