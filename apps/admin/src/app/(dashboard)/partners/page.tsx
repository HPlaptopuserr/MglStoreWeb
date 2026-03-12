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
} from "lucide-react";
import Link from "next/link";

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
  stats: {
    users: number;
    products: number;
    branches: number;
    orders: number;
  };
};

const CATEGORIES = [
  { value: "retail", label: "Худалдаа" },
  { value: "food", label: "Хоол үйлдвэрлэл" },
  { value: "service", label: "Үйлчилгээ" },
  { value: "pharmacy", label: "Эм, эмнэлэг" },
  { value: "electronics", label: "Электроник" },
  { value: "other", label: "Бусад" },
];

const categoryStyles: Record<string, { bg: string; text: string; border: string }> = {
  retail: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  food: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
  service: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
  pharmacy: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
  electronics: { bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-200" },
  other: { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200" },
};

function CategoryDropdown({
  partner,
  onUpdated,
}: {
  partner: Partner;
  onUpdated: (id: string, cat: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = CATEGORIES.find((c) => c.value === partner.businessCategory);
  const style = categoryStyles[partner.businessCategory ?? "other"] ?? categoryStyles.other;

  const handleSelect = async (value: string | null) => {
    setOpen(false);
    setSaving(true);
    try {
      await fetch(`http://localhost:4000/api/partners/${partner.id}/category`, {
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
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${style.bg} ${style.text} ${style.border} hover:opacity-80`}
      >
        <Store size={11} />
        {saving ? "..." : (current?.label ?? "Ангилал сонгох")}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => { e.preventDefault(); setOpen(false); }}
          />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[160px] bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            <button
              onClick={(e) => { e.preventDefault(); handleSelect(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <span className="w-3" />
              Ангилалгүй
            </button>
            <div className="border-t border-slate-100" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={(e) => { e.preventDefault(); handleSelect(cat.value); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              >
                {partner.businessCategory === cat.value ? (
                  <Check size={12} className="text-indigo-500 shrink-0" />
                ) : (
                  <span className="w-3" />
                )}
                <span className={`font-medium ${categoryStyles[cat.value]?.text ?? "text-slate-600"}`}>
                  {cat.label}
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
    const res = await fetch("http://localhost:4000/api/partners", {
      cache: "no-store",
    });
    const data = await res.json();
    setPartners(data);
  };

  const handleCategoryUpdated = (id: string, cat: string | null) => {
    setPartners((prev) =>
      prev.map((p) => (p.id === id ? { ...p, businessCategory: cat } : p))
    );
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans">
      <div className="p-4 md:p-8 w-full">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8 w-full lg:w-auto text-center sm:text-left">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                <Building2 size={26} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Нийт байгууллага</p>
                <h3 className="text-3xl font-bold text-slate-900 leading-tight">{partners.length}</h3>
              </div>
            </div>

            <div className="w-full sm:w-px h-px sm:h-12 bg-slate-200"></div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">Түншүүд</h1>
              <p className="text-sm text-slate-500 mt-1">
                Хайлтанд: {filteredPartners.length} {searchQuery && (
                  <span className="text-slate-400"> (Олдсон)</span>
                )}
              </p>
            </div>
          </div>

          <div className="relative w-full lg:w-auto lg:min-w-[400px] max-w-md group">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPartners.map((partner) => (
            <Link
              href={`/partners/${partner.id}`}
              key={partner.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer"
            >
              <div className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-start mb-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                      <Building2 size={24} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-lg truncate">
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

                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    {partner.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-600">
                    <Briefcase size={12} />
                    {partner.type}
                  </span>

                  {/* ← Inline ангилал сонгогч */}
                  <CategoryDropdown
                    partner={partner}
                    onUpdated={handleCategoryUpdated}
                  />

                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-600">
                    <FileText size={12} />
                    {partner.taxId}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-3 flex-1 bg-slate-50/50">
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

              <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-4 divide-x divide-slate-100">
                <div className="flex flex-col items-center justify-center p-2">
                  <Users size={14} className="text-slate-400 mb-1" />
                  <span className="font-semibold text-slate-900 text-sm">
                    {partner.stats.users}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2">
                  <Package size={14} className="text-slate-400 mb-1" />
                  <span className="font-semibold text-slate-900 text-sm">
                    {partner.stats.products}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2">
                  <Store size={14} className="text-slate-400 mb-1" />
                  <span className="font-semibold text-slate-900 text-sm">
                    {partner.stats.branches}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2">
                  <ShoppingCart size={14} className="text-slate-400 mb-1" />
                  <span className="font-semibold text-slate-900 text-sm">
                    {partner.stats.orders}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
