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
} from "lucide-react";

type Partner = {
  id: string;
  name: string;
  slug: string;
  taxId: string;
  type: string;
  status: string;
  isVerified: boolean;
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

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);

  const fetchPartners = async () => {
    const res = await fetch("http://localhost:4000/api/partners", {
      cache: "no-store",
    });
    const data = await res.json();
    setPartners(data);
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans">
      <div className="p-4 md:p-8 w-full">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Түншүүд</h1>
            <p className="text-sm text-slate-500 mt-1">
              Нийт түнш: {partners.length}
            </p>
          </div>

          <div className="relative w-full max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Түнш хайх..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
