"use client";

import React, { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { ServiceDetailOverlay } from "@/components/organisms/ServiceDetailOverlay";

import { ServicePost } from "../../../molecules/ServiceCard";
import { ServiceGridHeader } from "../../../molecules/ServiceGridHeader";
import { ServiceCarousel } from "../../../molecules/ServiceCarousel";
import { CarouselProgress } from "../../../molecules/CarouselProgress";

export function ServiceGrid() {
  const [posts, setPosts] = useState<ServicePost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    fetch(`${API}/service-posts?activeOnly=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPosts(Array.isArray(data) ? data.slice(0, 16) : []))
      .catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="py-6 rounded-2xl">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <ServiceGridHeader />

          <ServiceCarousel
            posts={posts}
            onSelect={(id) => setSelectedId(id)}
            onProgressChange={setScrollProgress}
          />

          <CarouselProgress progress={scrollProgress} />
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