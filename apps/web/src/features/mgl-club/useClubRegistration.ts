import { useEffect, useRef, useState, type FormEvent } from "react";
import { parseMglClubProfile } from "@mgl/types";
import { API } from "@/lib/api";
import {
  firstInvalidControl,
  readRegistrationValues,
  registrationSteps,
  type RegistrationControl,
  type RegistrationValues,
} from "./registration-steps";

export function useClubRegistration() {
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [review, setReview] = useState<RegistrationValues | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const invalidRef = useRef<RegistrationControl | null>(null);
  const fieldsets = useRef<Array<HTMLFieldSetElement | null>>([]);
  const submitting = useRef(false);
  const previousStep = useRef(0);
  const lastStep = registrationSteps.length - 1;
  const active = registrationSteps[step];
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    if (invalidRef.current) {
      invalidRef.current.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
      invalidRef.current.reportValidity();
      invalidRef.current = null;
    } else {
      headingRef.current?.focus({ preventScroll: true });
      formRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    }
  }, [step]);
  function goTo(index: number) {
    if (!pending) {
      setError("");
      setStep(index);
    }
  }
  function validate(index: number): boolean {
    const fieldset = fieldsets.current[index];
    const invalid = fieldset ? firstInvalidControl(fieldset) : undefined;
    if (!invalid) return true;
    setError("Тэмдэглэсэн талбарыг шалгаад дахин үргэлжлүүлнэ үү.");
    if (index === step) {
      invalid.scrollIntoView({ block: "center", behavior: "instant" });
      invalid.reportValidity();
    } else {
      invalidRef.current = invalid;
      setStep(index);
    }
    return false;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    if (step < lastStep) {
      if (!validate(step)) return;
      setReview(readRegistrationValues(form));
      goTo(step + 1);
      return;
    }
    for (let index = 0; index <= lastStep; index++)
      if (!validate(index)) return;
    const data = parseMglClubProfile(Object.fromEntries(new FormData(form)));
    if (!data) {
      setError(
        "Мэдээллийн формат буруу байна. Он, утас болон цахим хуудасны холбоосоо шалгаарай.",
      );
      return;
    }
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`${API}/forms/mgl-club/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!response.ok) {
        let message = "Бүртгэл илгээхэд алдаа гарлаа. Дахин оролдоно уу.";
        try {
          const body: { message?: string } = await response.json();
          if (typeof body.message === "string") message = body.message;
        } catch {
          /* Keep a readable message for non-JSON server responses. */
        }
        throw new Error(message);
      }
      setComplete(true);
    } catch (cause) {
      setError(
        cause instanceof TypeError
          ? "Сүлжээний холболтоо шалгаад дахин оролдоно уу."
          : cause instanceof Error
            ? cause.message
            : "Холболтын алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  function clearFieldError(event: FormEvent<HTMLFormElement>) {
    const control = event.target;
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement ||
      control instanceof HTMLSelectElement
    )
      control.setCustomValidity("");
    if (error) setError("");
  }
  return {
    step,
    pending,
    error,
    complete,
    review,
    formRef,
    headingRef,
    fieldsets,
    lastStep,
    active,
    goTo,
    submit,
    clearFieldError,
  };
}
