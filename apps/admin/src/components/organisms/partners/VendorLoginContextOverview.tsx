import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Crown,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

type VendorLoginMember = {
  id: string;
  role: string;
  isPrimary?: boolean;
  memberActive?: boolean;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  isActive?: boolean;
  hasPassword?: boolean;
  canLogin?: boolean;
  loginIdentifier?: string | null;
};

type PartnerLoginContext = {
  email?: string | null;
  phone?: string | null;
  stats?: { users?: number };
};

const roleLabel: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

function getInitials(member: VendorLoginMember) {
  const base = member.fullName || member.email || "?";
  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

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
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {icon}
        {label}
      </div>
      <p className="break-all text-base font-black leading-6 text-slate-950">
        {value || <span className="text-sm text-slate-400">{muted || "Оруулаагүй"}</span>}
      </p>
    </div>
  );
}

function LoginReadinessBadge({ member }: { member: VendorLoginMember }) {
  const active = Boolean(member.isActive && member.memberActive !== false);
  const ready = Boolean(member.canLogin ?? (active && member.hasPassword && (member.email || member.phone)));

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] ${
        ready
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {ready ? <CheckCircle2 size={13} /> : <KeyRound size={13} />}
      {ready ? "Organization context OK" : "Invite / password хэрэгтэй"}
    </span>
  );
}

function ActiveBadge({ member }: { member: VendorLoginMember }) {
  const active = Boolean(member.isActive && member.memberActive !== false);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] ${
        active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
      }`}
    >
      {active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {active ? "Идэвхтэй member" : "Идэвхгүй"}
    </span>
  );
}

function LoginMemberCard({ member }: { member: VendorLoginMember }) {
  return (
    <article className="rounded-3xl border border-white bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-base font-black text-white shadow-sm">
          {getInitials(member)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-lg font-black text-slate-950">
              {member.fullName || "Нэргүй хэрэглэгч"}
            </h4>
            {member.isPrimary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800">
                <Crown size={12} />
                Owner
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
              {roleLabel[member.role] ?? member.role}
            </span>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ContextField icon={<Mail size={13} />} label="Login email" value={member.email} muted="Email алга" />
            <ContextField icon={<Phone size={13} />} label="Login утас" value={member.phone} muted="Утас алга" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ActiveBadge member={member} />
            <LoginReadinessBadge member={member} />
          </div>

          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            Энэ user vendor/org дээр нэвтрэхэд token нь тухайн байгууллагын
            `OrganizationMember` role болон account context-тэй үүснэ.
          </p>
        </div>
      </div>
    </article>
  );
}

export function VendorLoginContextOverview({
  members,
  partner,
}: {
  members: VendorLoginMember[];
  partner: PartnerLoginContext;
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
    <div className="space-y-4">
      <section className="rounded-3xl border border-indigo-200 bg-indigo-50/75 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">
              <ShieldCheck size={14} />
              OrganizationMember login context
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">
              {members.length > 0
                ? `${members.length} login user бүртгэлтэй`
                : "Login user хараахан үүсээгүй"}
            </h3>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Доорх user өөрийн login email/утас болон password-оор vendor эсвэл
              org дээр нэвтрэхэд энэ байгууллагын account context руу орно.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:w-80">
            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-indigo-100">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Нийт эрх
              </p>
              <p className="text-3xl font-black text-indigo-700">{members.length}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-emerald-100">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Login ready
              </p>
              <p className="text-3xl font-black text-emerald-700">{readyCount}</p>
            </div>
          </div>
        </div>

        {members.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {members.map((member) => (
              <LoginMemberCard key={`context:${member.id}`} member={member} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-indigo-200 bg-white p-6 text-center">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950">
            <Building2 size={18} className="text-slate-500" />
            Байгууллагын мэдээлэл
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ContextField icon={<Mail size={13} />} label="Контакт и-мэйл" value={partner.email} />
            <ContextField icon={<Phone size={13} />} label="Контакт утас" value={partner.phone} />
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
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

      <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold leading-7 text-amber-900">
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
