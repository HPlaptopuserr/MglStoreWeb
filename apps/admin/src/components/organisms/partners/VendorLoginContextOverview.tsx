import {
  AlertCircle,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  PartnerForLoginAccounts,
  VendorLoginMember,
} from "./vendor-login-types";

function ContextField({
  icon,
  label,
  value,
  muted,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
  muted?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="mb-1.5 flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="truncate text-sm font-black leading-6 text-slate-950" title={value || undefined}>
        {value || <span className="text-sm text-slate-400">{muted || "Оруулаагүй"}</span>}
      </p>
    </div>
  );
}

export function VendorLoginContextOverview({
  members,
  partner,
}: {
  members: VendorLoginMember[];
  partner: PartnerForLoginAccounts;
}) {
  const reportedUsers = partner.stats?.users ?? members.length;
  const primaryOwner =
    members.find((member) => member.isPrimary || member.role === "OWNER") ??
    members[0];
  const readyCount = members.filter((member) =>
    Boolean(
      member.canLogin ??
        (member.isActive && member.memberActive !== false && member.hasPassword && (member.email || member.phone)),
    ),
  ).length;

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
              <ShieldCheck size={14} />
              Login context
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-950">
              {members.length > 0
                ? `${members.length} login user бүртгэлтэй`
                : "Login user хараахан үүсээгүй"}
            </h3>
            <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-600">
              User vendor/org дээр нэвтрэхэд энэ байгууллагын account context шууд оноогдоно.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:w-64">
            <div className="rounded-xl bg-white px-3 py-2.5 text-center shadow-sm ring-1 ring-indigo-100">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Нийт эрх
              </p>
              <p className="text-2xl font-black text-indigo-700">{members.length}</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2.5 text-center shadow-sm ring-1 ring-emerald-100">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Login ready
              </p>
              <p className="text-2xl font-black text-emerald-700">{readyCount}</p>
            </div>
          </div>
        </div>

        {members.length === 0 && (
          <div className="mt-3 rounded-2xl border border-dashed border-indigo-200 bg-white p-4 text-center">
            <UserRound className="mx-auto mb-3 h-10 w-10 text-indigo-200" />
            <p className="text-sm font-black text-slate-950">
              Энэ байгууллагад login user одоогоор харагдахгүй байна.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
              “Login эрх олгох” товчоор owner/admin user үүсгэнэ.
              {reportedUsers > 0 &&
                " Stats дээр хэрэглэгч байгаа боловч login members API-аас ирээгүй байна. Серверээ refresh/restart хийсний дараа дахин шалгана уу."}
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950">
            <Building2 size={18} className="text-slate-500" />
            Байгууллагын мэдээлэл
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ContextField icon={<Mail size={13} />} label="Контакт и-мэйл" value={partner.email} />
            <ContextField icon={<Phone size={13} />} label="Контакт утас" value={partner.phone} />
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-lg font-black text-emerald-950">
            <UserRound size={18} className="text-emerald-600" />
            Нэвтрэх хэрэглэгч
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ContextField icon={<Mail size={13} />} label="Login и-мэйл" value={primaryOwner?.email} />
            <ContextField icon={<Phone size={13} />} label="Login утас" value={primaryOwner?.phone} muted="Owner login утас алга" />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
        <div className="flex gap-3">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <p>
            Vendor/org login дээр “хэрэглэгч олдсонгүй” гэж гарвал байгууллагын
            контакт утас/и-мэйл биш, энэ card дээрх login email/phone-г ашиглаж
            байгаа эсэхийг шалгана.
          </p>
        </div>
      </section>
    </div>
  );
}
