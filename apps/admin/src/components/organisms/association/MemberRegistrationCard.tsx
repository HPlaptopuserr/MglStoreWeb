"use client";

import { useState } from "react";
import {
  Phone, Building2, Briefcase, Calendar, MapPin,
  GraduationCap, Clock3, Check, X, Loader2,
  Clock, CheckCircle2, XCircle, ChevronRight,
  CreditCard, StickyNote, User, BadgeCheck, Banknote,
} from "lucide-react";
import { MembershipTypeBadge } from "./MembershipTypeBadge";
import { MEMBERSHIP_TYPES, STATUS_CONFIG, type MembershipTypeKey } from "./membership-constants";
import { API, adminFetch } from "@/lib/api";

export interface AssociationRegistration {
  id: string;
  lastName: string;
  firstName: string;
  education: string | null;
  profession: string | null;
  organizationName: string;
  businessActivity: string | null;
  foundedYear: string | null;
  address: string;
  experience: string | null;
  phone: string;
  membershipType: MembershipTypeKey;
  durationMonths: number | null;
  paymentAmount: number;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  paymentMethod: "CASH" | "CARD" | "QPAY" | "BANK_TRANSFER" | null;
  paymentReference: string | null;
  paymentNote: string | null;
  paidAt: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface Props {
  registration: AssociationRegistration;
  onRefresh: () => void;
}

function DetailField({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 flex items-start gap-1.5">
        {icon && <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>}
        {value}
      </span>
    </div>
  );
}

export function MemberRegistrationCard({ registration: reg, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [adminNote, setAdminNote] = useState(reg.adminNote ?? "");
  const [paymentStatus, setPaymentStatus] = useState(
    reg.paymentStatus === "PENDING" && reg.status !== "REJECTED"
      ? "PAID"
      : reg.paymentStatus ?? "PENDING",
  );
  const [paymentMethod, setPaymentMethod] = useState(reg.paymentMethod ?? "BANK_TRANSFER");
  const [paymentAmount, setPaymentAmount] = useState(String(reg.paymentAmount || ""));
  const [paymentReference, setPaymentReference] = useState(reg.paymentReference ?? "");
  const [paymentNote, setPaymentNote] = useState(reg.paymentNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const typeCfg = MEMBERSHIP_TYPES[reg.membershipType];
  const statusCfg = STATUS_CONFIG[reg.status] ?? STATUS_CONFIG.PENDING;

  const duration = typeCfg?.durations.find((d) => d.months === reg.durationMonths);
  const durationLabel = duration?.label ?? (reg.durationMonths ? `${reg.durationMonths} сар` : "Үнэгүй");
  const price = reg.paymentAmount || duration?.price || 0;
  const canReview = reg.status === "PENDING";
  const canUpdatePayment =
    reg.status === "APPROVED" && price > 0 && reg.paymentStatus !== "PAID";
  const showActionFooter = canReview || canUpdatePayment;
  const paymentStatusLabel = {
    PENDING: "Төлбөр хүлээгдэж буй",
    PAID: "Төлсөн",
    FAILED: "Амжилтгүй",
    REFUNDED: "Буцаагдсан",
    CANCELLED: "Цуцлагдсан",
  }[reg.paymentStatus ?? "PENDING"];
  const paymentStatusColor = {
    PENDING: "text-amber-700 bg-amber-50 border-amber-200",
    PAID: "text-emerald-700 bg-emerald-50 border-emerald-200",
    FAILED: "text-red-700 bg-red-50 border-red-200",
    REFUNDED: "text-blue-700 bg-blue-50 border-blue-200",
    CANCELLED: "text-slate-600 bg-slate-50 border-slate-200",
  }[reg.paymentStatus ?? "PENDING"];

  const fullName = `${reg.lastName} ${reg.firstName}`;
  const initials = `${reg.lastName[0] ?? ""}${reg.firstName[0] ?? ""}`;

  const createdDate = new Date(reg.createdAt).toLocaleDateString("mn-MN", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const createdTime = new Date(reg.createdAt).toLocaleTimeString("mn-MN", {
    hour: "2-digit", minute: "2-digit",
  });

  const reviewedDate = reg.reviewedAt
    ? new Date(reg.reviewedAt).toLocaleDateString("mn-MN", {
        year: "numeric", month: "2-digit", day: "2-digit",
      })
    : null;

  const handleReview = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const res = await adminFetch(`${API}/admin/association/registrations/${reg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          adminNote: adminNote.trim() || undefined,
          paymentStatus,
          paymentMethod,
          paymentAmount: Number(paymentAmount || 0),
          paymentReference: paymentReference.trim() || undefined,
          paymentNote: paymentNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.message || "Алдаа гарлаа"); return; }
      setOpen(false);
      onRefresh();
    } catch {
      setSaveError("Сүлжээний алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const StatusIcon = reg.status === "APPROVED"
    ? CheckCircle2
    : reg.status === "REJECTED"
    ? XCircle
    : Clock;

  return (
    <>
      {/* ── Card row ─────────────────────────────────────────── */}
      <div
        className={`group relative bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer ${
          reg.status === "PENDING"
            ? "border-amber-200 hover:border-amber-300"
            : reg.status === "APPROVED"
            ? "border-emerald-200 hover:border-emerald-300"
            : "border-slate-200 hover:border-slate-300"
        }`}
        onClick={() => setOpen(true)}
      >
        {/* left accent stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
          reg.status === "PENDING" ? "bg-amber-400"
          : reg.status === "APPROVED" ? "bg-emerald-500"
          : reg.status === "REJECTED" ? "bg-red-400"
          : "bg-slate-300"
        }`} />

        <div className="flex items-center gap-4 px-5 py-4 pl-6">
          {/* Avatar */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-black border-2 ${
            reg.status === "APPROVED"
              ? "bg-emerald-100 border-emerald-200 text-emerald-700"
              : reg.status === "REJECTED"
              ? "bg-slate-100 border-slate-200 text-slate-500"
              : "bg-indigo-100 border-indigo-200 text-indigo-700"
          }`}>
            {initials}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900">{fullName}</span>
              <MembershipTypeBadge type={reg.membershipType} size="sm" />
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 size={11} className="shrink-0" />{reg.organizationName}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Phone size={11} className="shrink-0" />{reg.phone}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar size={11} className="shrink-0" />{createdDate}
              </span>
              {price > 0 && (
                <span className="text-xs font-bold text-indigo-600">
                  {price.toLocaleString()}₮ · {durationLabel}
                </span>
              )}
              {price > 0 && (
                <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-bold rounded-full ${paymentStatusColor}`}>
                  <Banknote size={11} />
                  {paymentStatusLabel}
                </span>
              )}
            </div>
          </div>

          {/* Status + chevron */}
          <div className="flex items-center gap-3 shrink-0">
            <span className={`inline-flex items-center gap-1.5 border text-[11px] font-bold px-2.5 py-1 rounded-full ${statusCfg.color}`}>
              <StatusIcon size={11} />
              {statusCfg.label}
            </span>
            <ChevronRight
              size={16}
              className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Slide-over Drawer ────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative ml-auto w-full max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-[slideIn_0.25s_ease]">

            {/* Panel header */}
            <div className={`px-6 pt-6 pb-5 border-b border-slate-100 bg-gradient-to-br ${
              reg.status === "APPROVED" ? "from-emerald-50 to-white"
              : reg.status === "REJECTED" ? "from-red-50 to-white"
              : "from-indigo-50 to-white"
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black border-2 ${
                    reg.status === "APPROVED"
                      ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                      : reg.status === "REJECTED"
                      ? "bg-slate-100 border-slate-200 text-slate-500"
                      : "bg-indigo-100 border-indigo-200 text-indigo-700"
                  }`}>
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{fullName}</h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <MembershipTypeBadge type={reg.membershipType} />
                      <span className={`inline-flex items-center gap-1 border text-[11px] font-bold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                        <StatusIcon size={11} />{statusCfg.label}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Price pill */}
              {price > 0 && (
                <div className="mt-4 inline-flex items-center gap-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-xl px-3 py-1.5 text-sm font-bold shadow-sm">
                  <CreditCard size={14} />
                  {durationLabel} · {price.toLocaleString()}₮
                </div>
              )}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Contact & personal */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <User size={11} />Хувийн мэдээлэл
                </h3>
                <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                  <DetailField label="Овог нэр" value={fullName} icon={<User size={12} />} />
                  <DetailField label="Утас" value={reg.phone} icon={<Phone size={12} />} />
                  <DetailField label="Боловсрол" value={reg.education} icon={<GraduationCap size={12} />} />
                  <DetailField label="Мэргэжил" value={reg.profession} icon={<Briefcase size={12} />} />
                  <div className="col-span-2">
                    <DetailField label="Хаяг" value={reg.address} icon={<MapPin size={12} />} />
                  </div>
                </div>
              </section>

              {/* Organization */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <Building2 size={11} />Байгууллагын мэдээлэл
                </h3>
                <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <DetailField label="Байгууллагын нэр" value={reg.organizationName} icon={<Building2 size={12} />} />
                  </div>
                  <DetailField label="Байгуулагдсан он" value={reg.foundedYear} icon={<Calendar size={12} />} />
                  <DetailField label="Туршлага" value={reg.experience} icon={<Clock3 size={12} />} />
                  <div className="col-span-2">
                    <DetailField label="Үйл ажиллагааны чиглэл" value={reg.businessActivity} icon={<Briefcase size={12} />} />
                  </div>
                </div>
              </section>

              {/* Membership plan */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <BadgeCheck size={11} />Гишүүнчлэлийн мэдээлэл
                </h3>
                <div className={`rounded-2xl border p-4 ${typeCfg.color}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black">{typeCfg.label}</p>
                      <p className="text-xs opacity-75 mt-0.5">{typeCfg.description}</p>
                    </div>
                    {price > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-base font-black">{price.toLocaleString()}₮</p>
                        <p className="text-[11px] opacity-70">{durationLabel}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Payment */}
              {price > 0 && (
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <CreditCard size={11} />Төлбөрийн мэдээлэл
                  </h3>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-900">{price.toLocaleString()}₮</p>
                        <p className="text-xs font-semibold text-slate-400">{durationLabel}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 border px-2.5 py-1 text-[11px] font-bold rounded-full ${paymentStatusColor}`}>
                        <Banknote size={11} />
                        {paymentStatusLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <DetailField label="Төлбөрийн хэлбэр" value={reg.paymentMethod === "BANK_TRANSFER" ? "Банк шилжүүлэг" : reg.paymentMethod} icon={<CreditCard size={12} />} />
                      <DetailField label="Төлсөн огноо" value={reg.paidAt ? new Date(reg.paidAt).toLocaleDateString("mn-MN") : null} icon={<Calendar size={12} />} />
                      <div className="col-span-2">
                        <DetailField label="Гүйлгээний утга" value={reg.paymentReference} icon={<StickyNote size={12} />} />
                      </div>
                      <div className="col-span-2">
                        <DetailField label="Төлбөрийн тэмдэглэл" value={reg.paymentNote} icon={<StickyNote size={12} />} />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Timeline */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <Clock size={11} />Хугацаа
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <Calendar size={13} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">Бүртгүүлсэн огноо</p>
                      <p className="text-sm font-bold text-slate-800">{createdDate} · {createdTime}</p>
                    </div>
                  </div>
                  {reviewedDate && (
                    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                      reg.status === "APPROVED" ? "bg-emerald-50" : "bg-red-50"
                    }`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        reg.status === "APPROVED" ? "bg-emerald-100" : "bg-red-100"
                      }`}>
                        <StatusIcon size={13} className={reg.status === "APPROVED" ? "text-emerald-600" : "text-red-500"} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500">Шийдвэр гарсан огноо</p>
                        <p className="text-sm font-bold text-slate-800">{reviewedDate}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Admin note (read) */}
              {reg.adminNote && reg.status !== "PENDING" && (
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <StickyNote size={11} />Admin тэмдэглэл
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-amber-900">{reg.adminNote}</p>
                  </div>
                </section>
              )}
            </div>

            {/* ── Action footer ─── */}
            {showActionFooter && (
              <div className="border-t border-slate-100 bg-white px-6 py-5 space-y-3">
                {saveError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {saveError}
                  </div>
                )}

                {/* Approve / Reject toggle */}
                {canReview && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAction("APPROVED")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        action === "APPROVED"
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100"
                          : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      <Check size={15} />Зөвшөөрөх
                    </button>
                    <button
                      onClick={() => setAction("REJECTED")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        action === "REJECTED"
                          ? "bg-red-600 border-red-600 text-white shadow-md shadow-red-100"
                          : "bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                      }`}
                    >
                      <X size={15} />Татгалзах
                    </button>
                  </div>
                )}

                {price > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
                      <CreditCard size={13} />
                      Төлбөр бүртгэх
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold text-slate-500">Төлөв</span>
                        <select
                          value={paymentStatus}
                          onChange={(e) => setPaymentStatus(e.target.value as typeof paymentStatus)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold outline-none focus:border-indigo-400"
                        >
                          <option value="PENDING">Хүлээгдэж буй</option>
                          <option value="PAID">Төлсөн</option>
                          <option value="FAILED">Амжилтгүй</option>
                          <option value="REFUNDED">Буцаасан</option>
                          <option value="CANCELLED">Цуцалсан</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold text-slate-500">Хэлбэр</span>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold outline-none focus:border-indigo-400"
                        >
                          <option value="BANK_TRANSFER">Банк шилжүүлэг</option>
                          <option value="QPAY">QPay</option>
                          <option value="CARD">Карт</option>
                          <option value="CASH">Бэлэн</option>
                        </select>
                      </label>
                      <label className="col-span-2 block">
                        <span className="mb-1 block text-[10px] font-bold text-slate-500">Дүн</span>
                        <input
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value.replace(/[^\d]/g, ""))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-indigo-400"
                          placeholder="Төлбөрийн дүн"
                        />
                      </label>
                      <label className="col-span-2 block">
                        <span className="mb-1 block text-[10px] font-bold text-slate-500">Гүйлгээний утга / reference</span>
                        <input
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                          placeholder="Гүйлгээний утга"
                        />
                      </label>
                      <label className="col-span-2 block">
                        <span className="mb-1 block text-[10px] font-bold text-slate-500">Төлбөрийн тэмдэглэл</span>
                        <textarea
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          rows={2}
                          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                          placeholder="Банкны хуулга, transaction ID гэх мэт"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Note */}
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Admin тэмдэглэл — гишүүнд мэйлээр явна (заавал биш)"
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                />

                {/* Submit */}
                <button
                  onClick={handleReview}
                  disabled={saving}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-60 ${
                    action === "APPROVED"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100"
                      : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-100"
                  }`}
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : action === "APPROVED" ? <Check size={15} /> : <X size={15} />}
                  {saving
                    ? "Хадгалж байна..."
                    : canUpdatePayment
                      ? "Төлбөр баталгаажуулж идэвхжүүлэх"
                      : action === "APPROVED"
                        ? "Зөвшөөрөх"
                        : "Татгалзах"}
                </button>
              </div>
            )}

            {/* Reviewed footer (read-only status) */}
            {reg.status !== "PENDING" && !showActionFooter && (
              <div className={`border-t px-6 py-4 text-sm font-semibold flex items-center gap-2 ${
                reg.status === "APPROVED"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : "bg-red-50 border-red-100 text-red-600"
              }`}>
                <StatusIcon size={16} />
                {reg.status === "APPROVED" ? "Энэ бүртгэл зөвшөөрөгдсөн" : "Энэ бүртгэл татгалзагдсан"}
                {reviewedDate && <span className="ml-auto text-xs opacity-60">{reviewedDate}</span>}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
