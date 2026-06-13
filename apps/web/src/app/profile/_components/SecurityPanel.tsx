import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Shield,
} from "lucide-react";
import type { FormEvent } from "react";

type SecurityPanelProps = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrent: boolean;
  showNew: boolean;
  loading: boolean;
  success: string;
  error: string;
  onCurrentPassword: (value: string) => void;
  onNewPassword: (value: string) => void;
  onConfirmPassword: (value: string) => void;
  onToggleCurrent: () => void;
  onToggleNew: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function SecurityPanel({
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrent,
  showNew,
  loading,
  success,
  error,
  onCurrentPassword,
  onNewPassword,
  onConfirmPassword,
  onToggleCurrent,
  onToggleNew,
  onSubmit,
}: SecurityPanelProps) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-sm md:rounded-3xl md:p-6">
      <div className="mb-4 md:mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500 md:text-xs md:tracking-[0.22em]">
          Security
        </p>
        <h2 className="mt-1.5 text-xl font-black text-slate-950 md:mt-2 md:text-2xl">
          Нууц үг солих
        </h2>
        <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500 md:mt-2 md:text-sm">
          Account болон худалдан авсан файлуудаа хамгаалахын тулд хүчтэй нууц
          үг ашиглаарай.
        </p>
      </div>

      <form onSubmit={onSubmit} className="max-w-2xl space-y-4 md:space-y-5">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
            Одоогийн нууц үг
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => onCurrentPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
            />
            <button
              type="button"
              onClick={onToggleCurrent}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
            Шинэ нууц үг
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(event) => onNewPassword(event.target.value)}
              placeholder="Дор хаяж 6 тэмдэгт"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
            />
            <button
              type="button"
              onClick={onToggleNew}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
            Шинэ нууц үг давтах
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => onConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <Check size={16} />
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-orange-600 disabled:opacity-60 sm:w-auto md:py-4"
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Shield size={17} />}
          {loading ? "Солиж байна..." : "Нууц үг солих"}
        </button>
      </form>
    </section>
  );
}
