"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, AlertCircle, ChevronDown } from "lucide-react";
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

const DEFAULT_TYPES: MembershipType[] = [
  {
    value: "BASIC",
    label: "А. Энгийн гишүүн",
    price: "0₮",
    desc: "Уулзалт, сургалтын мэдээлэл авах, хуваалцах",
    durations: [],
  },
  {
    value: "ACTIVE",
    label: "В. Идэвхтэй гишүүн",
    price: "60,000–180,000₮",
    desc: "Сургалтад 50% хөнгөлөлт, 5 бараа байршуулах",
    durations: [
      { months: 1, price: 60000, label: "1 Сар – 60,000₮" },
      { months: 3, price: 120000, label: "3 Сар – 120,000₮" },
      { months: 6, price: 180000, label: "6 Сар – 180,000₮" },
    ],
  },
  {
    value: "BRANCH_COUNCIL",
    label: "С. Салбарын төлөөлөн удирдах гишүүн",
    price: "360,000–600,000₮",
    desc: "Идэвхтэй эрх + 10 бараа, төсөл удирдах",
    durations: [
      { months: 3, price: 360000, label: "3 Сар – 360,000₮" },
      { months: 6, price: 600000, label: "6 Сар – 600,000₮" },
    ],
  },
  {
    value: "GOVERNING_COUNCIL",
    label: "D. Төлөөлөн удирдах",
    price: "1,800,000–3,000,000₮",
    desc: "Бүх эрх + тендер, 20 бараа",
    durations: [
      { months: 6, price: 1800000, label: "6 Сар – 1,800,000₮" },
      { months: 12, price: 3000000, label: "12 Сар – 3,000,000₮" },
    ],
  },
];

export default function AssociationRegisterPage() {
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>(DEFAULT_TYPES);
  const [pageLabel, setPageLabel] = useState("БҮРТГЭЛИЙН ХУУДАС");
  const [pageTitle, setPageTitle] = useState("Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн\nнэгдсэн холбооны гишүүнчлэл");
  const [pageSubtitle, setPageSubtitle] = useState("Төлөөлөн удирдах зөвлөл томилох хурлын бүртгэл");

  const [form, setForm] = useState({
    lastName: "", firstName: "", education: "", profession: "",
    organizationName: "", businessActivity: "", foundedYear: "",
    address: "", experience: "", phone: "",
    membershipType: "", durationMonths: "",
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
          if (data.membershipTypes?.length) setMembershipTypes(data.membershipTypes);
          if (data.pageLabel) setPageLabel(data.pageLabel);
          if (data.pageTitle) setPageTitle(data.pageTitle);
          if (data.pageSubtitle) setPageSubtitle(data.pageSubtitle);
        }
      })
      .catch(() => { /* use defaults */ });
  }, []);

  const selectedType = membershipTypes.find((t) => t.value === form.membershipType);

  const f = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.lastName || !form.firstName || !form.phone || !form.organizationName || !form.address || !form.membershipType) {
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
            Таны бүртгэл хүлээн авагдлаа. Холбооны ажилтнууд тантай удахгүй холбогдох болно.
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

          <Field label="Байгууллагын хаяг" required>
            <input value={form.address} onChange={(e) => f("address", e.target.value)} placeholder="Улаанбаатар, дүүрэг..." className={inputCls} required />
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
