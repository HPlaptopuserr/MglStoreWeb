"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
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
        const found = data.find((p: any) => p.id === params.id);

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

    if (params.id) {
      fetchPartner();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] p-8 flex flex-col items-center justify-center text-center">
        <Building2 className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Түнш олдсонгүй
        </h2>
        <p className="text-slate-500 mb-6">
          Таны хайсан түншийн мэдээлэл олдсонгүй эсвэл устгагдсан байна.
        </p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft size={18} />
          Буцах
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans p-4 md:p-8">
      {/* Header / Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={18} />
          Буцах
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Info Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                {partner.logoUrl ? (
                  <img
                    src={partner.logoUrl}
                    alt={partner.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <Building2 size={40} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900 truncate">
                    {partner.name}
                  </h1>
                  {partner.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                      <CheckCircle2 size={16} />
                      Идэвхтэй
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                      <XCircle size={16} />
                      Идэвхгүй
                    </span>
                  )}
                </div>
                <div className="text-slate-500 text-lg mb-4">
                  @{partner.slug}
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
                    <Briefcase size={16} className="text-slate-400" />
                    {partner.type}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
                    <FileText size={16} className="text-slate-400" />
                    РД: {partner.taxId}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
                    <Calendar size={16} className="text-slate-400" />
                    Бүртгүүлсэн:{" "}
                    {new Date(partner.createdAt).toLocaleDateString("mn-MN")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              Холбоо барих мэдээлэл
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Mail size={18} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-0.5">
                    И-мэйл хаяг
                  </p>
                  <p className="text-slate-900 font-medium">
                    {partner.email || "Бүртгэлгүй"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Phone size={18} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-0.5">
                    Утасны дугаар
                  </p>
                  <p className="text-slate-900 font-medium">
                    {partner.phone || "Бүртгэлгүй"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 md:col-span-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <MapPin size={18} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-0.5">
                    Хаяг байршил
                  </p>
                  <p className="text-slate-900 font-medium leading-relaxed">
                    {partner.address || "Бүртгэлгүй"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 line-clamp-2">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Үзүүлэлт</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                <p className="text-slate-500 text-sm font-medium mb-1">
                  Хэрэглэгч
                </p>
                <div className="text-2xl font-bold text-indigo-700">
                  {partner.stats.users}
                </div>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                <p className="text-slate-500 text-sm font-medium mb-1">
                  Бүтээгдэхүүн
                </p>
                <div className="text-2xl font-bold text-emerald-700">
                  {partner.stats.products}
                </div>
              </div>
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                <p className="text-slate-500 text-sm font-medium mb-1">
                  Салбар
                </p>
                <div className="text-2xl font-bold text-amber-700">
                  {partner.stats.branches}
                </div>
              </div>
              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100/50">
                <p className="text-slate-500 text-sm font-medium mb-1">
                  Захиалга
                </p>
                <div className="text-2xl font-bold text-sky-700">
                  {partner.stats.orders}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
