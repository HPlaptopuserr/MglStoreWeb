"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@mgl/ui";
import { products } from "@/components/organisms/home/grid/ProductGrid";
import { API } from "@/lib/api";

interface ApiCategory {
  id: string;
  name: string;
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");

  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categoryParam,
  );
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch(`${API}/business-categories`);
        if (res.ok) {
          const data = await res.json();
          setApiCategories(data);
        }
      } catch (e) {
        console.error("Failed to load categories", e);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    setActiveCategory(categoryParam);
  }, [categoryParam]);

  const handleCategoryClick = (catId: string | null) => {
    setActiveCategory(catId);
    setShowMore(false);
    if (catId) {
      router.push(`/products?category=${catId}`, { scroll: false });
    } else {
      router.push("/products", { scroll: false });
    }
  };

  const activeCategoryName = apiCategories.find(
    (c) => c.id === activeCategory,
  )?.name;
  const displayProducts = showMore ? products : products.slice(0, 16);

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 lg:px-8 pt-6">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:underline underline">
            Нүүр
          </Link>
          <span>/</span>
          <Link href="/" className="hover:underline underline">
            Дэлгүүр
          </Link>
          <span>/</span>
          <span className="text-gray-400">
            {activeCategoryName ?? "Бүх бараа"}
          </span>
        </nav>

        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-black uppercase">
            {activeCategoryName ?? "Бүх бараа бүтээгдэхүүн"}{" "}
            <span className="text-[#FFAD02] text-sm md:text-base font-bold align-middle">
              ({displayProducts.length})
            </span>
          </h1>
        </div>

        {/* Description */}
        <div className="mb-8 max-w-3xl">
          <p className="text-sm text-gray-600 leading-relaxed">
            Хамгийн шилдэг, хамгийн эрэлттэй бүтээгдэхүүнүүдийг нэг дороос
            олоорой. Чанартай хүнсний бүтээгдэхүүнээс эхлээд өдөр тутмын
            хэрэгцээний бараа хүртэл — бүгдийг хамгийн сайн үнээр.{" "}
            <button className="underline font-medium text-black hover:text-[#FFAD02] transition-colors">
              Дэлгэрэнгүй
            </button>
          </p>
        </div>

        {/* Category Tabs + Filter */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-8">
          {/* Tabs */}
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide -mb-px">
            <button
              onClick={() => handleCategoryClick(null)}
              className={`relative px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
                !activeCategory
                  ? "text-black"
                  : "text-gray-400 hover:text-black"
              }`}
            >
              Бүгд
              {!activeCategory && (
                <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-[#FFAD02]" />
              )}
            </button>
            {apiCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`relative px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? "text-black"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                {cat.name}
                {activeCategory === cat.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-[#FFAD02]" />
                )}
              </button>
            ))}
          </div>

          {/* Filter & Sort */}
          <button className="hidden md:flex items-center gap-2 px-4 py-2 border text-black border-black text-xs font-medium uppercase tracking-wider hover:bg-black hover:text-white transition-colors shrink-0">
            Шүүлт & Эрэмбэ
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Product Grid - 4 columns like Adidas */}
      <div className="container mx-auto px-4 lg:px-8 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
          {displayProducts.map((product, idx) => (
            <div
              key={product.id}
              className="border border-transparent hover:border-black transition-colors duration-200"
            >
              <ProductCard
                image={product.image}
                price={product.price}
                name={product.title}
                category={["Performance", "Sportswear", "Originals"][idx % 3]}
                originalPrice={product.originalPrice}
                storeName={product.store?.name}
                isPrime={idx % 5 === 0}
              />
            </div>
          ))}
        </div>

        {/* Load More */}
        {!showMore && products.length > 16 && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setShowMore(true)}
              className="px-12 py-3.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#FFAD02] hover:text-black transition-colors"
            >
              Бүгдийг харах ({products.length - 16} бараа)
            </button>
          </div>
        )}

        {showMore && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => {
                setShowMore(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="px-12 py-3.5 border border-black text-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              Хураах
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
