"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Building2,
  BadgeCheck,
  Briefcase,
  FileText,
  Mail,
  Phone,
  MapPin,
  Users,
  Package,
  Store,
  ShoppingCart,
  X,
  ChevronDown,
  Check,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Plus,
  Copy,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { API, adminFetch } from "@/lib/api";
import { OrganizationImportModal } from "@/components/organisms";

type Partner = {
  id: string;
  name: string;
  slug: string;
  taxId: string;
  type: string;
  status: string;
  isVerified: boolean;
  businessCategory: string | null;
  email: string | null;
  phone: string | null;
  logoUrl?: string | null;
  address: string | null;
  createdAt: string;
  isInvestor?: boolean;
  investmentAmount?: number | null;
  stats: {
    users: number;
    products: number;
    branches: number;
    orders: number;
  };
};

type ApiCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  level: number;
};

type CreateOrganizationForm = {
  name: string;
  ownerEmail: string;
  ownerName: string;
  phone: string;
  address: string;
  type: string;
  businessCategory: string;
  taxId: string;
};

const EMPTY_CREATE_FORM: CreateOrganizationForm = {
  name: "",
  ownerEmail: "",
  ownerName: "",
  phone: "",
  address: "",
  type: "SUPPLIER",
  businessCategory: "",
  taxId: "",
};

const INVESTOR_RING_COLORS = [
  "#FF6B6B", "#FF9F43", "#FECA57", "#2ED573", "#0ABDE3",
  "#48DBFB", "#A55EEA", "#F368E0", "#1DD1A1", "#FF6348",
];

function getInvestorRingStyle(amount: number | null | undefined) {
  if (!amount || amount <= 0) return undefined;
  const count = Math.min(Math.floor(amount / 10_000_000), 10);
  if (count <= 0) return undefined;
  const stops: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = (i / count) * 360;
    const end = ((i + 1) / count) * 360;
    stops.push(`${INVESTOR_RING_COLORS[i]} ${start}deg ${end}deg`);
  }
  return {
    background: `conic-gradient(${stops.join(", ")})`,
    padding: "3px",
    borderRadius: "14px",
  } as React.CSSProperties;
}

function CategoryDropdown({
  partner,
  categories,
  onUpdated,
}: {
  partner: Partner;
  categories: ApiCategory[];
  onUpdated: (id: string, cat: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = categories.find((c) => c.slug === partner.businessCategory);

  const handleSelect = async (value: string | null) => {
    setOpen(false);
    setSaving(true);
    try {
      await adminFetch(`${API}/partners/${partner.id}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessCategory: value }),
      });
      onUpdated(partner.id, value);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        disabled={saving}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none bg-indigo-50 text-indigo-600 border-indigo-200 hover:opacity-80"
      >
        <Store size={11} />
        {saving ? "..." : (current?.name ?? "Ангилал сонгох")}
        <ChevronDown
          size={11}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
          />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-40 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            <button
              onClick={(e) => {
                e.preventDefault();
                handleSelect(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <span className="w-3" />
              Ангилалгүй
            </button>
            <div className="border-t border-slate-100" />
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect(cat.slug);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              >
                {partner.businessCategory === cat.slug ? (
                  <Check size={12} className="text-indigo-500 shrink-0" />
                ) : (
                  <span className="w-3" />
                )}
                <span className="font-medium text-slate-600">
                  {cat.icon && !cat.icon.startsWith("data:") && !cat.icon.startsWith("http") ? `${cat.icon} ` : ""}
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModal, setDeleteModal] = useState<Partner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState<CreateOrganizationForm>(EMPTY_CREATE_FORM);
  const [inviteModal, setInviteModal] = useState<{
    organizationName: string;
    email: string;
    inviteLink: string;
  } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleDelete = async (partner: Partner) => {
    if (!deleteReason.trim() || deleteReason.trim().length < 5) {
      alert("Устгах шалтгааныг дор хаяж 5 тэмдэгтээр бичнэ үү");
      return;
    }

    setDeleting(true);
    try {
      const res = await adminFetch(`${API}/partners/${partner.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: deleteReason.trim(),
          deletedBy: "admin",
        }),
      });
      if (res.ok) {
        setPartners((prev) => prev.filter((p) => p.id !== partner.id));
        setDeleteModal(null);
        setDeleteReason("");
      } else {
        const data = await res.json();
        alert(data.message || "Устгахад алдаа гарлаа");
      }
    } catch (e) {
      console.error(e);
      alert("Устгахад алдаа гарлаа");
    } finally {
      setDeleting(false);
    }
  };

  const filteredPartners = partners.filter((partner) => {
    const query = searchQuery.toLowerCase();
    return (
      partner.name.toLowerCase().includes(query) ||
      partner.slug.toLowerCase().includes(query) ||
      partner.type.toLowerCase().includes(query) ||
      partner.status.toLowerCase().includes(query) ||
      (partner.email && partner.email.toLowerCase().includes(query)) ||
      (partner.taxId && partner.taxId.toLowerCase().includes(query))
    );
  });

  const fetchPartners = async () => {
    const res = await adminFetch(`${API}/partners`, {
      cache: "no-store",
    });
    const data = await res.json();
    setPartners(Array.isArray(data) ? data : []);
  };

  const handleCategoryUpdated = (id: string, cat: string | null) => {
    setPartners((prev) =>
      prev.map((p) => (p.id === id ? { ...p, businessCategory: cat } : p)),
    );
  };

  const handleCreateOrganization = async () => {
    if (!createForm.name.trim() || !createForm.ownerEmail.trim()) {
      setCreateError("Байгууллагын нэр болон owner email шаардлагатай");
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      const res = await adminFetch(`${API}/admin/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          name: createForm.name.trim(),
          ownerEmail: createForm.ownerEmail.trim(),
          ownerName: createForm.ownerName.trim(),
          phone: createForm.phone.trim(),
          address: createForm.address.trim(),
          taxId: createForm.taxId.trim(),
          businessCategory: createForm.businessCategory || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Байгууллага үүсгэхэд алдаа гарлаа");
      }

      setCreateModalOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
      setInviteModal({
        organizationName: data.organization?.name || createForm.name,
        email: data.user?.email || createForm.ownerEmail,
        inviteLink: data.inviteLink,
      });
      await fetchPartners();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Байгууллага үүсгэхэд алдаа гарлаа",
      );
    } finally {
      setCreating(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteModal?.inviteLink) return;
    await navigator.clipboard.writeText(inviteModal.inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  useEffect(() => {
    fetchPartners();
    adminFetch(`${API}/business-categories?level=0`)
      .then((r) => r.json())
      .then((data: ApiCategory[]) => setApiCategories(data))
      .catch(console.error);
  }, []);

  return (
    <div className="text-slate-800 font-sans">
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Байгууллага амжилттай үүслээ</h3>
                <p className="text-sm text-slate-500">Owner хэрэглэгч invite link-ээр нууц үгээ тохируулна.</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-400">Байгууллага</p>
                <p className="font-semibold text-slate-900">{inviteModal.organizationName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Owner email</p>
                <p className="font-medium text-slate-700">{inviteModal.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Invite link</p>
                <div className="mt-1 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 break-all">
                  {inviteModal.inviteLink}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setInviteModal(null)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-200"
              >
                Хаах
              </button>
              <button
                onClick={copyInviteLink}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700"
              >
                <Copy size={16} />
                {inviteCopied ? "Хуулсан" : "Link хуулах"}
              </button>
            </div>
          </div>
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Байгууллага бүртгэх</h3>
                <p className="text-sm text-slate-500">Шууд байгууллага үүсгээд owner invite link үүсгэнэ.</p>
              </div>
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setCreateError("");
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Байгууллагын нэр *</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Owner email *</label>
                <input
                  type="email"
                  value={createForm.ownerEmail}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Owner нэр</label>
                <input
                  value={createForm.ownerName}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Утас</label>
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Төрөл</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="SUPPLIER">SUPPLIER</option>
                  <option value="SERVICE_PROVIDER">SERVICE_PROVIDER</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Татварын дугаар</label>
                <input
                  value={createForm.taxId}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, taxId: e.target.value }))}
                  placeholder="Хоосон бол автоматаар үүсгэнэ"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Ангилал</label>
                <select
                  value={createForm.businessCategory}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, businessCategory: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Сонгоогүй</option>
                  {apiCategories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Хаяг</label>
                <textarea
                  value={createForm.address}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, address: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setCreateError("");
                }}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-200"
              >
                Болих
              </button>
              <button
                onClick={handleCreateOrganization}
                disabled={creating}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Plus size={16} />
                {creating ? "Үүсгэж байна..." : "Байгууллага үүсгэх"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 mb-4 md:mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-8 w-full lg:w-auto">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                <Building2 size={22} className="md:hidden" />
                <Building2 size={26} className="hidden md:block" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-slate-500 mb-0.5 md:mb-1">
                  Нийт байгууллага
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  {partners.length}
                </h3>
              </div>
            </div>

            <div className="hidden sm:block w-full sm:w-px h-px sm:h-12 bg-slate-200"></div>

            <div>
              <h1 className="text-lg md:text-2xl font-bold text-slate-900">
                Түншүүд
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5 md:mt-1">
                Хайлтанд: {filteredPartners.length}{" "}
                {searchQuery && (
                  <span className="text-slate-400"> (Олдсон)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex w-full max-w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <FileSpreadsheet size={16} />
              Excel импорт
            </button>
            <button
              onClick={() => {
                setCreateModalOpen(true);
                setCreateError("");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={16} />
              Байгууллага бүртгэх
            </button>

            <div className="relative w-full lg:min-w-80 max-w-md group">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-600"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Компанийн нэр, И-мэйл, РД-р хайх..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white placeholder:text-slate-400 font-medium placeholder:font-normal"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filteredPartners.map((partner) => (
            <Link
              href={`/partners/${partner.id}`}
              key={partner.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-lg hover:border-indigo-200/60 transition-all duration-300 cursor-pointer"
            >
              <div className={`p-4 md:p-5 border-b ${partner.isInvestor ? 'border-amber-200' : 'border-slate-100'}`}>
                {partner.isInvestor && (
                  <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg w-fit">
                    <TrendingUp size={12} className="text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">
                      Хөрөнгө оруулагч
                      {partner.investmentAmount ? ` · ${Number(partner.investmentAmount).toLocaleString()}₮` : ''}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {partner.isInvestor && partner.investmentAmount ? (
                      <div style={getInvestorRingStyle(partner.investmentAmount)} className="shrink-0">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                          <Building2 size={20} />
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                        <Building2 size={20} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm md:text-base truncate">
                          {partner.name}
                        </h3>
                        {partner.isVerified && (
                          <BadgeCheck
                            size={18}
                            className="text-blue-500 shrink-0"
                          />
                        )}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        @{partner.slug}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Delete Button - small icon */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteModal(partner);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Устгах"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      {partner.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-600">
                    <Briefcase size={12} />
                    {partner.type}
                  </span>

                  {/* ← Inline ангилал сонгогч */}
                  <CategoryDropdown
                    partner={partner}
                    categories={apiCategories}
                    onUpdated={handleCategoryUpdated}
                  />

                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-600">
                    <FileText size={12} />
                    {partner.taxId}
                  </span>
                </div>
              </div>

              <div className="p-4 md:p-5 space-y-2.5 flex-1 bg-slate-50/40">
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <Mail size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <span className="truncate">{partner.email || "N/A"}</span>
                </div>

                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <span>{partner.phone || "N/A"}</span>
                </div>

                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <MapPin
                    size={16}
                    className="text-slate-400 mt-0.5 shrink-0"
                  />
                  <span className="line-clamp-2">
                    {partner.address || "N/A"}
                  </span>
                </div>
              </div>

              <div className="p-3 md:p-4 border-t border-slate-100 bg-white grid grid-cols-4 divide-x divide-slate-100">
                <div className="flex flex-col items-center justify-center py-1">
                  <Users size={12} className="text-slate-300 mb-0.5" />
                  <span className="font-bold text-slate-800 text-xs md:text-sm">
                    {partner.stats.users}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center py-1">
                  <Package size={12} className="text-slate-300 mb-0.5" />
                  <span className="font-bold text-slate-800 text-xs md:text-sm">
                    {partner.stats.products}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center py-1">
                  <Store size={12} className="text-slate-300 mb-0.5" />
                  <span className="font-bold text-slate-800 text-xs md:text-sm">
                    {partner.stats.branches}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center py-1">
                  <ShoppingCart size={12} className="text-slate-300 mb-0.5" />
                  <span className="font-bold text-slate-800 text-xs md:text-sm">
                    {partner.stats.orders}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Байгууллага устгах
                </h3>
                <p className="text-sm text-slate-500">
                  30 хоногийн дотор сэргээх боломжтой
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Building2 size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {deleteModal.name}
                  </p>
                  <p className="text-sm text-slate-500">@{deleteModal.slug}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-800">
                    {deleteModal.stats.users}
                  </p>
                  <p className="text-xs text-slate-500">Хэрэглэгч</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">
                    {deleteModal.stats.products}
                  </p>
                  <p className="text-xs text-slate-500">Бараа</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">
                    {deleteModal.stats.branches}
                  </p>
                  <p className="text-xs text-slate-500">Салбар</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">
                    {deleteModal.stats.orders}
                  </p>
                  <p className="text-xs text-slate-500">Захиалга</p>
                </div>
              </div>
            </div>

            {/* Deletion reason textarea */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Устгах шалтгаан <span className="text-red-500">*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Устгах шалтгаанаа бичнэ үү (дор хаяж 5 тэмдэгт)..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">
                {deleteReason.length}/5 тэмдэгт (хамгийн багадаа)
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-700">
                <strong>Анхааруулга:</strong> Энэ байгууллагын бүх хэрэглэгчид 
                идэвхигүй болно. Дата 30 хоногийн турш хадгалагдаж, дараа нь 
                бүрмөсөн устгагдана. Энэ хугацаанд сэргээх боломжтой.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModal(null);
                  setDeleteReason("");
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Болих
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                disabled={deleting || deleteReason.trim().length < 5}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <span>Устгаж байна...</span>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Устгах
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <OrganizationImportModal
          onClose={() => setImportOpen(false)}
          onSuccess={fetchPartners}
        />
      )}
    </div>
  );
}
