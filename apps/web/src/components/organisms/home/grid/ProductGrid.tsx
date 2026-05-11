"use client";

import React, { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { ProductDetailOverlay } from "@/components/organisms/ProductDetailOverlay";

import { GridHeader } from "../../../molecules/GridHeader";
import { ProductCarousel } from "../../../molecules/ProductCarousel";
import { CarouselProgress } from "../../../molecules/CarouselProgress";

interface ApiProduct {
  id: string;
  name: string;
  price: number;
  images: { id: string; url: string }[];
  organization: { id: string; name: string; logoUrl?: string } | null;
  discounts: { percent: number }[];
  businessCategory: { id: string; name: string } | null;
}

export const ProductGrid = () => {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    fetch(`${API}/products`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data.slice(0, 16));
        }
      })
      .catch(() => {
      });
  }, []);

  return (
    <section className="py-6 rounded-2xl">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="bg-white">
          
          <GridHeader title="Бүтээгдэхүүнүүд" href="/products" />

          <ProductCarousel
            products={products}
            onSelect={(id) => setSelectedId(id)}
            onProgressChange={setScrollProgress}
          />

          <CarouselProgress progress={scrollProgress} />

        </div>
      </div>

      {selectedId && (
        <ProductDetailOverlay
          productId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  );
};
