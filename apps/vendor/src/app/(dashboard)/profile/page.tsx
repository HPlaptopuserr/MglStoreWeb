"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Briefcase,
  ArrowLeft,
  Camera,
  ImagePlus,
  Users,
  Package,
  GitBranch,
  ShoppingCart,
  Shield,
  Tag,
  ChevronDown,
  Check,
  Loader2,
  Save,
} from "lucide-react";

const API = "http://localhost:4000/api";

type BusinessCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  // Category state
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCoverPreview(URL.createObjectURL(file));
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setProfilePreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
        const userEmail = storedUser.email;

        const [partnersRes, catsRes] = await Promise.all([
          fetch(`${API}/partners`, { cache: "no-store" }),
          fetch(`${API}/business-categories`),
        ]);

        if (catsRes.ok) setCategories(await catsRes.json());

        if (partnersRes.ok && userEmail) {
          const data = await partnersRes.json();
          const found = data.find((p: any) => p.email === userEmail);
          if (found) setPartner(found);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCategorySelect = async (slug: string | null) => {
    setCatOpen(false);
    if (!partner?.id) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${API}/partners/${partner.id}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessCategory: slug }),
      });
      if (res.ok) {
        setPartner((prev: any) => ({ ...prev, businessCategory: slug }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FFAD02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <Building2 className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Байгууллагын мэдээлэл олдсонгүй</h2>
        <p className="text-slate-500 mb-6">Таны бүртгэлтэй байгууллагын мэдээлэл системд олдсонгүй.</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={18} />
          Буцах
        </button>
      </div>
    );
  }

  const currentCat = categories.find((c) => c.slug === partner.businessCategory);

  const statItems = partner.stats
    ? [
      { label: "Хэрэглэгч", value: partner.stats.users, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
      { label: "Бүтээгдэхүүн", value: partner.stats.products, icon: Package, color: "text-emerald-600", bg: "bg-emerald-50" },
      { label: "Салбар", value: partner.stats.branches, icon: GitBranch, color: "text-amber-600", bg: "bg-amber-50" },
      { label: "Захиалга", value: partner.stats.orders, icon: ShoppingCart, color: "text-sky-600", bg: "bg-sky-50" },
    ]
    : [];

  return (
    <div className="max-w-5xl mx-auto p-4 pb-16 space-y-6">
      {/* Cover + Avatar card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="relative h-52 bg-gradient-to-br from-slate-100 to-slate-200 group/cover">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFAD02]/10 via-amber-50 to-slate-100" />
          )}
          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur-sm px-4 py-2 text-slate-600 text-sm font-semibold opacity-0 group-hover/cover:opacity-100 transition-all hover:bg-white shadow-sm border border-slate-200/50"
          >
            <ImagePlus size={16} />
            Ковер зураг
          </button>
        </div>

        <div className="relative px-8 pb-8">
          <div className="absolute -top-14 left-8">
            <div className="relative group/avatar">
              <div className="w-28 h-28 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                {profilePreview ? (
                  <img src={profilePreview} alt={partner.name} className="w-full h-full object-cover" />
                ) : partner.logoUrl ? (
                  <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#FFAD02] to-amber-500 flex items-center justify-center">
                    <span className="text-white text-4xl font-black">
                      {partner.name?.charAt(0).toUpperCase() || "V"}
                    </span>
                  </div>
                )}
                <input ref={profileInputRef} type="file" accept="image/*" onChange={handleProfileUpload} className="hidden" />
                <button
                  onClick={() => profileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-2xl"
                >
                  <Camera size={22} className="text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-20 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900">{partner.name}</h1>
                {partner.isVerified && <CheckCircle2 className="text-blue-500 w-6 h-6" />}
              </div>
              <p className="text-slate-500 font-medium mt-1">@{partner.slug}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase tracking-wider">
                <Briefcase size={14} className="text-slate-400" />
                {partner.type}
              </span>
              {partner.status === "ACTIVE" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  <CheckCircle2 size={14} />
                  Идэвхтэй
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-600 uppercase tracking-wider">
                  <XCircle size={14} />
                  Идэвхгүй
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {statItems.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <stat.icon size={22} className={stat.color} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Org Details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">Байгууллагын мэдээлэл</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoItem icon={<FileText size={18} className="text-slate-400" />} label="Регистрийн дугаар" value={partner.taxId} />
              <InfoItem icon={<Calendar size={18} className="text-slate-400" />} label="Бүртгүүлсэн огноо" value={new Date(partner.createdAt).toLocaleDateString("mn-MN")} />
              <InfoItem icon={<Shield size={18} className="text-slate-400" />} label="Баталгаажилт" value={partner.isVerified ? "Баталгаажсан" : "Баталгаажаагүй"} valueColor={partner.isVerified ? "text-emerald-600" : "text-amber-600"} />
              <InfoItem icon={<Briefcase size={18} className="text-slate-400" />} label="Төрөл" value={partner.type} />
            </div>
          </div>

          {/* ─── BUSINESS CATEGORY EDITOR ─── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Бизнесийн ангилал</h3>
              {saved && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Check size={13} /> Хадгалагдлаа
                </span>
              )}
            </div>

            <p className="text-sm text-slate-500 mb-4">
              Таны байгууллага ямар ангилалд харьяалагдахыг сонгоно уу. Энэ мэдээлэл нийтийн хайлт болон ангиллалд харагдана.
            </p>

            <div className="relative">
              <button
                onClick={() => setCatOpen((v) => !v)}
                disabled={saving}
                className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold hover:border-indigo-400 hover:bg-indigo-50/30 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  {saving ? (
                    <Loader2 size={18} className="text-slate-400 animate-spin" />
                  ) : (
                    <Tag size={18} className="text-slate-400" />
                  )}
                  <span className={currentCat ? "text-slate-800" : "text-slate-400"}>
                    {currentCat
                      ? `${currentCat.icon ?? "🏷️"} ${currentCat.name}`
                      : "Ангилал сонгоно уу..."}
                  </span>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${catOpen ? "rotate-180" : ""}`} />
              </button>

              {catOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCatOpen(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    <button
                      onClick={() => handleCategorySelect(null)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:bg-slate-50 transition-colors border-b border-slate-100"
                    >
                      <span className="w-4" />
                      Ангилалгүй болгох
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => handleCategorySelect(cat.slug)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-indigo-50 transition-colors"
                      >
                        {partner.businessCategory === cat.slug ? (
                          <Check size={14} className="text-indigo-500 shrink-0" />
                        ) : (
                          <span className="w-3.5" />
                        )}
                        <span className="text-lg">{cat.icon ?? "🏷️"}</span>
                        <span className="font-semibold text-slate-700">{cat.name}</span>
                        <code className="ml-auto text-xs text-slate-400 font-mono">{cat.slug}</code>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">Холбоо барих</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoItem icon={<Mail size={18} className="text-slate-400" />} label="И-мэйл" value={partner.email || "Бүртгэлгүй"} />
              <InfoItem icon={<Phone size={18} className="text-slate-400" />} label="Утас" value={partner.phone || "Бүртгэлгүй"} />
              <div className="sm:col-span-2">
                <InfoItem icon={<MapPin size={18} className="text-slate-400" />} label="Хаяг" value={partner.address || "Бүртгэлгүй"} />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FFAD02] to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200/50">
              <Building2 className="text-white" size={28} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-1">MglStore Vendor</h4>
            <p className="text-sm text-slate-500 mb-4">Бүртгэлтэй албан ёсны түнш</p>
            <div className="w-full h-px bg-slate-100 mb-4" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Та MglStore платформын бүртгэлтэй vendor бөгөөд бараа бүтээгдэхүүнээ зарах, захиалга удирдах эрхтэй.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Түргэн холбоосууд</h3>
            <div className="space-y-2">
              {[
                { label: "Бүтээгдэхүүн нэмэх", href: "/products" },
                { label: "Захиалгууд харах", href: "/orders" },
                { label: "Тохиргоо", href: "/settings" },
              ].map((link) => (
                <button
                  key={link.label}
                  onClick={() => router.push(link.href)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon, label, value, valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-sm font-semibold ${valueColor || "text-slate-800"}`}>{value}</p>
      </div>
    </div>
  );
}
