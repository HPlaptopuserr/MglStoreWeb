"use client";

import { useState } from "react";
import {
  Phone,
  Building2,
  Briefcase,
  Calendar,
  MapPin,
  GraduationCap,
  Clock3,
  Check,
  X,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  CreditCard,
  StickyNote,
  User,
  BadgeCheck,
  Banknote,
  BadgePercent,
} from "lucide-react";
import { MembershipTypeBadge } from "./MembershipTypeBadge";
import {
  MEMBERSHIP_TYPES,
  STATUS_CONFIG,
  type MembershipTypeKey,
} from "./membership-constants";
import {
  PAYMENT_STATUS_BADGE_LABELS,
  PAYMENT_STATUS_COLORS,
  type AssociationPaymentStatus,
} from "./payment-status";
import { API, adminFetch } from "@/lib/api";

type ReviewAction = "APPROVED" | "REJECTED";

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
  paymentStatus: AssociationPaymentStatus;
  paymentMethod: "CASH" | "CARD" | "QPAY" | "BANK_TRANSFER" | null;
  paymentReference: string | null;
  paymentNote: string | null;
  paidAt: string | null;
  agentCode: string | null;
  agentCommissionAmount: number;
  agentCommissionStatus: "PENDING" | "APPROVED" | "PAID" | "CANCELLED" | null;
  agent: {
    id: string;
    code: string;
    fullName: string;
    commissionRate: number | string;
  } | null;
  referralCommission: {
    id: string;
    commissionAmount: number;
    commissionRate: number | string;
    status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
    paidAt: string | null;
  } | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface Props {
  registration: AssociationRegistration;
  onRefresh: () => void;
}

function DetailField({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-800 flex items-start gap-1.5">
        {icon && <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>}
        {value}
      </span>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function MemberRegistrationCard({
  registration: reg,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [adminNote, setAdminNote] = useState(reg.adminNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const typeCfg = MEMBERSHIP_TYPES[reg.membershipType];
  const statusCfg = STATUS_CONFIG[reg.status] ?? STATUS_CONFIG.PENDING;

  const duration = typeCfg?.durations.find(
    (d) => d.months === reg.durationMonths,
  );
  const durationLabel =
    duration?.label ??
    (reg.durationMonths ? `${reg.durationMonths} сар` : "Үнэгүй");
  const price = reg.paymentAmount || duration?.price || 0;
  const canReview = reg.status === "PENDING";
  const showActionFooter = canReview;
  const paymentStatus = reg.paymentStatus ?? "PENDING";
  const paymentStatusLabel = PAYMENT_STATUS_BADGE_LABELS[paymentStatus];
  const paymentStatusColor = PAYMENT_STATUS_COLORS[paymentStatus];

  const fullName = `${reg.lastName} ${reg.firstName}`;
  const initials = `${reg.lastName[0] ?? ""}${reg.firstName[0] ?? ""}`;

  const createdDateTime = formatDateTime(reg.createdAt);
  const reviewedDateTime = formatDateTime(reg.reviewedAt);

  const handleReview = async (action: ReviewAction) => {
    setSaveError(null);
    setSaving(true);
    try {
      const res = await adminFetch(
        `${API}/admin/association/registrations/${reg.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: action,
            adminNote: adminNote.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.message || "Алдаа гарлаа");
        return;
      }
      setOpen(false);
      onRefresh();
    } catch {
      setSaveError("Сүлжээний алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const StatusIcon =
    reg.status === "APPROVED"
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
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
            reg.status === "PENDING"
              ? "bg-amber-400"
              : reg.status === "APPROVED"
                ? "bg-emerald-500"
                : reg.status === "REJECTED"
                  ? "bg-red-400"
                  : "bg-slate-300"
          }`}
        />

        <div className="flex items-center gap-4 px-5 py-4 pl-6">
          {/* Avatar */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-black border-2 ${
              reg.status === "APPROVED"
                ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                : reg.status === "REJECTED"
                  ? "bg-slate-100 border-slate-200 text-slate-500"
                  : "bg-indigo-100 border-indigo-200 text-indigo-700"
            }`}
          >
            {initials}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900">
                {fullName}
              </span>
              <MembershipTypeBadge type={reg.membershipType} size="sm" />
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 size={11} className="shrink-0" />
                {reg.organizationName}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Phone size={11} className="shrink-0" />
                {reg.phone}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar size={11} className="shrink-0" />
                {createdDateTime}
              </span>
              {price > 0 && (
                <span className="text-xs font-bold text-indigo-600">
                  {price.toLocaleString()}₮ · {durationLabel}
                </span>
              )}
              {price > 0 && (
                <span
                  className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-bold rounded-full ${paymentStatusColor}`}
                >
                  <Banknote size={11} />
                  {paymentStatusLabel}
                </span>
              )}
              {reg.agentCode && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                  <BadgePercent size={11} />
                  {reg.agentCode}
                </span>
              )}
            </div>
          </div>

          {/* Status + chevron */}
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 border text-[11px] font-bold px-2.5 py-1 rounded-full ${statusCfg.color}`}
            >
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

      {/* ── Review popup ─────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-[popupIn_0.2s_ease] sm:max-h-[calc(100dvh-3rem)]">
            {/* Panel header */}
            <div
              className={`shrink-0 border-b border-slate-100 bg-gradient-to-br px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6 ${
                reg.status === "APPROVED"
                  ? "from-emerald-50 to-white"
                  : reg.status === "REJECTED"
                    ? "from-red-50 to-white"
                    : "from-indigo-50 to-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black border-2 ${
                      reg.status === "APPROVED"
                        ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                        : reg.status === "REJECTED"
                          ? "bg-slate-100 border-slate-200 text-slate-500"
                          : "bg-indigo-100 border-indigo-200 text-indigo-700"
                    }`}
                  >
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      {fullName}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <MembershipTypeBadge type={reg.membershipType} />
                      <span
                        className={`inline-flex items-center gap-1 border text-[11px] font-bold px-2 py-0.5 rounded-full ${statusCfg.color}`}
                      >
                        <StatusIcon size={11} />
                        {statusCfg.label}
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
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              {/* Contact & personal */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <User size={11} />
                  Хувийн мэдээлэл
                </h3>
                <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                  <DetailField
                    label="Овог нэр"
                    value={fullName}
                    icon={<User size={12} />}
                  />
                  <DetailField
                    label="Утас"
                    value={reg.phone}
                    icon={<Phone size={12} />}
                  />
                  <DetailField
                    label="Боловсрол"
                    value={reg.education}
                    icon={<GraduationCap size={12} />}
                  />
                  <DetailField
                    label="Мэргэжил"
                    value={reg.profession}
                    icon={<Briefcase size={12} />}
                  />
                  <div className="col-span-2">
                    <DetailField
                      label="Хаяг"
                      value={reg.address}
                      icon={<MapPin size={12} />}
                    />
                  </div>
                </div>
              </section>

              {/* Organization */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <Building2 size={11} />
                  Байгууллагын мэдээлэл
                </h3>
                <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <DetailField
                      label="Байгууллагын нэр"
                      value={reg.organizationName}
                      icon={<Building2 size={12} />}
                    />
                  </div>
                  <DetailField
                    label="Байгуулагдсан он"
                    value={reg.foundedYear}
                    icon={<Calendar size={12} />}
                  />
                  <DetailField
                    label="Туршлага"
                    value={reg.experience}
                    icon={<Clock3 size={12} />}
                  />
                  <div className="col-span-2">
                    <DetailField
                      label="Үйл ажиллагааны чиглэл"
                      value={reg.businessActivity}
                      icon={<Briefcase size={12} />}
                    />
                  </div>
                </div>
              </section>

              {/* Membership plan */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <BadgeCheck size={11} />
                  Гишүүнчлэлийн мэдээлэл
                </h3>
                <div className={`rounded-2xl border p-4 ${typeCfg.color}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black">{typeCfg.label}</p>
                      <p className="text-xs opacity-75 mt-0.5">
                        {typeCfg.description}
                      </p>
                    </div>
                    {price > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-base font-black">
                          {price.toLocaleString()}₮
                        </p>
                        <p className="text-[11px] opacity-70">
                          {durationLabel}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Payment */}
              {price > 0 && (
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <CreditCard size={11} />
                    Төлбөрийн мэдээлэл
                  </h3>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-900">
                          {price.toLocaleString()}₮
                        </p>
                        <p className="text-xs font-semibold text-slate-400">
                          {durationLabel}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 border px-2.5 py-1 text-[11px] font-bold rounded-full ${paymentStatusColor}`}
                      >
                        <Banknote size={11} />
                        {paymentStatusLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <DetailField
                        label="Төлбөрийн хэлбэр"
                        value={
                          reg.paymentMethod === "BANK_TRANSFER"
                            ? "Банк шилжүүлэг"
                            : reg.paymentMethod
                        }
                        icon={<CreditCard size={12} />}
                      />
                      <DetailField
                        label="Төлсөн огноо"
                        value={
                          reg.paidAt
                            ? new Date(reg.paidAt).toLocaleDateString("mn-MN")
                            : null
                        }
                        icon={<Calendar size={12} />}
                      />
                      <div className="col-span-2">
                        <DetailField
                          label="Гүйлгээний утга"
                          value={reg.paymentReference}
                          icon={<StickyNote size={12} />}
                        />
                      </div>
                      <div className="col-span-2">
                        <DetailField
                          label="Төлбөрийн тэмдэглэл"
                          value={reg.paymentNote}
                          icon={<StickyNote size={12} />}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {reg.agentCode && (
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <BadgePercent size={11} />
                    Зөвлөхийн бүртгэл
                  </h3>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <DetailField
                        label="Зөвлөхийн code"
                        value={reg.agentCode}
                        icon={<BadgePercent size={12} />}
                      />
                      <DetailField
                        label="Зөвлөх"
                        value={reg.agent?.fullName || null}
                        icon={<User size={12} />}
                      />
                      <DetailField
                        label="Урамшууллын хувь"
                        value={
                          reg.referralCommission
                            ? `${Number(reg.referralCommission.commissionRate).toLocaleString()}%`
                            : reg.agent?.commissionRate
                              ? `${Number(reg.agent.commissionRate).toLocaleString()}%`
                              : null
                        }
                        icon={<BadgePercent size={12} />}
                      />
                      <DetailField
                        label="Урамшууллын дүн"
                        value={
                          reg.referralCommission
                            ? `${reg.referralCommission.commissionAmount.toLocaleString()}₮`
                            : reg.agentCommissionAmount
                              ? `${reg.agentCommissionAmount.toLocaleString()}₮`
                              : null
                        }
                        icon={<Banknote size={12} />}
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Timeline */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <Clock size={11} />
                  Хугацаа
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <Calendar size={13} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Хүсэлт ирсэн хугацаа
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {createdDateTime}
                      </p>
                    </div>
                  </div>
                  {reviewedDateTime && (
                    <div
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                        reg.status === "APPROVED"
                          ? "bg-emerald-50"
                          : "bg-red-50"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          reg.status === "APPROVED"
                            ? "bg-emerald-100"
                            : "bg-red-100"
                        }`}
                      >
                        <StatusIcon
                          size={13}
                          className={
                            reg.status === "APPROVED"
                              ? "text-emerald-600"
                              : "text-red-500"
                          }
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500">
                          Шийдвэр гарсан огноо
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                          {reviewedDateTime}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Admin note (read) */}
              {reg.adminNote && reg.status !== "PENDING" && (
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <StickyNote size={11} />
                    Admin тэмдэглэл
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-amber-900">{reg.adminNote}</p>
                  </div>
                </section>
              )}
              {/* ── Action footer ─── */}
              {showActionFooter && (
                <div className="space-y-4 border-t border-slate-100 bg-white px-6 py-5">
                  {saveError && (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      {saveError}
                    </div>
                  )}

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Admin тэмдэглэл / татгалзсан шалтгаан
                    </span>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Жишээ: Төлбөр шалгасан, мэдээлэл бүрэн"
                      rows={2}
                      className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      onClick={() => handleReview("REJECTED")}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-white py-3 text-sm font-black text-red-600 transition-all hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <X size={15} />
                      )}
                      Татгалзах
                    </button>
                    <button
                      onClick={() => handleReview("APPROVED")}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      {reg.paymentStatus === "PAID"
                        ? "Зөвшөөрч member идэвхжүүлэх"
                        : "Зөвшөөрөх"}
                    </button>
                  </div>
                </div>
              )}

              {/* Reviewed footer (read-only status) */}
              {reg.status !== "PENDING" && !showActionFooter && (
                <div
                  className={`border-t px-6 py-4 text-sm font-semibold flex items-center gap-2 ${
                    reg.status === "APPROVED"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                      : "bg-red-50 border-red-100 text-red-600"
                  }`}
                >
                  <StatusIcon size={16} />
                  {reg.status === "APPROVED"
                    ? "Энэ бүртгэл зөвшөөрөгдсөн"
                    : "Энэ бүртгэл татгалзагдсан"}
                  {reviewedDateTime && (
                    <span className="ml-auto text-xs opacity-60">
                      {reviewedDateTime}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes popupIn {
          from {
            transform: translateY(8px) scale(0.98);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
