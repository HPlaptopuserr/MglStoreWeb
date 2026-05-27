"use client";

import React, { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { ServiceDetailOverlay } from "@/app/services/_components/ServiceDetailOverlay";
import { GridHeader } from "@/components/molecules/GridHeader";

import { ServicePost } from "./ServiceCard";
import { ServiceCarousel } from "./ServiceCarousel";

export function ServiceGrid() {
  const [posts, setPosts] = useState<ServicePost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/service-posts?activeOnly=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setPosts(Array.isArray(data) ? data.slice(0, 16) : []);
      })
      .catch(() => {
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-slate-50 py-10 sm:py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <GridHeader title="Үйлчилгээнүүд" href="/services" />

          <ServiceCarousel
            posts={posts}
            onSelect={(id) => {
              setSelectedId(id);
            }}
          />

          {!loading && posts.length === 0 && (
            <div className="flex min-h-[220px] items-center justify-center text-sm font-medium text-slate-400">
              Одоогоор нийтлэгдсэн үйлчилгээ байхгүй байна.
            </div>
          )}
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
