"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Building2, MapPin, Briefcase } from "lucide-react";

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
};

export default function OrganizationsPage() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const res = await fetch("http://localhost:4000/api/partners");
                if (res.ok) {
                    const data = await res.json();
                    setPartners(data.filter((p: Partner) => p.status === "ACTIVE"));
                }
            } catch (error) {
                console.error("Failed to fetch partners", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPartners();
    }, []);

    const filteredPartners = partners.filter((partner) => {
        const query = searchQuery.toLowerCase();
        return (
            partner.name.toLowerCase().includes(query) ||
            partner.type.toLowerCase().includes(query) ||
            (partner.address && partner.address.toLowerCase().includes(query))
        );
    });

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Hero Section */}
            <div className="bg-white border-b border-slate-200 py-16 px-4">
                <div className="max-w-7xl mx-auto text-center space-y-6">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                        Албан ёсны <span className="text-[#FFAD02]">Түншүүд</span>
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        Манай платформд нэгдсэн, баталгаажсан албан ёсны байгууллага, салбаруудын нэгдсэн жагсаалт.
                    </p>

                    <div className="max-w-xl mx-auto relative mt-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Хайх (Компанийн нэр, Төрөл, Хаяг)..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:border-[#FFAD02] focus:ring-4 focus:ring-[#FFAD02]/10 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Grid List */}
            <div className="max-w-7xl mx-auto px-4 mt-12">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-10 h-10 border-4 border-[#FFAD02] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredPartners.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredPartners.map((partner) => (
                            <Link
                                href={`/organizations/${partner.slug}`}
                                key={partner.id}
                                className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 shadow-inner border border-slate-100/50 text-[#FFAD02] group-hover:scale-110 group-hover:bg-[#FFAD02]/10 transition-transform duration-300">
                                    {partner.logoUrl ? (
                                        <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-cover rounded-2xl" />
                                    ) : (
                                        <Building2 size={28} />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2 truncate group-hover:text-[#FFAD02] transition-colors">{partner.name}</h3>

                                <div className="space-y-2 mt-4">
                                    <div className="flex items-center text-sm text-slate-500 gap-2">
                                        <Briefcase size={14} className="text-slate-400" />
                                        <span>{partner.type}</span>
                                    </div>
                                    <div className="flex items-start text-sm text-slate-500 gap-2">
                                        <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                        <span className="line-clamp-2">{partner.address || "Хаяг бүртгэлгүй"}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-3xl border border-slate-100">
                        <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Илэрц олдсонгүй</h3>
                        <p className="text-slate-500">"{searchQuery}" хайлтад тохирох байгууллага олдсонгүй.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
