"use client";

import { useState } from "react";
import {
  Crown,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CalendarDays,
  FileText,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

type Plan = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  isTrial: boolean;
  badge?: string;
};

type Props = {
  orgId: string;
  orgName: string;
  plans: Plan[];
  onSuccess: () => void;
  onClose: () => void;
};

const PLAN_ICONS: Record<string, string> = {
  trial: "🎁",
  silver_1m: "🥈",
  silver_6m: "🥈",
  gold_1m: "🥇",
  gold_6m: "🥇",
  platinum_1m: "💎",
  platinum_6m: "💎",
  "1m": "📅",
  "3m": "🗓️",
  "6m": "⭐",
  "1y": "👑",
};

export function PlanGrantDialog({ orgId, orgName, plans, onSuccess, onClose }: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[1]?.id ?? plans[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [customDays, setCustomDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const effectiveDays =
    useCustomDays && customDays ? Number(customDays) : (selectedPlan?.durationDays ?? 0);

  const expiresAt = effectiveDays
    ? new Date(Date.now() + effectiveDays * 86_400_000).toLocaleDateString("mn-MN")
    : null;

  const handleSubmit = async () => {
    if (!selectedPlanId) return setError("Багц сонгоно уу");
    if (!note.trim()) return setError("Шалтгаан/тэмдэглэл оруулна уу");
    if (useCustomDays && (!customDays || Number(customDays) < 1)) {
      return setError("Хоногийн тоо 1-ээс их байх ёстой");
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adminFetch(`${API}/admin/vendors/${orgId}/grant-plan`, {
        method: "POST",
        body: JSON.stringify({
          planId: selectedPlanId,
          note: note.trim(),
          ...(useCustomDays && customDays ? { customDays: Number(customDays) } : {}),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message ?? "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Crown size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Төлбөргүй план нэмэх</h2>
                <p className="text-xs text-indigo-200 mt-0.5 truncate max-w-[220px]">{orgName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {success ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <p className="text-base font-bold text-slate-800">Амжилттай нэмлээ!</p>
              <p className="text-sm text-slate-500 text-center">
                {selectedPlan?.name} багц {orgName}-д идэвхжлээ.
              </p>
            </div>
          ) : (
            <>
              {/* Plan selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Багц сонгох
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        selectedPlanId === plan.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{PLAN_ICONS[plan.id] ?? "📦"}</span>
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              selectedPlanId === plan.id ? "text-indigo-700" : "text-slate-700"
                            }`}
                          >
                            {plan.name}
                            {plan.badge && (
                              <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                                {plan.badge}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {plan.durationDays} хоног
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                          selectedPlanId === plan.id
                            ? "border-indigo-500 bg-indigo-500"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedPlanId === plan.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom duration */}
              <div>
                <button
                  onClick={() => setUseCustomDays((v) => !v)}
                  className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <CalendarDays size={14} />
                  {useCustomDays ? "Стандарт хоног ашиглах" : "Өөрчлөн тохируулах хоног"}
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${useCustomDays ? "rotate-180" : ""}`}
                  />
                </button>

                {useCustomDays && (
                  <div className="mt-2">
                    <input
                      type="number"
                      min={1}
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder="Жишээ: 60"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">Идэвхжих хугацаа (хоног)</p>
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  <FileText size={12} className="inline mr-1" />
                  Шалтгаан / тэмдэглэл
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Жишээ: Промо урамшуулал, Туршилтын хугацаа сунгалт..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">Энэ тэмдэглэл лог-д хадгалагдана</p>
              </div>

              {/* Preview */}
              {selectedPlan && expiresAt && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-indigo-700 mb-1">Урьдчилан харах</p>
                  <p className="text-sm text-indigo-800">
                    <span className="font-bold">{selectedPlan.name}</span> — {effectiveDays} хоног
                  </p>
                  <p className="text-xs text-indigo-600 mt-0.5">Дуусах: {expiresAt}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors"
                >
                  Болих
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Crown size={16} />
                  )}
                  {loading ? "Боловсруулж байна..." : "Нэмэх"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
