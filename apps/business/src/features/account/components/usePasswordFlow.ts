"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  normalizeRecoveryPhone,
  passwordError,
  type AccountContext,
} from "../model/password";
export interface SmsChallenge {
  shortcode: string;
  text: string;
  expiresAt: string;
}
type Step = "phone" | "sms" | "password" | "done";
export function usePasswordFlow(context: AccountContext, change: boolean) {
  const [step, setStep] = useState<Step>(change ? "password" : "phone");
  const [challenge, setChallenge] = useState<SmsChallenge | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!challenge || step !== "sms") return;
    const update = () =>
      setRemaining(
        Math.max(
          0,
          Math.ceil((Date.parse(challenge.expiresAt) - Date.now()) / 1000),
        ),
      );
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [challenge, step]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const action =
      step === "phone"
        ? "start"
        : step === "sms"
          ? "verify"
          : change
            ? "change"
            : "reset";
    const phone = normalizeRecoveryPhone(String(form.get("phone") ?? ""));
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (action === "start" && !phone) {
      setError("Бүртгэлтэй 8 оронтой утасны дугаараа оруулна уу.");
      return;
    }
    if (action === "change" || action === "reset") {
      const validation = passwordError(password, confirmation);
      if (validation) {
        setError(validation);
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          context,
          phone,
          password,
          confirmation,
          currentPassword: form.get("currentPassword"),
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data: unknown = await response.json();
      if (!data || typeof data !== "object")
        throw new Error("Үйлчилгээний хариу буруу байна.");
      if (!response.ok)
        throw new Error(
          "message" in data && typeof data.message === "string"
            ? data.message
            : "Алдаа гарлаа. Дахин оролдоно уу.",
        );
      if (action === "start") {
        if (
          !("shortcode" in data) ||
          typeof data.shortcode !== "string" ||
          !("text" in data) ||
          typeof data.text !== "string" ||
          !("expiresAt" in data) ||
          typeof data.expiresAt !== "string"
        )
          throw new Error("Баталгаажуулалтын мэдээлэл дутуу байна.");
        setChallenge({
          shortcode: data.shortcode,
          text: data.text,
          expiresAt: data.expiresAt,
        });
        setRemaining(
          Math.max(
            0,
            Math.ceil((Date.parse(data.expiresAt) - Date.now()) / 1000),
          ),
        );
        setStep("sms");
      } else setStep(action === "verify" ? "password" : "done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Холболтын алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }
  function restart() {
    setChallenge(null);
    setStep("phone");
    setError("");
  }
  return { step, challenge, remaining, busy, error, submit, restart };
}
