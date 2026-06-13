"use client";

import { useMemo, useState } from "react";
import { AlertCircle, BadgeCheck, CheckCircle2, Loader2 } from "lucide-react";
import { API } from "@/lib/api";
import type { AuthUser } from "@/lib/auth-context";
import {
  PaidAccessPaymentModal,
  type PaidAccessPaymentSession,
} from "@/components/molecules/payments/PaidAccessPaymentModal";
import type { MembershipType } from "../../association/MembershipSelection";
import { MembershipPlanPicker } from "./MembershipPlanPicker";
import type { ProfileFormState } from "./types";

const DEFAULT_TYPES: MembershipType[] = [
  {
    value: "ACTIVE",
    label: "Silver",
    price: "30,000₮ / сар",
    desc: "Стандарт бүтээгдэхүүний хөнгөлөлт\nСтандарт хэрэглэгчийн дэмжлэг",
    durations: [
      { months: 1, price: 30000, label: "1 сар" },
      { months: 6, price: 180000, label: "6 сарын bundle · 180,000₮" },
    ],
  },
  {
    value: "BRANCH_COUNCIL",
    label: "Gold",
    price: "50,000₮ / сар",
    desc: "10% нэмэлт дэлгүүрийн хөнгөлөлт\nPriority 24/7 support\nҮнэгүй хүргэлтийн эрх\nУлирлын sale-д түрүүлж оролцох",
    durations: [
      { months: 1, price: 50000, label: "1 сар" },
      { months: 6, price: 300000, label: "6 сарын bundle · 300,000₮" },
    ],
  },
  {
    value: "GOVERNING_COUNCIL",
    label: "Platinum",
    price: "100,000₮ / сар",
    desc: "VIP event access\n24/7 personal concierge\nVIP хөнгөлөлт 25% хүртэл\nPremium anniversary gift box",
    durations: [
      { months: 1, price: 100000, label: "1 сар" },
      { months: 6, price: 600000, label: "6 сарын bundle · 600,000₮" },
    ],
  },
];

export function MembershipActivationPanel({
  user,
  form,
  request,
}: {
  user: AuthUser;
  form: ProfileFormState;
  request: (url: string, init?: RequestInit) => Promise<Response>;
}) {
  const membershipTypes = DEFAULT_TYPES;
  const [membershipType, setMembershipType] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingPlanKey, setSubmittingPlanKey] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [paymentSession, setPaymentSession] =
    useState<PaidAccessPaymentSession | null>(null);
  const [registrationId, setRegistrationId] = useState("");

  const { firstName, lastName } = useMemo(
    () => splitName(form.fullName || user.fullName || ""),
    [form.fullName, user.fullName],
  );

  const submit = async (nextType = membershipType, nextDuration = durationMonths) => {
    setError("");
    const type = membershipTypes.find((item) => item.value === nextType);
    const duration = type?.durations.find(
      (item) => String(item.months) === nextDuration,
    );

    if (!nextType || !type) {
      setError("Гишүүнчлэлийн төрлөө сонгоно уу.");
      return;
    }
    if (!nextDuration || !duration) {
      setError("Гишүүнчлэлийн хугацаагаа сонгоно уу.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Profile дээр утасны дугаараа бөглөсний дараа идэвхжүүлнэ үү.");
      return;
    }
    if (!form.fullAddress.trim()) {
      setError("Profile дээр хаягаа бөглөсний дараа идэвхжүүлнэ үү.");
      return;
    }

    setMembershipType(nextType);
    setDurationMonths(nextDuration);
    setSubmitting(true);
    setSubmittingPlanKey(`${nextType}:${nextDuration}`);
    try {
      const res = await request(`${API}/association/systemqr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName,
          firstName,
          address: form.fullAddress.trim(),
          phone: form.phone.trim(),
          membershipType: nextType,
          durationMonths: Number(nextDuration),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "QuickQR төлбөр үүсгэхэд алдаа гарлаа.");
        return;
      }
      setRegistrationId(String(data.registrationId || ""));
      setPaymentSession({
        invoiceId: String(data.invoiceId || ""),
        providerInvoiceId: String(data.providerInvoiceId || ""),
        amount: Number(data.amount || duration.price),
        qrText: String(data.qrText || ""),
        qrImage: String(data.qrImage || ""),
        urls: Array.isArray(data.urls) ? data.urls : [],
        expiresAt: data.expiresAt,
      });
    } catch {
      setError("Сүлжээний алдаа гарлаа.");
    } finally {
      setSubmitting(false);
      setSubmittingPlanKey("");
    }
  };

  return (
    <section className="rounded-[24px] border border-orange-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
          <BadgeCheck size={18} />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
            Elevate your experience
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            MGL Premium Membership
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            Танд тохирох tier-ээ сонгоод QuickQR-р төлж идэвхжүүлнэ.
          </p>
        </div>
      </div>

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-black text-emerald-800">
            <CheckCircle2 size={18} />
            Гишүүнчлэлийн хүсэлт илгээгдлээ
          </div>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-700">
            QuickQR төлбөр амжилттай баталгаажлаа.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <MembershipPlanPicker
            plans={membershipTypes}
            selectedType={membershipType}
            onTypeChange={setMembershipType}
            durationMonths={durationMonths}
            onDurationChange={setDurationMonths}
            submitting={submitting}
            submittingPlanKey={submittingPlanKey}
            onPay={(type, months) => submit(type, months)}
          />

          <button
            type="button"
            onClick={() => submit()}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <BadgeCheck size={16} />
            )}
            {submitting ? "QR үүсгэж байна..." : "QuickQR-р төлөх"}
          </button>
        </div>
      )}
      {paymentSession && registrationId && (
        <PaidAccessPaymentModal
          itemId={registrationId}
          title="Гишүүнчлэлийн төлбөр"
          payment={paymentSession}
          checkUrl={`${API}/association/systemqr/check`}
          request={request}
          onPaid={async () => {
            setPaymentSession(null);
            setSuccess(true);
          }}
          onClose={() => setPaymentSession(null)}
        />
      )}
    </section>
  );
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { lastName: "Хэрэглэгч", firstName: "MGL" };
  if (parts.length === 1) return { lastName: parts[0], firstName: parts[0] };
  return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
}
