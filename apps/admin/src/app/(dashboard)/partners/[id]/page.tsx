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
} from "lucide-react";
import { API } from "@/lib/api";

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

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        const res = await fetch(`${API}/partners/${params.id}`, {
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

  const handleInvestorToggle = async (makeInvestor: boolean) => {
    if (makeInvestor && (!investmentInput || Number(investmentInput) <= 0)) {
      alert("Хөрөнгө оруулсан дүнг оруулна уу");
      return;
    }
    setInvestorSaving(true);
    try {
      const res = await fetch(`${API}/partners/${partner.id}/investor`, {
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
      const res = await fetch(`${API}/partners/${partner.id}/investor`, {
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
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Header / Navigation */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm sm:text-base text-slate-600 hover:text-slate-800 transition-colors font-medium bg-white px-3 py-2 sm:px-4 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={18} />
          Буцах
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Info Column */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden">
                {partner.logoUrl ? (
                  <img
                    src={partner.logoUrl}
                    alt={partner.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 size={36} className="sm:w-10 sm:h-10" />
                )}
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-3">
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">
                      {partner.name}
                    </h1>
                    <div className="text-slate-500 text-sm sm:text-base lg:text-lg mt-1 break-all">
                      @{partner.slug}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {partner.status === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <CheckCircle2 size={16} />
                        Идэвхтэй
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                        <XCircle size={16} />
                        Идэвхгүй
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700">
                    <Briefcase size={15} className="text-slate-400 shrink-0" />
                    <span className="break-words">
                      {partner.type || "Төрөлгүй"}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700">
                    <FileText size={15} className="text-slate-400 shrink-0" />
                    <span className="break-all">
                      РД: {partner.taxId || "-"}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700">
                    <Calendar size={15} className="text-slate-400 shrink-0" />
                    <span>
                      Бүртгүүлсэн:{" "}
                      {partner.createdAt
                        ? new Date(partner.createdAt).toLocaleDateString(
                            "mn-MN",
                          )
                        : "-"}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-8">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-5 sm:mb-6">
              Холбоо барих мэдээлэл
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Mail size={18} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500 mb-0.5">
                    И-мэйл хаяг
                  </p>
                  <p className="text-slate-900 font-medium break-all">
                    {partner.email || "Бүртгэлгүй"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Phone size={18} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500 mb-0.5">
                    Утасны дугаар
                  </p>
                  <p className="text-slate-900 font-medium break-words">
                    {partner.phone || "Бүртгэлгүй"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 md:col-span-2 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <MapPin size={18} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500 mb-0.5">
                    Хаяг байршил
                  </p>
                  <p className="text-slate-900 font-medium leading-relaxed break-words">
                    {partner.address || "Бүртгэлгүй"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Stats Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-5 sm:mb-6">
              Үзүүлэлт
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-indigo-50/50 p-3 sm:p-4 rounded-xl border border-indigo-100/50 min-w-0">
                <p className="text-slate-500 text-xs sm:text-sm font-medium mb-1">
                  Хэрэглэгч
                </p>
                <div className="text-xl sm:text-2xl font-bold text-indigo-700 break-words">
                  {stats.users ?? 0}
                </div>
              </div>

              <div className="bg-emerald-50/50 p-3 sm:p-4 rounded-xl border border-emerald-100/50 min-w-0">
                <p className="text-slate-500 text-xs sm:text-sm font-medium mb-1">
                  Бүтээгдэхүүн
                </p>
                <div className="text-xl sm:text-2xl font-bold text-emerald-700 break-words">
                  {stats.products ?? 0}
                </div>
              </div>

              <div className="bg-amber-50/50 p-3 sm:p-4 rounded-xl border border-amber-100/50 min-w-0">
                <p className="text-slate-500 text-xs sm:text-sm font-medium mb-1">
                  Салбар
                </p>
                <div className="text-xl sm:text-2xl font-bold text-amber-700 break-words">
                  {stats.branches ?? 0}
                </div>
              </div>

              <div className="bg-sky-50/50 p-3 sm:p-4 rounded-xl border border-sky-100/50 min-w-0">
                <p className="text-slate-500 text-xs sm:text-sm font-medium mb-1">
                  Захиалга
                </p>
                <div className="text-xl sm:text-2xl font-bold text-sky-700 break-words">
                  {stats.orders ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* Investor Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-amber-500" />
              Хөрөнгө оруулагч
            </h3>

            {partner.isInvestor ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={16} className="text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800">
                      Хөрөнгө оруулагч
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">
                    {partner.investmentAmount
                      ? `${Number(partner.investmentAmount).toLocaleString()}₮`
                      : "Дүн оруулаагүй"}
                  </p>
                  {lastAdded && (
                    <p className="text-sm text-green-600 mt-1 font-medium">
                      +{lastAdded.toLocaleString()}₮ нэмэгдлээ
                    </p>
                  )}
                </div>

                {showAddForm ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-600">
                      Нэмэх дүн (₮)
                    </label>
                    <input
                      type="number"
                      value={addInput}
                      onChange={(e) => setAddInput(e.target.value)}
                      placeholder="Жишээ: 10000000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddAmount}
                        disabled={investorSaving || !addInput}
                        className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {investorSaving ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <DollarSign size={16} />
                        )}
                        {investorSaving ? "Боловсруулж байна..." : "Нэмэх"}
                      </button>
                      <button
                        onClick={() => { setShowAddForm(false); setAddInput(""); }}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors"
                      >
                        Болих
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowAddForm(true); setLastAdded(null); }}
                    className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <DollarSign size={16} />
                    Хөрөнгө нэмэх
                  </button>
                )}

                <button
                  onClick={() => handleInvestorToggle(false)}
                  disabled={investorSaving}
                  className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl transition-colors"
                >
                  {investorSaving ? "Боловсруулж байна..." : "Хөрөнгө оруулагч төлвийг болиулах"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Энэ түнш одоогоор энгийн төлөвтэй байна. Хөрөнгө оруулагч болгохын тулд дүнг оруулна уу.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Хөрөнгө оруулсан дүн (₮)
                  </label>
                  <input
                    type="number"
                    value={investmentInput}
                    onChange={(e) => setInvestmentInput(e.target.value)}
                    placeholder="Жишээ: 50000000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={() => handleInvestorToggle(true)}
                  disabled={investorSaving || !investmentInput}
                  className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {investorSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <TrendingUp size={16} />
                  )}
                  {investorSaving ? "Боловсруулж байна..." : "Хөрөнгө оруулагч болгох"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
