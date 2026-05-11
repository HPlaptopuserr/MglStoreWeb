"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Briefcase,
  TrendingUp,
  DollarSign,
  Loader2,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe,
  Crown,
  Plus,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import {
  PlanStatusCard,
  PlanGrantDialog,
  PlanGrantHistory,
} from "@/components/organisms/plan-grant";

export default function PartnerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [investorSaving, setInvestorSaving] = useState(false);
  const [investmentInput, setInvestmentInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [subdomainSaving, setSubdomainSaving] = useState(false);

  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [planData, setPlanData] = useState<{ plans: any[]; history: any[] } | null>(null);
  const [planDataLoading, setPlanDataLoading] = useState(false);

  const [branches, setBranches] = useState<{ id: string; name: string; address: string }[]>([]);
  const [branchForm, setBranchForm] = useState({ name: "", address: "" });
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [showBranchForm, setShowBranchForm] = useState(false);

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        const res = await adminFetch(`${API}/partners/${params.id}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch partner");
        }

        const data = await res.json();
        setPartner(data);
        if (data.investmentAmount) {
          setInvestmentInput(String(data.investmentAmount));
        }
        fetchPlanData(data.id);
        fetchBranches(data.id);
      } catch (error) {
        console.error("Failed to fetch partner:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params?.id) {
      fetchPartner();
    }
  }, [params?.id]);

  const fetchBranches = async (orgId: string) => {
    try {
      const res = await adminFetch(`${API}/admin/branches?organizationId=${orgId}`);
      if (res.ok) setBranches(await res.json());
    } catch {}
  };

  const handleAddBranch = async () => {
    if (!branchForm.name.trim() || !branchForm.address.trim()) {
      setBranchError("Нэр болон хаяг шаардлагатай");
      return;
    }
    setBranchSaving(true);
    setBranchError(null);
    try {
      const res = await adminFetch(`${API}/partners/${partner.id}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: branchForm.name.trim(), address: branchForm.address.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setBranchError(data.message || "Алдаа гарлаа"); return; }
      setBranches((prev) => [...prev, data]);
      setPartner((prev: any) => ({ ...prev, stats: { ...prev.stats, branches: (prev.stats?.branches ?? 0) + 1 } }));
      setBranchForm({ name: "", address: "" });
      setShowBranchForm(false);
    } catch { setBranchError("Сүлжээний алдаа гарлаа"); }
    finally { setBranchSaving(false); }
  };

  const fetchPlanData = async (orgId: string) => {
    setPlanDataLoading(true);
    try {
      const res = await adminFetch(`${API}/admin/vendors/${orgId}/plan-history`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setPlanData({ plans: data.plans, history: data.history });
    } catch {
    } finally {
      setPlanDataLoading(false);
    }
  };

  const handleInvestorToggle = async (makeInvestor: boolean) => {
    if (makeInvestor && (!investmentInput || Number(investmentInput) <= 0)) {
      alert("Хөрөнгө оруулсан дүнг оруулна уу");
      return;
    }
    setInvestorSaving(true);
    try {
      const res = await adminFetch(`${API}/partners/${partner.id}/investor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isInvestor: makeInvestor,
          investmentAmount: makeInvestor ? Number(investmentInput) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPartner((prev: any) => ({
          ...prev,
          isInvestor: data.isInvestor,
          investmentAmount: data.investmentAmount,
        }));
        if (!makeInvestor) {
          setInvestmentInput("");
          setLastAdded(null);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Алдаа гарлаа");
    } finally {
      setInvestorSaving(false);
    }
  };

  const handleAddAmount = async () => {
    if (!addInput || Number(addInput) <= 0) {
      alert("Нэмэх дүнг оруулна уу");
      return;
    }
    setInvestorSaving(true);
    try {
      const res = await adminFetch(`${API}/partners/${partner.id}/investor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isInvestor: true,
          investmentAmount: Number(addInput),
          addAmount: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastAdded(Number(addInput));
        setPartner((prev: any) => ({
          ...prev,
          isInvestor: data.isInvestor,
          investmentAmount: data.investmentAmount,
        }));
        setAddInput("");
        setShowAddForm(false);
      }
    } catch (e) {
      console.error(e);
      alert("Алдаа гарлаа");
    } finally {
      setInvestorSaving(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Энэ хэрэглэгчийн нууц үгийг шинэчлэхдээ итгэлтэй байна уу?")) return;
    setResettingUserId(userId);
    try {
      const res = await adminFetch(`${API}/partners/${partner.id}/members/${userId}/reset-password`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTempPasswords((prev) => ({ ...prev, [userId]: data.tempPassword }));
      setShowPasswords((prev) => ({ ...prev, [userId]: true }));
    } catch {
      alert("Нууц үг шинэчлэхэд алдаа гарлаа");
    } finally {
      setResettingUserId(null);
    }
  };

  const handleCopy = (text: string, userId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleSubdomainToggle = async (enable: boolean) => {
    if (!partner) return;
    const msg = enable
      ? `${partner.slug}.mglstore.mn субдомайн идэвхжүүлэхдээ итгэлтэй байна уу?`
      : "Субдомайн идэвхгүй болгохдоо итгэлтэй байна уу?";
    if (!confirm(msg)) return;
    setSubdomainSaving(true);
    try {
      const res = await adminFetch(`${API}/admin/partners/${partner.id}/subdomain`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enable }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPartner((prev: any) => ({
        ...prev,
        subdomainEnabled: data.subdomainEnabled,
        planExpiresAt: data.planExpiresAt,
      }));
    } catch {
      alert("Субдомайн өөрчлөхөд алдаа гарлаа");
    } finally {
      setSubdomainSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
        <div className="h-8 w-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] px-4 py-10 sm:p-8 flex flex-col items-center justify-center text-center">
        <Building2 className="w-14 h-14 sm:w-16 sm:h-16 text-slate-300 mb-4" />
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
          Түнш олдсонгүй
        </h2>
        <p className="text-sm sm:text-base text-slate-500 mb-6 max-w-md">
          Таны хайсан түншийн мэдээлэл олдсонгүй эсвэл устгагдсан байна.
        </p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft size={18} />
          Буцах
        </button>
      </div>
    );
  }

  const stats = partner?.stats ?? {
    users: 0,
    products: 0,
    branches: 0,
    orders: 0,
  };

  return (
    <>
    <div className="bg-[#f8f9fa] text-slate-800 font-sans px-4 py-4 sm:px-6 lg:px-8">
      {/* Back */}
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors font-medium bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={16} /> Буцах
        </button>
      </div>

      {/* ── Profile header ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-4">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden">
            {partner.logoUrl ? (
              <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 size={32} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{partner.name}</h1>
                <p className="text-sm text-slate-400 mt-0.5">@{partner.slug}</p>
              </div>
              {partner.status === "ACTIVE" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 size={13} /> Идэвхтэй
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                  <XCircle size={13} /> Идэвхгүй
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
                <Briefcase size={12} className="text-slate-400" />{partner.type || "Төрөлгүй"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
                <FileText size={12} className="text-slate-400" />РД: {partner.taxId || "-"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
                <Calendar size={12} className="text-slate-400" />
                {partner.createdAt ? new Date(partner.createdAt).toLocaleDateString("mn-MN") : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row inside profile */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          {[
            { label: "Хэрэглэгч", value: stats.users ?? 0, color: "text-indigo-700", bg: "bg-indigo-50" },
            { label: "Бүтээгдэхүүн", value: stats.products ?? 0, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Салбар", value: stats.branches ?? 0, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Захиалга", value: stats.orders ?? 0, color: "text-sky-700", bg: "bg-sky-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl px-3 py-3 text-center`}>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left col: Contact + Credentials */}
        <div className="xl:col-span-2 space-y-4">

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Phone size={15} className="text-slate-400" /> Холбоо барих мэдээлэл
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Mail size={14} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400 mb-0.5">И-мэйл</p>
                  <p className="text-sm font-semibold text-slate-800 break-all">{partner.email || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Phone size={14} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400 mb-0.5">Утас</p>
                  <p className="text-sm font-semibold text-slate-800">{partner.phone || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <MapPin size={14} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400 mb-0.5">Хаяг</p>
                  <p className="text-sm font-semibold text-slate-800 break-words">{partner.address || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          {partner.members && partner.members.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Key size={15} className="text-indigo-500" /> Нэвтрэх мэдээлэл
              </h3>
              <div className="space-y-3">
                {partner.members.map((member: any) => (
                  <div key={member.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{member.role}</p>
                        <p className="text-sm font-bold text-slate-800">{member.fullName || "Нэр байхгүй"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-500 break-all">{member.email}</span>
                        </div>
                        {member.lastLoginAt && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Сүүлд нэвтэрсэн: {new Date(member.lastLoginAt).toLocaleString("mn-MN")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleResetPassword(member.userId)}
                        disabled={resettingUserId === member.userId}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 text-indigo-600 disabled:text-slate-400 rounded-lg transition-colors shrink-0"
                      >
                        {resettingUserId === member.userId ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Нууц үг шинэчлэх
                      </button>
                    </div>
                    {tempPasswords[member.userId] && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs font-semibold text-amber-700 mb-1.5">Түр нууц үг:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm font-mono font-bold text-amber-900">
                            {showPasswords[member.userId] ? tempPasswords[member.userId] : "••••••••"}
                          </code>
                          <button onClick={() => setShowPasswords((p) => ({ ...p, [member.userId]: !p[member.userId] }))} className="p-1.5 rounded-md hover:bg-amber-100 text-amber-600">
                            {showPasswords[member.userId] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button onClick={() => handleCopy(tempPasswords[member.userId], member.userId)} className="p-1.5 rounded-md hover:bg-amber-100 text-amber-600">
                            {copiedId === member.userId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        </div>
                        <p className="text-[11px] text-amber-600 mt-1.5">⚠️ Хэрэглэгчид өгч, дараа нь өөрчлүүлэхийг зөвлөнө.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right col: management cards */}
        <div className="space-y-4">

          {/* Subdomain */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Globe size={15} className="text-indigo-500" /> Веб субдомайн
            </h3>
            <div className="mb-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Хаяг</p>
              <p className="text-xs font-bold font-mono text-slate-700 break-all">{partner.slug}.mglstore.mn</p>
            </div>
            {partner.subdomainEnabled ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">Идэвхтэй</p>
                    {partner.planExpiresAt && (
                      <p className="text-[11px] text-emerald-600">Дуусах: {new Date(partner.planExpiresAt).toLocaleDateString("mn-MN")}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => handleSubdomainToggle(false)} disabled={subdomainSaving} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors">
                  {subdomainSaving ? "Боловсруулж байна..." : "Идэвхгүй болгох"}
                </button>
              </div>
            ) : (
              <button onClick={() => handleSubdomainToggle(true)} disabled={subdomainSaving} className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold rounded-xl transition-colors">
                {subdomainSaving ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
                {subdomainSaving ? "Боловсруулж байна..." : "Субдомайн идэвхжүүлэх"}
              </button>
            )}
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Crown size={15} className="text-violet-500" /> Pro Багц
              </h3>
              <button
                onClick={() => { if (!planData && partner?.id) fetchPlanData(partner.id); setShowGrantDialog(true); }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
              >
                <Crown size={11} /> Төлбөргүй нэмэх
              </button>
            </div>
            <PlanStatusCard
              planType={partner.planType ?? null}
              planActivatedAt={partner.planActivatedAt ?? null}
              planExpiresAt={partner.planExpiresAt ?? null}
              subdomainEnabled={partner.subdomainEnabled ?? false}
              trialUsed={partner.trialUsed ?? false}
              slug={partner.slug}
            />
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => { if (partner?.id) fetchPlanData(partner.id); }}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
              >
                {planDataLoading ? "Ачааллаж байна..." : "Түүхийг шинэчлэх ↻"}
              </button>
              <div className="mt-2">
                <PlanGrantHistory history={planData?.history ?? []} loading={planDataLoading && !planData} />
              </div>
            </div>
          </div>

          {/* Branches */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin size={15} className="text-emerald-500" /> Салбарууд
              </h3>
              <button onClick={() => { setShowBranchForm((v) => !v); setBranchError(null); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded-lg transition-colors">
                <Plus size={11} /> Нэмэх
              </button>
            </div>
            {showBranchForm && (
              <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                {branchError && <p className="text-xs text-red-600">{branchError}</p>}
                <input type="text" placeholder="Салбарын нэр *" value={branchForm.name} onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                <input type="text" placeholder="Хаяг *" value={branchForm.address} onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                <div className="flex gap-2">
                  <button onClick={handleAddBranch} disabled={branchSaving} className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                    {branchSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Хадгалах
                  </button>
                  <button onClick={() => { setShowBranchForm(false); setBranchForm({ name: "", address: "" }); setBranchError(null); }} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg transition-colors">Болих</button>
                </div>
              </div>
            )}
            {branches.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Салбар бүртгэгдээгүй байна</p>
            ) : (
              <div className="space-y-2">
                {branches.map((b) => (
                  <div key={b.id} className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <MapPin size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{b.name}</p>
                      <p className="text-[11px] text-slate-500">{b.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Investor */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-amber-500" /> Хөрөнгө оруулагч
            </h3>
            {partner.isInvestor ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign size={14} className="text-amber-600" />
                    <span className="text-xs font-semibold text-amber-800">Хөрөнгө оруулагч</span>
                  </div>
                  <p className="text-xl font-black text-amber-700">
                    {partner.investmentAmount ? `${Number(partner.investmentAmount).toLocaleString()}₮` : "Дүн оруулаагүй"}
                  </p>
                  {lastAdded && <p className="text-xs text-emerald-600 mt-0.5 font-semibold">+{lastAdded.toLocaleString()}₮ нэмэгдлээ</p>}
                </div>
                {showAddForm ? (
                  <div className="space-y-2">
                    <input type="number" value={addInput} onChange={(e) => setAddInput(e.target.value)} placeholder="Нэмэх дүн (₮)" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                    <div className="flex gap-2">
                      <button onClick={handleAddAmount} disabled={investorSaving || !addInput} className="flex-1 flex items-center justify-center gap-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-semibold rounded-xl transition-colors">
                        {investorSaving ? <Loader2 size={13} className="animate-spin" /> : <DollarSign size={13} />}
                        {investorSaving ? "Боловсруулж байна..." : "Нэмэх"}
                      </button>
                      <button onClick={() => { setShowAddForm(false); setAddInput(""); }} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors">Болих</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setShowAddForm(true); setLastAdded(null); }} className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-colors">
                    <DollarSign size={13} /> Хөрөнгө нэмэх
                  </button>
                )}
                <button onClick={() => handleInvestorToggle(false)} disabled={investorSaving} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors">
                  {investorSaving ? "Боловсруулж байна..." : "Хөрөнгө оруулагч төлвийг болиулах"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Дүнг оруулж хөрөнгө оруулагч болгоно уу.</p>
                <input type="number" value={investmentInput} onChange={(e) => setInvestmentInput(e.target.value)} placeholder="Жишээ: 50000000" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                <button onClick={() => handleInvestorToggle(true)} disabled={investorSaving || !investmentInput} className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-semibold rounded-xl transition-colors">
                  {investorSaving ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
                  {investorSaving ? "Боловсруулж байна..." : "Хөрөнгө оруулагч болгох"}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>

      {showGrantDialog && partner && (
        <PlanGrantDialog
          orgId={partner.id}
          orgName={partner.name}
          plans={planData?.plans ?? []}
          onSuccess={() => {
            fetchPlanData(partner.id);
            setPartner((prev: any) => ({ ...prev }));
          }}
          onClose={() => setShowGrantDialog(false)}
        />
      )}
    </>
  );
}
