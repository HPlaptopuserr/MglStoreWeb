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
} from "lucide-react";
import { API } from "@/lib/api";

export default function PartnerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        const res = await fetch(`${API}/partners`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch partners");
        }

        const data = await res.json();
        const found = data.find((p: any) => String(p.id) === String(params.id));

        if (!found) {
          throw new Error("Partner not found");
        }

        setPartner(found);
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
        </div>
      </div>
    </div>
  );
}
