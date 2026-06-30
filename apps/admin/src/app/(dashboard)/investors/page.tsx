"use client";

import { useEffect, useState } from "react";
import {
  Crown,
  Building2,
  Search,
  Plus,
  X,
  Star,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  Check,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import { getInvestorTierLabel } from "@mgl/types";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
  isVerified: boolean;
}

interface InvestorProfile {
  id: string;
  organizationId: string;
  tier: "TOP" | "STRATEGIC" | "INVESTOR";
  featured: boolean;
  priority: number;
  publiclyVisible: boolean;
  investmentLevel: string | null;
  description: string | null;
  joinedAt: string;
  createdAt: string;
  organization: Organization;
}

const TIER_LABELS: Record<string, string> = {
  TOP: getInvestorTierLabel("TOP"),
  STRATEGIC: getInvestorTierLabel("STRATEGIC"),
  INVESTOR: getInvestorTierLabel("INVESTOR"),
};

const TIER_STYLES: Record<string, string> = {
  TOP: "bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900",
  STRATEGIC: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white",
  INVESTOR: "bg-gray-700 text-gray-200",
};

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [partners, setPartners] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add form state
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [formTier, setFormTier] = useState<string>("INVESTOR");
  const [formFeatured, setFormFeatured] = useState(false);
  const [formPriority, setFormPriority] = useState(0);
  const [formPublic, setFormPublic] = useState(true);
  const [formLevel, setFormLevel] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchInvestors = async () => {
    try {
      const res = await adminFetch(`${API}/investors/all`);
      if (res.ok) {
        const data = await res.json();
        setInvestors(data);
      }
    } catch (e) {
      console.error("Failed to fetch investors:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await adminFetch(`${API}/partners`);
      if (res.ok) {
        const raw = await res.json();
        const list = Array.isArray(raw) ? raw : raw?.data || [];
        setPartners(
          list
            .filter((p: any) => p.status === "ACTIVE")
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              logoUrl: p.logoUrl,
              status: p.status,
              isVerified: p.isVerified,
            })),
        );
      }
    } catch (e) {
      console.error("Failed to fetch partners:", e);
    }
  };

  useEffect(() => {
    fetchInvestors();
    fetchPartners();
  }, []);

  const existingOrgIds = new Set(investors.map((i) => i.organizationId));
  const availableOrgs = partners.filter((p) => !existingOrgIds.has(p.id));

  const handleAdd = async () => {
    if (!selectedOrgId) return;
    setSaving(true);
    try {
      const res = await adminFetch(`${API}/investors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          tier: formTier,
          featured: formFeatured,
          priority: formPriority,
          publiclyVisible: formPublic,
          investmentLevel: formLevel || null,
          description: formDesc || null,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        resetForm();
        fetchInvestors();
      } else {
        const err = await res.json();
        alert(err.message || "Алдаа гарлаа");
      }
    } catch {
      alert("Сервертэй холбогдож чадсангүй");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (
    id: string,
    updates: Partial<InvestorProfile>,
  ) => {
    try {
      await adminFetch(`${API}/investors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      fetchInvestors();
    } catch (e) {
      console.error("Update failed:", e);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" хөрөнгө оруулагч эрхийг устгах уу?`)) return;
    try {
      await adminFetch(`${API}/investors/${id}`, { method: "DELETE" });
      fetchInvestors();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const resetForm = () => {
    setSelectedOrgId("");
    setFormTier("INVESTOR");
    setFormFeatured(false);
    setFormPriority(0);
    setFormPublic(true);
    setFormLevel("");
    setFormDesc("");
  };

  const filtered = investors.filter((inv) =>
    inv.organization.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="font-sans text-slate-800">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
            <Crown size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Хөрөнгө оруулагчид
            </h1>
            <p className="text-sm text-slate-500">
              {investors.length} хөрөнгө оруулагч бүртгэлтэй
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-amber-600 transition-colors"
        >
          <Plus size={16} />
          Хөрөнгө оруулагч нэмэх
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Хайх..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
        />
      </div>

      {/* Investor list */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-100 bg-white p-6"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Crown size={40} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-900">
            {searchQuery
              ? "Илэрц олдсонгүй"
              : "Хөрөнгө оруулагч бүртгэлгүй"}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {searchQuery
              ? "Хайлтын утгаа өөрчилнө үү"
              : '"Хөрөнгө оруулагч нэмэх" товч дарна уу'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((inv) => (
            <div
              key={inv.id}
              className="group relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Tier badge */}
              <div className="absolute -top-2.5 right-4">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TIER_STYLES[inv.tier]}`}
                >
                  {TIER_LABELS[inv.tier]}
                </span>
              </div>

              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                  {inv.organization.logoUrl ? (
                    <img
                      src={inv.organization.logoUrl}
                      alt=""
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Building2 size={22} className="text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {inv.organization.name}
                  </h3>
                  {inv.investmentLevel && (
                    <p className="text-xs font-medium text-amber-600 mt-0.5">
                      {inv.investmentLevel}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Priority: {inv.priority}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {/* Featured toggle */}
                <button
                  onClick={() =>
                    handleUpdate(inv.id, { featured: !inv.featured })
                  }
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    inv.featured
                      ? "bg-amber-50 text-amber-600 border border-amber-200"
                      : "bg-slate-50 text-slate-400 border border-slate-200"
                  }`}
                >
                  <Star
                    size={12}
                    className={inv.featured ? "fill-amber-400" : ""}
                  />
                  Онцлох
                </button>

                {/* Visibility toggle */}
                <button
                  onClick={() =>
                    handleUpdate(inv.id, {
                      publiclyVisible: !inv.publiclyVisible,
                    })
                  }
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    inv.publiclyVisible
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : "bg-slate-50 text-slate-400 border border-slate-200"
                  }`}
                >
                  {inv.publiclyVisible ? (
                    <Eye size={12} />
                  ) : (
                    <EyeOff size={12} />
                  )}
                  {inv.publiclyVisible ? "Нийтийн" : "Хувийн"}
                </button>

                {/* Tier selector */}
                <TierSelector
                  current={inv.tier}
                  onChange={(tier) => handleUpdate(inv.id, { tier })}
                />

                {/* Delete */}
                <button
                  onClick={() =>
                    handleDelete(inv.id, inv.organization.name)
                  }
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ Add Investor Modal ═══════ */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
          />
          <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:inset-x-auto">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Хөрөнгө оруулагч нэмэх
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Organization selector */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Байгууллага
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                >
                  <option value="">Сонгох...</option>
                  {availableOrgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tier */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Түвшин
                </label>
                <div className="flex gap-2">
                  {(["INVESTOR", "STRATEGIC", "TOP"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormTier(t)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                        formTier === t
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {TIER_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Investment Level */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Хөрөнгө оруулалтын хэмжээ эсвэл ангилал
                </label>
                <input
                  type="text"
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                  placeholder="жишээ: 50000000 эсвэл Platinum"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Дараалал (өндөр = илүү чухал)
                </label>
                <input
                  type="number"
                  value={formPriority}
                  onChange={(e) => setFormPriority(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              {/* Toggles row */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="font-medium text-slate-700">Онцлох</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formPublic}
                    onChange={(e) => setFormPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="font-medium text-slate-700">
                    Нийтэд харагдах
                  </span>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Тайлбар (заавал биш)
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  placeholder="Хөрөнгө оруулалтын тухай товч тайлбар..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none"
                />
              </div>

              {/* Preview */}
              {selectedOrgId && (
                <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-600">
                    Урьдчилан харах
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white text-sm font-bold">
                      {availableOrgs
                        .find((o) => o.id === selectedOrgId)
                        ?.name.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {availableOrgs.find((o) => o.id === selectedOrgId)
                          ?.name || "—"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${TIER_STYLES[formTier]}`}
                        >
                          {TIER_LABELS[formTier]}
                        </span>
                        {formLevel && (
                          <span className="text-[10px] font-medium text-amber-600">
                            {formLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Болих
              </button>
              <button
                onClick={handleAdd}
                disabled={!selectedOrgId || saving}
                className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Хадгалж байна..." : "Нэмэх"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tier Selector dropdown ───
function TierSelector({
  current,
  onChange,
}: {
  current: string;
  onChange: (tier: "INVESTOR" | "STRATEGIC" | "TOP") => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
      >
        {TIER_LABELS[current]}
        <ChevronDown
          size={11}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-36 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {(["INVESTOR", "STRATEGIC", "TOP"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              >
                {current === t ? (
                  <Check size={12} className="text-amber-500 shrink-0" />
                ) : (
                  <span className="w-3 shrink-0" />
                )}
                <span className="font-medium text-slate-700">
                  {TIER_LABELS[t]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
