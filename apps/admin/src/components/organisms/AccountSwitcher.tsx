"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogIn, X, Check } from "lucide-react";
import { useAdminAuth, type StoredSession } from "@/lib/admin-auth";

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-rose-500",
  ADMIN: "bg-indigo-600",
  HR_ADMIN: "bg-violet-500",
  CONTENT_ADMIN: "bg-teal-500",
  PARTNER_ADMIN: "bg-amber-500",
  WAREHOUSE_ADMIN: "bg-sky-500",
  FINANCE_ADMIN: "bg-emerald-500",
  SERVICE_ADMIN: "bg-pink-500",
  LAWYER: "bg-fuchsia-500",
};

function getInitials(session: StoredSession) {
  const name = session.user.fullName || session.user.email;
  const parts = name.split(/[\s@]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AccountSwitcher() {
  const router = useRouter();
  const { user, sessions, switchSession, removeSession } = useAdminAuth();
  const [open, setOpen] = useState(false);

  if (sessions.length <= 1 && !open) {
    // Show "Бусад бүртгэл нэмэх" button only
    return (
      <button
        onClick={() => router.push("/login")}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
      >
        <LogIn size={14} />
        <span>Өөр бүртгэлээр нэвтрэх</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <div className="flex -space-x-1.5">
          {sessions.slice(0, 4).map((s) => (
            <div
              key={s.user.role}
              className={`h-5 w-5 rounded-full border-2 border-white text-[8px] font-bold text-white flex items-center justify-center ${ROLE_COLORS[s.user.role] || "bg-slate-400"}`}
            >
              {getInitials(s)}
            </div>
          ))}
        </div>
        <span className="flex-1 text-left truncate">{sessions.length} бүртгэл</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Нэвтэрсэн бүртгэлүүд
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {sessions.map((s) => {
                const isActive = s.user.role === user?.role;
                return (
                  <div
                    key={s.user.role}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-indigo-50"
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      switchSession(s.user.role);
                      setOpen(false);
                      router.push("/dashboard");
                      router.refresh();
                    }}
                  >
                    <div
                      className={`h-8 w-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 ${ROLE_COLORS[s.user.role] || "bg-slate-400"}`}
                    >
                      {getInitials(s)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {s.user.fullName || s.user.email}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400 truncate">
                        {s.user.roleLabel || s.user.role}
                      </p>
                    </div>
                    {isActive && (
                      <Check size={16} className="text-indigo-600 shrink-0" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSession(s.user.role);
                      }}
                      className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      title="Энэ бүртгэлийг устгах"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 px-3 py-2">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/login");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <LogIn size={14} />
                <span>Өөр бүртгэлээр нэвтрэх</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
