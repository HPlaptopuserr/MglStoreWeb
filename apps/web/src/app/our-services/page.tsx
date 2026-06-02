"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ServiceSelector } from "./_components/ServiceSelector";
import { ServiceCategory } from "./types";
import { API } from "@/lib/api";
import { MGL_SERVICES_DATA } from "./data";

export default function OurServicesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>(MGL_SERVICES_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${API}/site-settings`);
        if (res.ok) {
          const data = await res.json();
          if (data["mgl-services"]) {
            const parsed = JSON.parse(data["mgl-services"]);
            if (Array.isArray(parsed)) {
              const hasTraining = parsed.some(
                (category: Partial<ServiceCategory>) => category?.id === "training",
              );
              setCategories(hasTraining ? parsed : [MGL_SERVICES_DATA[0], ...parsed]);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch MGL services", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchServices();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="bg-black text-white pt-16 pb-24 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon fill="currentColor" points="0,100 100,0 100,100"/>
          </svg>
        </div>
        
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <nav className="flex items-center gap-2 text-xs text-white/50 mb-8">
            <Link href="/" className="hover:text-white transition-colors">Нүүр</Link>
            <span>/</span>
            <span className="text-white">MGL Үйлчилгээ</span>
          </nav>
          
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase mb-4 leading-tight">
              Бидний үзүүлэх <br/>
              <span className="text-[#FFAD02]">Мэргэжлийн үйлчилгээ</span>
            </h1>
            <p className="text-white/70 text-base md:text-lg max-w-xl leading-relaxed">
              MGL Store нь таны бизнесийн үйл ажиллагаанд дэмжлэг үзүүлэх зорилгоор хууль, маркетинг, хүний нөөц зэрэг олон төрлийн мэргэжлийн үйлчилгээг цогцоор нь санал болгож байна.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 -mt-8 relative z-20 pb-20">
        <ServiceSelector categories={categories} loading={loading} />
      </div>
    </div>
  );
}
