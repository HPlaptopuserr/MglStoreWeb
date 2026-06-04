"use client";

import React, { useEffect, useState } from "react";
import { ServiceSelector } from "./_components/ServiceSelector";
import { OurServicesHero } from "./_components/OurServicesHero";
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
    <div className="min-h-screen bg-slate-50">
      <OurServicesHero categories={categories} loading={loading} />

      <div id="services" className="container relative z-20 mx-auto -mt-10 px-4 pb-20 lg:px-8">
        <ServiceSelector categories={categories} loading={loading} />
      </div>
    </div>
  );
}
