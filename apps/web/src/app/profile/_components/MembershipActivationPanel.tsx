"use client";

import { useMemo, useState } from "react";
import { AlertCircle, BadgeCheck, CheckCircle2 } from "lucide-react";
import { API } from "@/lib/api";
import type { AuthUser } from "@/lib/auth-context";
import {
  PaidAccessPaymentModal,
  type PaidAccessPaymentSession,
} from "@/components/molecules/payments/PaidAccessPaymentModal";
import type { MembershipType } from "../../association/MembershipSelection";
import { MembershipPlanPicker } from "./MembershipPlanPicker";
import type { ProfileFormState } from "./types";

export type MembershipUpgradeCopy = {
  introLabel?: string;
  introTitle?: string;
  introDescription?: string;
  tierEyebrow?: string;
  tierTitle?: string;
  tierDescription?: string;
  swipeHint?: string;
  missingPaymentConfigMessage?: string;
  phoneRequiredMessage?: string;
  addressRequiredMessage?: string;
  successTitle?: string;
  successDescription?: string;
};

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
  copy,
  membershipTypes: configuredMembershipTypes,
  user,
  form,
  request,
  onActivated,
}: {
  copy?: MembershipUpgradeCopy;
  membershipTypes?: MembershipType[];
  user: AuthUser;
  form: ProfileFormState;
  request: (url: string, init?: RequestInit) => Promise<Response>;
  onActivated?: () => Promise<void> | void;
}) {
  const membershipTypes =
    configuredMembershipTypes && configuredMembershipTypes.length > 0
      ? configuredMembershipTypes
      : DEFAULT_TYPES;
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

  const submit = async (
    nextType = membershipType,
    nextDuration = durationMonths,
  ) => {
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
      setError(
        copy?.phoneRequiredMessage ||
          "Profile дээр утасны дугаараа бөглөсний дараа идэвхжүүлнэ үү.",
      );
      return;
    }
    if (!form.fullAddress.trim()) {
      setError(
        copy?.addressRequiredMessage ||
          "Profile дээр хаягаа бөглөсний дараа идэвхжүүлнэ үү.",
      );
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
        setError(
          data?.message ||
            copy?.missingPaymentConfigMessage ||
            "QuickQR төлбөр үүсгэхэд алдаа гарлаа.",
        );
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
    <section className="rounded-[18px] border border-orange-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:rounded-[24px] sm:p-6">
      <div className="mb-2 flex items-start gap-2 sm:mb-5 sm:gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm sm:h-10 sm:w-10">
          <BadgeCheck size={16} className="sm:h-[18px] sm:w-[18px]" />
        </span>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-500 sm:text-[10px]">
            {copy?.introLabel || "Elevate your experience"}
          </p>
          <h2 className="mt-0.5 text-base font-black text-slate-950 sm:mt-1 sm:text-2xl">
            {copy?.introTitle || "MGL Premium Membership"}
          </h2>
          <p className="mt-1 hidden text-sm font-semibold leading-6 text-slate-500 sm:block">
            {copy?.introDescription ||
              "Tier болон хугацаагаа сонгоод card дээрх төлөх button-оор QR үүсгэнэ."}
          </p>
        </div>
      </div>

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-black text-emerald-800">
            <CheckCircle2 size={18} />
            {copy?.successTitle || "Гишүүнчлэлийн хүсэлт илгээгдлээ"}
          </div>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-700">
            {copy?.successDescription ||
              "QuickQR төлбөр амжилттай баталгаажлаа. Гишүүнчлэл admin баталгаажуулсны дараа идэвхжинэ."}
          </p>
          {error && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-relaxed text-amber-700">
              {error}
            </p>
          )}
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
            copy={copy}
          />
        </div>
      )}
      {paymentSession && registrationId && (
        <PaidAccessPaymentModal
          itemId={registrationId}
          title="Гишүүнчлэлийн төлбөр"
          payment={paymentSession}
          checkUrl={`${API}/association/systemqr/check`}
          request={request}
          successTitle="Төлбөр баталгаажлаа"
          successDescription="Гишүүнчлэлийн хүсэлт admin баталгаажуулалт хүлээж байна."
          onPaid={async () => {
            setPaymentSession(null);
            setSuccess(true);
            try {
              await onActivated?.();
            } catch {
              setError(
                "Төлбөр баталгаажсан ч профайл шинэчлэхэд алдаа гарлаа. Хуудсаа refresh хийнэ үү.",
              );
            }
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
