"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Star,
  Loader2,
  X,
  Check,
  Package,
  Image,
  Tag,
  BarChart2,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

type UpgradePlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  maxProducts: number;
  maxImages: number;
  maxCategories: number;
  hasBanner: boolean;
  hasAnalytics: boolean;
  isTrial: boolean;
  badge: string | null;
  isRecommended: boolean;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY_FORM: Omit<UpgradePlan, "id"> = {
  code: "",
  name: "",
  description: "",
  price: 0,
  durationDays: 30,
  maxProducts: 100,
  maxImages: 5,
  maxCategories: 10,
  hasBanner: true,
  hasAnalytics: false,
  isTrial: false,
  badge: "",
  isRecommended: false,
  isActive: true,
  sortOrder: 0,
};

function fmt(n: number) {
  return n === -1 ? "Хязгааргүй" : n.toLocaleString();
}

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-2 text-sm"
    >
      {value ? (
        <ToggleRight className="w-5 h-5 text-emerald-500" />
      ) : (
        <ToggleLeft className="w-5 h-5 text-slate-400" />
      )}
      <span className={value ? "text-slate-800 font-semibold" : "text-slate-400"}>
        {label}
      </span>
    </button>
  );
}

export default function UpgradePlansPage() {
  const [plans, setPlans] = useState<UpgradePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<UpgradePlan, "id">>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await adminFetch(`${API}/admin/upgrade-plans`);
      const data = await res.json();
      if (data.success) setPlans(data.plans);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (plan: UpgradePlan) => {
    setEditingId(plan.id);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? "",
      price: plan.price,
      durationDays: plan.durationDays,
      maxProducts: plan.maxProducts,
      maxImages: plan.maxImages,
      maxCategories: plan.maxCategories,
      hasBanner: plan.hasBanner,
      hasAnalytics: plan.hasAnalytics,
      isTrial: plan.isTrial,
      badge: plan.badge ?? "",
      isRecommended: plan.isRecommended,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = editingId
        ? `${API}/admin/upgrade-plans/${editingId}`
        : `${API}/admin/upgrade-plans`;
      const method = editingId ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          badge: form.badge || null,
          description: form.description || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Алдаа гарлаа");
        return;
      }
      setShowModal(false);
      await load();
    } catch {
      setError("Серверийн алдаа");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const res = await adminFetch(`${API}/admin/upgrade-plans/${id}/toggle`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: data.plan.isActive } : p)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ багцыг устгах уу?")) return;
    setDeleting(id);
    try {
      const res = await adminFetch(`${API}/admin/upgrade-plans/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await load();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  const f = (field: keyof typeof form, val: any) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Багц удирдах</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vendor upgrade планууд</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#FFAD02] hover:bg-amber-500 text-black font-bold rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Шинэ багц
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Нэр</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500">Code</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500">Үнэ</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500">Хугацаа</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-500">Хязгаар</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-500">Онцлог</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-500">Идэвхтэй</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {plans.map((plan) => (
              <tr key={plan.id} className={`hover:bg-slate-50/60 transition-colors ${!plan.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{plan.name}</span>
                    {plan.isRecommended && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                    {plan.isTrial && (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">
                        Trial
                      </span>
                    )}
                    {plan.badge && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{plan.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{plan.code}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">
                  {plan.price === 0 ? (
                    <span className="text-emerald-600">Үнэгүй</span>
                  ) : (
                    `${plan.price.toLocaleString()}₮`
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{plan.durationDays}х</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />{fmt(plan.maxProducts)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Image className="w-3 h-3" />{fmt(plan.maxImages)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />{fmt(plan.maxCategories)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {plan.hasBanner && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                    {plan.hasAnalytics && (
                      <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggle(plan.id)}
                    disabled={toggling === plan.id}
                    className="inline-flex items-center justify-center"
                  >
                    {toggling === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : plan.isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500 hover:text-emerald-600 transition-colors" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-300 hover:text-slate-400 transition-colors" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(plan)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      disabled={deleting === plan.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      {deleting === plan.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                  Багц байхгүй байна. Шинэ багц нэмнэ үү.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">
                {editingId ? "Багц засах" : "Шинэ багц нэмэх"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.code}
                    onChange={(e) => f("code", e.target.value)}
                    disabled={!!editingId}
                    placeholder="monthly"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Нэр <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => f("name", e.target.value)}
                    placeholder="1 Сар"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Тайлбар</label>
                <input
                  value={form.description ?? ""}
                  onChange={(e) => f("description", e.target.value)}
                  placeholder="Богино тайлбар..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Үнэ (₮) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => f("price", Number(e.target.value))}
                    min={0}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Хугацаа (хоног) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.durationDays}
                    onChange={(e) => f("durationDays", Number(e.target.value))}
                    min={1}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Бүтээгдэхүүн</label>
                  <input
                    type="number"
                    value={form.maxProducts}
                    onChange={(e) => f("maxProducts", Number(e.target.value))}
                    min={-1}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">-1 = хязгааргүй</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Зураг/бараа</label>
                  <input
                    type="number"
                    value={form.maxImages}
                    onChange={(e) => f("maxImages", Number(e.target.value))}
                    min={-1}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Ангилал</label>
                  <input
                    type="number"
                    value={form.maxCategories}
                    onChange={(e) => f("maxCategories", Number(e.target.value))}
                    min={-1}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Badge текст</label>
                  <input
                    value={form.badge ?? ""}
                    onChange={(e) => f("badge", e.target.value)}
                    placeholder="Хамгийн ашигтай"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Дараалал</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => f("sortOrder", Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Toggle value={form.hasBanner} onChange={(v) => f("hasBanner", v)} label="Banner зураг" />
                <Toggle value={form.hasAnalytics} onChange={(v) => f("hasAnalytics", v)} label="Аналитик" />
                <Toggle value={form.isTrial} onChange={(v) => f("isTrial", v)} label="Trial багц" />
                <Toggle value={form.isRecommended} onChange={(v) => f("isRecommended", v)} label="Санал болгох" />
                <Toggle value={form.isActive} onChange={(v) => f("isActive", v)} label="Идэвхтэй" />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Болих
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.code || !form.name}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#FFAD02] hover:bg-amber-500 disabled:bg-amber-200 text-black font-bold rounded-xl transition-colors text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? "Хадгалж байна..." : "Хадгалах"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
