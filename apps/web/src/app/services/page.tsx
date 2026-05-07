"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { ServiceCard } from "@/app/services/_components/ServiceCard";

const POSTS_PER_PAGE = 16;

interface ServicePost {
  id: string;
  title: string;
  description: string | null;
  priceText: string | null;
  tags: string[];
  isActive: boolean;
  viewCount: number;
  images: { id: string; url: string }[];
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  createdAt: string;
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}

function ServicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tagParam = searchParams.get("tag");

  const [posts, setPosts] = useState<ServicePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(tagParam);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/service-posts?activeOnly=true`);
        if (res.ok) {
          const data = await res.json();
          setPosts(Array.isArray(data) ? data : []);
        }
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    setActiveTag(tagParam);
  }, [tagParam]);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [posts]);

  const handleTagClick = (tag: string | null) => {
    setActiveTag(tag);
    setShowMore(false);
    router.push(tag ? `/services?tag=${encodeURIComponent(tag)}` : "/services", { scroll: false });
  };

  const filtered = useMemo(() => {
    let list = [...posts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          p.organization.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (activeTag) {
      list = list.filter((p) => p.tags.includes(activeTag));
    }
    return list;
  }, [posts, searchQuery, activeTag]);

  const displayed = showMore ? filtered : filtered.slice(0, POSTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 lg:px-8 pt-6">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:underline">Нүүр</Link>
          <span>/</span>
          <span className="text-gray-400">Үйлчилгээ</span>
        </nav>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-black uppercase">
            Үйлчилгээнүүд{" "}
            <span className="text-[#FFAD02] text-sm md:text-base font-bold align-middle">
              ({filtered.length})
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Хамтран ажиллагч байгууллагуудын санал болгож буй үйлчилгээнүүд
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-6 relative max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Үйлчилгээ хайх..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowMore(false); }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors bg-gray-50 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tag filter tabs */}
        {allTags.length > 0 && (
          <div className="flex-1 min-w-0 flex items-center gap-0 overflow-x-auto scrollbar-hide border-b border-gray-200 -mb-px mb-6">
            <button
              onClick={() => handleTagClick(null)}
              className={`relative px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
                !activeTag ? "text-black" : "text-gray-400 hover:text-black"
              }`}
            >
              Бүгд
              {!activeTag && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFAD02]" />}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`relative px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
                  activeTag === tag ? "text-black" : "text-gray-400 hover:text-black"
                }`}
              >
                {tag}
                {activeTag === tag && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFAD02]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 lg:px-8 pb-12 mt-12">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-24 text-center">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
            </svg>
            <p className="text-gray-400 text-sm font-medium">
              {searchQuery || activeTag
                ? "Хайлтад тохирох үйлчилгээ олдсонгүй"
                : "Үйлчилгээ байхгүй байна"}
            </p>
            {(searchQuery || activeTag) && (
              <button
                onClick={() => { setSearchQuery(""); handleTagClick(null); }}
                className="mt-3 text-xs underline text-gray-400 hover:text-black"
              >
                Шүүлтийг цэвэрлэх
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 md:grid-cols-4">
            {displayed.map((post) => (
              <Link key={post.id} href={`/services/${post.id}`} className="block">
                <ServiceCard post={post} />
              </Link>
            ))}
          </div>
        )}

        {/* Load More */}
        {!showMore && filtered.length > POSTS_PER_PAGE && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <button
              onClick={() => setShowMore(true)}
              className="px-12 py-3.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#FFAD02] hover:text-black transition-colors"
            >
              Цааш харах ({filtered.length - POSTS_PER_PAGE} үйлчилгээ)
            </button>
            <p className="text-xs text-gray-400">
              {POSTS_PER_PAGE} / {filtered.length} үйлчилгээ харагдаж байна
            </p>
          </div>
        )}

        {showMore && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => { setShowMore(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
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


