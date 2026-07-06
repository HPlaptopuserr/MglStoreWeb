"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, AlertCircle, CreditCard } from "lucide-react";
import { API } from "@/lib/api";
import { MembershipSelection } from "./MembershipSelection";

interface Duration {
  months: number | null;
  price: number;
  label: string;
}

interface MembershipType {
  value: string;
  label: string;
  price: string;
  desc: string;
  durations: Duration[];
}

interface PaymentAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  description: string;
}

const DEFAULT_PAYMENT_ACCOUNT: PaymentAccount = {
  bankName: "",
  accountNumber: "",
  accountName: "Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн холбоо",
  description: "Гүйлгээний утга дээр овог нэр, утас, сонгосон гишүүнчлэлийн төрлөө бичнэ үү.",
};

const DEFAULT_TYPES: MembershipType[] = [
  {
    value: "ACTIVE",
    label: "Гишүүнчлэл",
    price: "30,000₮ / сар",
    desc: "Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн холбооны гишүүнчлэл",
    durations: [
      { months: 1, price: 30000, label: "1 Сар – 30,000₮" },
      { months: 6, price: 180000, label: "6 Сар – 180,000₮" },
    ],
  },
];

export default function AssociationRegisterPage() {
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>(DEFAULT_TYPES);
  const [pageLabel, setPageLabel] = useState("БҮРТГЭЛИЙН ХУУДАС");
  const [pageTitle, setPageTitle] = useState("Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн\nнэгдсэн холбооны гишүүнчлэл");
  const [pageSubtitle, setPageSubtitle] = useState("Төлөөлөн удирдах зөвлөл томилох хурлын бүртгэл");
  const [paymentAccount, setPaymentAccount] = useState<PaymentAccount>(DEFAULT_PAYMENT_ACCOUNT);

  const [form, setForm] = useState({
    lastName: "", firstName: "", education: "", profession: "",
    organizationName: "", businessActivity: "", foundedYear: "",
    address: "", experience: "", phone: "",
    membershipType: "", durationMonths: "", paymentReference: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dynamic config from API
  useEffect(() => {
    fetch(`${API}/association/config`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setMembershipTypes(DEFAULT_TYPES);
          if (data.pageLabel) setPageLabel(data.pageLabel);
          if (data.pageTitle) setPageTitle(data.pageTitle);
          if (data.pageSubtitle) setPageSubtitle(data.pageSubtitle);
          setPaymentAccount({ ...DEFAULT_PAYMENT_ACCOUNT, ...(data.paymentAccount ?? {}) });
        }
      })
      .catch(() => { /* use defaults */ });
  }, []);

  const selectedType = membershipTypes.find((t) => t.value === form.membershipType);
  const selectedDuration = selectedType?.durations.find((d) => String(d.months) === form.durationMonths);
  const selectedAmount = selectedType?.value === "BASIC" ? 0 : selectedDuration?.price ?? 0;

  const f = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.lastName || !form.firstName || !form.phone || !form.organizationName || !form.membershipType) {
      setError("Одны тэмдэгтэй талбарыг заавал бөглөнө үү");
      return;
    }
    if (form.membershipType !== "BASIC" && !form.durationMonths) {
      setError("Гишүүнчлэлийн хугацааг сонгоно уу");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/association/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          durationMonths: form.durationMonths ? Number(form.durationMonths) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Алдаа гарлаа"); return; }
      setSuccess(true);
    } catch {
      setError("Сүлжээний алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Бүртгэл амжилттай!</h2>
          <p className="text-sm text-slate-500">
            Таны бүртгэл хүлээн авагдлаа. Төлбөртэй гишүүнчлэл сонгосон бол шилжүүлгийг шалгасны дараа холбооны ажилтнууд баталгаажуулна.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">{pageLabel}</p>
          <h1 className="text-lg font-black text-slate-900 leading-snug whitespace-pre-line">
            {pageTitle}
          </h1>
          <p className="text-sm text-slate-500 mt-2">{pageSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Овог" required>
              <input value={form.lastName} onChange={(e) => f("lastName", e.target.value)} placeholder="Овог" className={inputCls} required />
            </Field>
            <Field label="Нэр" required>
              <input value={form.firstName} onChange={(e) => f("firstName", e.target.value)} placeholder="Нэр" className={inputCls} required />
            </Field>
          </div>

          {/* Education + Profession */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Боловсрол">
              <input value={form.education} onChange={(e) => f("education", e.target.value)} placeholder="Дээд, дунд..." className={inputCls} />
            </Field>
            <Field label="Мэргэжил">
              <input value={form.profession} onChange={(e) => f("profession", e.target.value)} placeholder="Мэргэжил" className={inputCls} />
            </Field>
          </div>

          <Field label="Байгууллага нэр" required>
            <input value={form.organizationName} onChange={(e) => f("organizationName", e.target.value)} placeholder="Байгууллагын нэр" className={inputCls} required />
          </Field>

          <Field label="Үйл ажиллагааны чиглэл">
            <input value={form.businessActivity} onChange={(e) => f("businessActivity", e.target.value)} placeholder="Худалдаа, үйлдвэрлэл..." className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Байгуулагдсан он">
              <input value={form.foundedYear} onChange={(e) => f("foundedYear", e.target.value)} placeholder="2010" className={inputCls} />
            </Field>
            <Field label="Утас" required>
              <input value={form.phone} onChange={(e) => f("phone", e.target.value)} placeholder="99001234" type="tel" className={inputCls} required />
            </Field>
          </div>

          <Field label="Байгууллагын хаяг">
            <input value={form.address} onChange={(e) => f("address", e.target.value)} placeholder="Хүсвэл дараа нь бөглөж болно" className={inputCls} />
          </Field>

          <Field label="Бизнесийн туршлага">
            <textarea value={form.experience} onChange={(e) => f("experience", e.target.value)} placeholder="Жилийн туршлага, хийж буй бизнес..." rows={2} className={`${inputCls} resize-none`} />
          </Field>

          {/* Membership type */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-3">
              Та ямар гишүүн болох вэ? <span className="text-red-500">*</span>
            </label>
            <MembershipSelection
              types={membershipTypes}
              selectedType={form.membershipType}
              onTypeChange={(val) => f("membershipType", val)}
              durationMonths={form.durationMonths}
              onDurationChange={(val) => f("durationMonths", val)}
            />
          </div>

          {form.membershipType && (
            <PaymentInstruction
              amount={selectedAmount}
              account={paymentAccount}
              reference={form.paymentReference}
              onReferenceChange={(value) => f("paymentReference", value)}
              payerName={`${form.lastName} ${form.firstName}`.trim()}
              phone={form.phone}
            />
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Илгээж байна...</> : "Бүртгүүлэх"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white";

function PaymentInstruction({
  amount,
  account,
  reference,
  onReferenceChange,
  payerName,
  phone,
}: {
  amount: number;
  account: PaymentAccount;
  reference: string;
  onReferenceChange: (value: string) => void;
  payerName: string;
  phone: string;
}) {
  if (amount <= 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-bold text-emerald-800">Энгийн гишүүнчлэл төлбөргүй.</p>
      </div>
    );
  }

  const suggestedReference = [payerName, phone].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <CreditCard size={17} />
        </span>
        <div>
          <p className="text-sm font-black text-indigo-950">Гишүүнчлэлийн төлбөр</p>
          <p className="text-xs font-semibold text-indigo-700">{amount.toLocaleString()}₮ шилжүүлнэ</p>
        </div>
      </div>
      <div className="grid gap-2 rounded-xl border border-indigo-100 bg-white p-3 text-sm">
        <InfoLine label="Дансны нэр" value={account.accountName} />
        <InfoLine label="Банк" value={account.bankName || "Админ дээр банк тохируулна"} />
        <InfoLine label="Данс" value={account.accountNumber || "Админ дээр дансны дугаар тохируулна"} />
      </div>
      <p className="mt-2 text-xs font-semibold leading-relaxed text-indigo-800">
        {account.description || DEFAULT_PAYMENT_ACCOUNT.description}
      </p>
      <Field label="Гүйлгээний утга / reference">
        <input
          value={reference}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder={suggestedReference || "Овог нэр · утас"}
          className={`${inputCls} mt-1`}
        />
      </Field>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right font-black text-slate-900">{value}</span>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
