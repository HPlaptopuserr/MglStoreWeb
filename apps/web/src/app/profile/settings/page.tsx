"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BadgeCent,
  Banknote,
  ChevronLeft,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AddressConsentPanel } from "../_components/AddressConsentPanel";
import { ProfileInfoPanel } from "../_components/ProfileInfoPanel";
import { SecurityPanel } from "../_components/SecurityPanel";
import {
  createAddressPatch,
  createEmptyAddressPatch,
  createProfileFormState,
  type ProfileFormState,
} from "../_components/types";

type SettingsSection = "profile" | "address" | "security";

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
};

const sections: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    id: "profile",
    label: "Хувийн мэдээлэл",
    description: "Нэр, зураг, холбоо барих",
    icon: UserRound,
  },
  {
    id: "address",
    label: "Хаяг ба зөвшөөрөл",
    description: "Хүргэлтийн хаяг, нөхцөл",
    icon: MapPin,
  },
  {
    id: "security",
    label: "Нууцлал",
    description: "Нууц үг, хамгаалалт",
    icon: Lock,
  },
];

const comingSoon = [
  {
    title: "Карт холбох",
    description: "Visa, Mastercard болон банкны картыг account дээр хадгалах.",
    icon: CreditCard,
  },
  {
    title: "Зээлийн боломж",
    description: "BNPL, байгууллагын зээл болон хэсэгчлэн төлөх шийдлүүд.",
    icon: BadgeCent,
  },
  {
    title: "Төлбөрийн тохиргоо",
    description: "Үндсэн төлбөрийн хэрэгсэл, invoice болон баримтын тохиргоо.",
    icon: Banknote,
  },
  {
    title: "Нэвтрэх төхөөрөмжүүд",
    description: "Утас, browser, төхөөрөмжийн session удирдах.",
    icon: Smartphone,
  },
];

function SettingsLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );
}

export default function ProfileSettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <ProfileSettingsContent />
    </Suspense>
  );
}

function ProfileSettingsContent() {
  const { user, loading, updateUser, refreshUser, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<SettingsSection>("profile");
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const requested = searchParams.get("section") || searchParams.get("tab");
    if (requested && sections.some((item) => item.id === requested)) {
      setSection(requested as SettingsSection);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (user) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) setForm(createProfileFormState(user));
  }, [user]);

  if (loading || !form) {
    return <SettingsLoading />;
  }

  if (!user) return null;

  const updateForm = (patch: Partial<ProfileFormState>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaved(false);
    setProfileError("");
  };

  const saveProfile = async () => {
    if (!form.acceptTerms) {
      setProfileError("Үйлчилгээний нөхцөлийг зөвшөөрөх шаардлагатай.");
      setSection("address");
      return;
    }

    setSaving(true);
    setSaved(false);
    setProfileError("");
    try {
      const res = await authFetch(`${API_BASE}/auth/web/profile`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          avatarUrl: form.avatarUrl || null,
          acceptTerms: form.acceptTerms,
          marketingConsent: form.marketingConsent,
          address: {
            id: form.addressId || undefined,
            fullAddress: form.fullAddress,
            city: form.city,
            district: form.district,
            khoroo: form.khoroo,
            entrance: form.entrance,
            apartment: form.apartment,
            lat: form.lat,
            lng: form.lng,
            isDefault: form.addressIsDefault,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(data?.message || "Мэдээлэл хадгалахад алдаа гарлаа");
        return;
      }
      updateUser(data);
      setForm(createProfileFormState(data));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setProfileError("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const requestSave = (event: FormEvent, target: SettingsSection) => {
    event.preventDefault();
    setConfirmAction({
      title:
        target === "profile"
          ? "Хувийн мэдээллээ хадгалах уу?"
          : "Хаяг ба зөвшөөрлийн мэдээллээ хадгалах уу?",
      description:
        target === "profile"
          ? "Нэр, зураг болон холбоо барих мэдээлэл шинэчлэгдэнэ."
          : "Хүргэлтийн хаяг, үйлчилгээний нөхцөл болон мэдэгдлийн тохиргоо хадгалагдана.",
      confirmLabel: "Хадгалах",
      onConfirm: saveProfile,
    });
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setProfileError("");
    try {
      const body = new FormData();
      body.append("avatar", file);
      const res = await authFetch(`${API_BASE}/auth/web/profile/avatar`, {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.avatarUrl) {
        setProfileError(data?.message || "Зураг upload хийхэд алдаа гарлаа");
        return;
      }
      updateForm({ avatarUrl: data.avatarUrl });
      updateUser({ avatarUrl: data.avatarUrl });
    } catch {
      setProfileError("Зураг upload хийхэд алдаа гарлаа");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const changePassword = async () => {
    setChangingPassword(true);
    try {
      const res = await authFetch(`${API_BASE}/auth/web/change-password`, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(data?.message || "Нууц үг солиход алдаа гарлаа");
        return;
      }
      setPasswordSuccess(data.message || "Нууц үг амжилттай солигдлоо");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch {
      setPasswordError("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setChangingPassword(false);
    }
  };

  const requestPasswordChange = (event: FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Бүх талбарыг бөглөнө үү");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Шинэ нууц үг дор хаяж 6 тэмдэгт байх ёстой");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Шинэ нууц үгүүд таарахгүй байна");
      return;
    }

    setConfirmAction({
      title: "Нууц үгээ солих уу?",
      description: "Дараагийн нэвтрэлтээс шинэ нууц үг ашиглагдана.",
      confirmLabel: "Нууц үг солих",
      tone: "danger",
      onConfirm: changePassword,
    });
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    setConfirming(true);
    try {
      await confirmAction.onConfirm();
      setConfirmAction(null);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_48%,#f8fafc_100%)] px-4 py-6 text-slate-950 md:py-10">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/profile"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm"
          >
            <ChevronLeft size={17} />
            Profile
          </Link>
          <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700 ring-1 ring-orange-100">
            Account settings
          </span>
        </div>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.06)] md:p-5">
          <div className="mb-4">
            <h1 className="text-2xl font-black text-slate-950 md:text-3xl">
              Тохиргоо
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Account-ийн үндсэн мэдээлэл, хүргэлт, нууцлал болон удахгүй нэмэгдэх
              төлбөрийн боломжууд.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {sections.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex min-h-[68px] items-center gap-3 rounded-2xl border px-3 text-left transition ${
                    active
                      ? "border-orange-200 bg-orange-50 text-slate-950"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      active ? "bg-orange-500 text-white" : "bg-white text-slate-500"
                    }`}
                  >
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {item.label}
                    </span>
                    <span className="mt-0.5 hidden truncate text-xs font-semibold text-slate-400 sm:block">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {section === "profile" && (
          <ProfileInfoPanel
            form={form}
            saving={saving}
            uploading={uploadingAvatar}
            saved={saved}
            error={profileError}
            onChange={updateForm}
            onAvatarUpload={uploadAvatar}
            onSubmit={(event) => requestSave(event, "profile")}
          />
        )}

        {section === "address" && (
          <AddressConsentPanel
            form={form}
            addresses={user.addresses || (user.defaultAddress ? [user.defaultAddress] : [])}
            saving={saving}
            saved={saved}
            error={profileError}
            onChange={updateForm}
            onSelectAddress={(address) => updateForm(createAddressPatch(address))}
            onNewAddress={() => updateForm(createEmptyAddressPatch())}
            onSubmit={(event) => requestSave(event, "address")}
          />
        )}

        {section === "security" && (
          <SecurityPanel
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            showCurrent={showCurrent}
            showNew={showNew}
            loading={changingPassword}
            success={passwordSuccess}
            error={passwordError}
            onCurrentPassword={setCurrentPassword}
            onNewPassword={setNewPassword}
            onConfirmPassword={setConfirmPassword}
            onToggleCurrent={() => setShowCurrent((value) => !value)}
            onToggleNew={() => setShowNew((value) => !value)}
            onSubmit={requestPasswordChange}
          />
        )}

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-orange-200">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Дараагийн боломжууд
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Том online дэлгүүрүүдийн түгээмэл account logic-ууд.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {comingSoon.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                      <Icon size={19} />
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                      Тун удахгүй
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <ConfirmActionDialog
        action={confirmAction}
        loading={confirming}
        onCancel={() => {
          if (!confirming) setConfirmAction(null);
        }}
        onConfirm={runConfirmedAction}
      />
    </main>
  );
}

function ConfirmActionDialog({
  action,
  loading,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;

  const isDanger = action.tone === "danger";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
        <div className="p-6">
          <div
            className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
              isDanger
                ? "bg-red-50 text-red-600"
                : "bg-orange-50 text-orange-600"
            }`}
          >
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-xl font-black text-slate-950">{action.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {action.description}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {action.cancelLabel || "Буцах"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white shadow-sm transition disabled:opacity-60 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
