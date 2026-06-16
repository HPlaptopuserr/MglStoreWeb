"use client";

import {
  AlertCircle,
  Camera,
  Check,
  Pencil,
  Loader2,
  Mail,
  Phone,
  Save,
  User,
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { resolveApiAssetUrl } from "@/lib/api";
import type { ProfileFormState } from "./types";

type ProfileInfoPanelProps = {
  form: ProfileFormState;
  saving: boolean;
  uploading: boolean;
  saved: boolean;
  error: string;
  onChange: (patch: Partial<ProfileFormState>) => void;
  onAvatarUpload: (file: File) => void;
  onSubmit: (event: FormEvent) => void;
};

export function ProfileInfoPanel({
  form,
  saving,
  uploading,
  saved,
  error,
  onChange,
  onAvatarUpload,
  onSubmit,
}: ProfileInfoPanelProps) {
  const [editing, setEditing] = useState(false);
  const initials =
    form.fullName.trim()[0]?.toUpperCase() ||
    form.email.trim()[0]?.toUpperCase() ||
    "?";

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-sm md:rounded-3xl md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between md:mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500 md:text-xs md:tracking-[0.22em]">
            Profile
          </p>
          <h2 className="mt-1.5 text-xl font-black text-slate-950 md:mt-2 md:text-2xl">
            Хувийн мэдээлэл
          </h2>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500 md:mt-2 md:text-sm">
            Захиалга, төлбөртэй файл, үйлчилгээний хүсэлт дээр ашиглагдах үндсэн
            мэдээлэл.
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 sm:w-auto"
          >
            <Pencil size={16} />
            Засах
          </button>
        )}
      </div>

      {!editing ? (
        <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
          <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm">
              <ProfileImagePreview
                avatarUrl={form.avatarUrl}
                initials={initials}
                className="text-3xl"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ProfileReadonlyItem
              label="Овог нэр"
              value={form.fullName || "Бөглөөгүй"}
            />
            <ProfileReadonlyItem
              label="И-мэйл"
              value={form.email || "Бөглөөгүй"}
            />
            <ProfileReadonlyItem
              label="Утас"
              value={form.phone || "Бөглөөгүй"}
            />
          </div>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="grid gap-4 lg:grid-cols-[240px_1fr] lg:gap-6"
        >
          <div className="rounded-[20px] bg-slate-50 p-4 text-center md:rounded-3xl md:p-5">
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-[20px] bg-slate-950 text-white shadow-sm md:h-32 md:w-32 md:rounded-3xl">
              <ProfileImagePreview
                avatarUrl={form.avatarUrl}
                initials={initials}
                className="text-4xl md:text-5xl"
              />
            </div>
            <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-orange-50 sm:w-auto md:mt-4">
              {uploading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Camera size={17} />
              )}
              Зураг оруулах
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onAvatarUpload(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
              JPG, PNG, WEBP · 5MB хүртэл
            </p>
          </div>

          <div className="space-y-4 md:space-y-5">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Овог нэр
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    onChange({ fullName: event.target.value })
                  }
                  placeholder="Таны овог нэр"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                  И-мэйл
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      onChange({ email: event.target.value })
                    }
                    placeholder="name@mail.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Утас
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      onChange({ phone: event.target.value })
                    }
                    placeholder="99112233"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <Check size={16} />
                Мэдээлэл хадгалагдлаа
              </div>
            )}

            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:opacity-60 sm:w-auto"
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              {saving ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function ProfileImagePreview({
  avatarUrl,
  className,
  initials,
}: {
  avatarUrl?: string | null;
  className?: string;
  initials: string;
}) {
  const [failed, setFailed] = useState(false);
  const imageSrc = avatarUrl && !failed ? resolveApiAssetUrl(avatarUrl) : "";

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt="Profile зураг"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center font-black ${className || ""}`}
    >
      {initials}
    </div>
  );
}

function ProfileReadonlyItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
