"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  PaidAccessPaymentModal,
  type PaidAccessPaymentSession,
} from "@/components/molecules/payments/PaidAccessPaymentModal";
import { MentorSlots } from "./MentorSlots";
import { CalendarDays } from "lucide-react";
import { API } from "@/lib/api";
import { studyMentorName } from "@mgl/types";

export type BookingTeacher = {
  name: string;
  courseId?: string;
  index?: number;
};
export function MeetingBooking({
  teacher = { name: studyMentorName },
  embedded = false,
}: {
  teacher?: BookingTeacher;
  embedded?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  type Checkout = {
    time: string;
    bookingKey?: string;
    payment: PaidAccessPaymentSession;
  };
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const storageKey = teacher.courseId
    ? "study-teacher-payment/" +
      teacher.courseId +
      "/" +
      teacher.index +
      "/" +
      teacher.name
    : "study-mentor-payment";
  useEffect(() => {
    try {
      const saved: Checkout | null = JSON.parse(
        sessionStorage.getItem(storageKey) || "null",
      );
      if (
        saved?.time &&
        saved.payment?.invoiceId &&
        Date.parse(saved.payment.expiresAt || "") > Date.now()
      ) {
        setCheckout(saved);
      }
    } catch {
      /* Private browsing can disable session storage. */
    }
  }, [storageKey]);
  const paid = useCallback(async () => {
    setShowPayment(false);
    setCheckout(null);
    setStatus("sent");
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "idle") return;
    const fields = new FormData(event.currentTarget);
    if (!fields.get("requestedTime")) {
      setError("Сул цаг сонгоно уу.");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch(
        API +
          "/forms/study-mentor-meeting/" +
          (teacher.courseId ? "teacher-responses" : "responses"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: { ...Object.fromEntries(fields), teacher },
          }),
        },
      );
      if (!res.ok) {
        if (res.status === 409 || res.status === 400)
          setRefresh((value) => value + 1);
        const result: unknown = await res.json().catch(() => null);
        throw new Error(
          result &&
            typeof result === "object" &&
            "message" in result &&
            typeof result.message === "string"
            ? result.message
            : "Хүсэлт илгээж чадсангүй.",
        );
      }
      const result = await res.json();
      if (!result.payment?.qrText)
        throw new Error("Нэхэмжлэлийн мэдээллийг шалгана уу.");
      const session: Checkout = {
        time: String(fields.get("requestedTime")),
        bookingKey: result.payment.bookingKey,
        payment: result.payment,
      };
      setCheckout(session);
      setShowPayment(true);
      setStatus("idle");
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(session));
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Холболтоо шалгана уу.");
      setStatus("idle");
    }
  }
  const field =
    "mt-1.5 block h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base";
  return (
    <section
      className={
        embedded ? "pt-5" : "rounded-2xl border border-slate-200 bg-white p-5"
      }
    >
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <CalendarDays size={20} />
        Уулзалтын цаг авах
      </h3>
      <p className="mt-2 text-base font-bold text-slate-900">
        1 цаг · 1,000,000 ₮
      </p>
      <p className="mt-1 text-sm text-slate-600">
        ESIM данс · Хаан банк · 320005005252080629
      </p>
      {showPayment && checkout && (
        <PaidAccessPaymentModal
          itemId={checkout.bookingKey || checkout.time}
          title={teacher.name + " · Уулзалт"}
          payment={checkout.payment}
          checkUrl={API + "/forms/study-mentor-meeting/payment/check"}
          onPaid={paid}
          onClose={() => setShowPayment(false)}
        />
      )}
      {checkout ? (
        <div className="mt-4">
          <p>Сонгосон цаг · {checkout.time.replace("T", " ")}</p>
          <button
            className="mt-3 min-h-12 rounded-xl bg-sky-700 px-4 text-white"
            onClick={() => setShowPayment(true)}
          >
            QR төлбөр нээх
          </button>
          <button
            className="ml-3 min-h-12"
            onClick={() => {
              setCheckout(null);
              setRefresh((n) => n + 1);
              try {
                sessionStorage.removeItem(storageKey);
              } catch {}
            }}
          >
            Цагийн жагсаалт
          </button>
        </div>
      ) : status === "sent" ? (
        <p role="status" className="mt-3 text-emerald-800">
          Төлбөр төлөгдөж, уулзалтын цаг баталгаажлаа.
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="mt-4 grid gap-4 text-sm font-semibold"
        >
          <label>
            Таны нэр
            <input
              className={field}
              required
              maxLength={100}
              name="name"
              autoComplete="name"
            />
          </label>
          <label>
            Утасны дугаар
            <input
              className={field}
              required
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{8}"
              maxLength={8}
              name="phone"
              autoComplete="tel-national"
              placeholder="8 оронтой дугаар"
            />
          </label>
          <fieldset disabled={status === "sending"}>
            <MentorSlots refresh={refresh} teacher={teacher} />
          </fieldset>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
