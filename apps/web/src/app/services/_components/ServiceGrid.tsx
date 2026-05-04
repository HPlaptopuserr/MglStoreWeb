"use client";

import React, { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { mockServices } from "@/app/services/_data/mock-services";
import { ServiceDetailOverlay } from "@/app/services/_components/ServiceDetailOverlay";
import { CarouselProgress } from "@/components/molecules/CarouselProgress";
import { GridHeader } from "@/components/molecules/GridHeader";

import { ServicePost } from "./ServiceCard";
import { ServiceCarousel } from "./ServiceCarousel";

export function ServiceGrid() {
  const [posts, setPosts] = useState<ServicePost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [usingMockData, setUsingMockData] = useState(true);

  useEffect(() => {
    fetch(`${API}/service-posts?activeOnly=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPosts(data.slice(0, 16));
          setUsingMockData(false);
        } else {
          setPosts(mockServices);
          setUsingMockData(true);
        }
      })
      .catch(() => {
        setPosts(mockServices);
        setUsingMockData(true);
      });
  }, []);

  return (
    <section className="py-6">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28" />
          <div className="pointer-events-none absolute inset-x-0 top-28 h-20" />

          <div className="relative">
            <GridHeader title="Үйлчилгээнүүд" href="/services" />

            <ServiceCarousel
              posts={posts}
              onSelect={(id) => {
                if (!usingMockData) setSelectedId(id);
              }}
              onProgressChange={setScrollProgress}
            />

            <CarouselProgress progress={scrollProgress} />
          </div>
        </div>
      </div>

      {selectedId && (
        <ServiceDetailOverlay
          postId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  );
}
