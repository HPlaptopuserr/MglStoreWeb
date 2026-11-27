"use client";

import { useState } from "react";
import { Mail, Phone, UserRound } from "lucide-react";
import { SharedStoreLogin } from "@/features/shared-store/SharedStoreLogin";
import { useAuth } from "@/lib/auth-context";
import { StudyTeacherAvatar } from "./StudyTeacherAvatar";

export function StudyProfile() {
  const { user, loading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const name = user?.fullName?.trim() || "Хэрэглэгч";

  return (
    <section aria-labelledby="study-profile-title" className="mx-auto max-w-xl">
      <h2
        id="study-profile-title"
        className="mb-5 text-3xl font-bold tracking-tight"
      >
        Миний профайл
      </h2>
      {loading ? (
        <p role="status">Профайл ачаалж байна…</p>
      ) : user ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex items-center gap-4 bg-teal-950 p-5 text-white">
            <StudyTeacherAvatar
              teacher={{ name, imageUrl: user.avatarUrl || undefined }}
              className="size-16 rounded-2xl text-xl"
            />
            <h3 className="min-w-0 break-words text-2xl font-bold">{name}</h3>
          </div>
          <dl className="divide-y divide-slate-100 px-5">
            {[
              { Icon: Phone, label: "Утас", value: user.phone },
              { Icon: Mail, label: "Имэйл", value: user.email },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 py-4">
                <Icon
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-teal-800"
                />
                <div className="min-w-0">
                  <dt className="text-sm text-slate-600">{label}</dt>
                  <dd className="break-words font-semibold">
                    {value || "Бүртгээгүй"}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <UserRound
            size={36}
            aria-hidden="true"
            className="mb-4 text-teal-800"
          />
          <p className="mb-5 text-slate-700">
            Профайлаа харахын тулд MGL Store бүртгэлээрээ нэвтэрнэ үү.
          </p>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="min-h-12 w-full rounded-xl bg-teal-800 px-4 font-semibold text-white"
          >
            Нэвтрэх / Бүртгүүлэх
          </button>
          {loginOpen && (
            <SharedStoreLogin
              onClose={() => setLoginOpen(false)}
              onSuccess={() => setLoginOpen(false)}
            />
          )}
        </div>
      )}
    </section>
  );
}
