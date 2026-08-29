"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  X,
  Clock,
  ArrowRight,
  Tag,
  Loader2,
} from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

interface SearchOption {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
}

interface SearchCategoryResponse {
  id: string;
  name: string;
  icon?: string;
}

interface SearchPartnerResponse {
  id: string;
  name: string;
  slug: string;
}

import { API } from "@/lib/api";
import { organizationPath } from "@/lib/organization-links";

const contextOptions = [
  "Бүгд",
  "Ангилал",
  "Байгууллагууд",
  "Шинэ",
  "Эвэнт",
  "Кино",
  "Купонууд",
  "Бэлгийн карт",
];

interface SearchBarProps {
  variant?: "light" | "dark";
}

export const SearchBar = ({ variant = "light" }: SearchBarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [searchContext, setSearchContext] = useState("Бүгд");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);

  // API data
  const [apiCategories, setApiCategories] = useState<SearchOption[]>([]);
  const [apiBrands, setApiBrands] = useState<SearchOption[]>([]);
  const [rightLoading, setRightLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch categories + partners once on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, partRes] = await Promise.all([
          fetch(`${API}/business-categories`),
          fetch(`${API}/partners`),
        ]);
        if (catRes.ok) {
          const cats = (await catRes.json()) as SearchCategoryResponse[];
          setApiCategories(
            cats.map((category) => ({
              id: category.id,
              name: category.name,
              icon: category.icon,
            })),
          );
        }
        if (partRes.ok) {
          const raw = (await partRes.json()) as
            | SearchPartnerResponse[]
            | { data?: SearchPartnerResponse[] };
          const parts = Array.isArray(raw) ? raw : (raw.data ?? []);
          setApiBrands(
            parts.map((partner) => ({
              id: partner.id,
              name: partner.name,
              slug: partner.slug,
            })),
          );
        }
      } catch {
        setApiCategories([]);
        setApiBrands([]);
      } finally {
        setRightLoading(false);
      }
    };
    load();
  }, []);

  const filteredCategories = useMemo(
    () =>
      apiCategories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, apiCategories],
  );

  const filteredBrands = useMemo(
    () =>
      apiBrands.filter((brand) =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, apiBrands],
  );

  const trimmedSearchQuery = searchQuery.trim();
  const isDark = variant === "dark";
  useLockBodyScroll(isFocused);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeSearch();
      }
    };
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSearch();
    };
    if (isFocused) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isFocused]);

  const closeSearch = () => {
    setIsFocused(false);
    setIsContextOpen(false);
    setSearchQuery("");
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!trimmedSearchQuery) return;
    const params = new URLSearchParams(
      pathname.startsWith("/products") && typeof window !== "undefined"
        ? window.location.search
        : "",
    );
    params.set("search", trimmedSearchQuery);
    params.delete("category");
    params.delete("page");
    const nextUrl = `/products?${params.toString()}`;
    if (pathname.startsWith("/products")) {
      router.replace(nextUrl, { scroll: false });
    } else {
      router.push(nextUrl);
    }
    closeSearch();
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Overlay */}
      {isFocused && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={closeSearch}
        />
      )}

      {/* 1. Normal Search Bar */}
      <div
        className={`relative mx-auto flex h-12 w-full max-w-3xl items-center overflow-hidden rounded-full border transition-all duration-300 xl:h-14 ${
          isDark
            ? "border-[#24324A] bg-[#0B172A] shadow-[0_0_0_1px_rgba(37,99,235,0.12)] hover:border-[#2563EB]/70"
            : "border-2 border-orange-500 bg-white shadow-md"
        } ${
          isFocused
            ? "opacity-0 invisible scale-95"
            : "opacity-100 visible scale-100"
        } cursor-text`}
        onClick={() => setIsFocused(true)}
      >
        <div
          className={`group flex h-full cursor-pointer items-center border-r px-3 transition-colors xl:px-4 ${
            isDark
              ? "border-[#24324A] hover:bg-[#111C31]"
              : "border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span
            className={`mr-2 text-sm font-bold ${
              isDark ? "text-[#F8FAFC]" : "text-slate-700"
            }`}
          >
            {searchContext}
          </span>
          <ChevronDown
            size={14}
            className={
              isDark
                ? "text-[#64748B] group-hover:text-[#06B6D4]"
                : "text-slate-400 group-hover:text-orange-500"
            }
          />
        </div>
        <div
          className={`min-w-0 flex-1 truncate px-3 text-sm xl:px-4 ${isDark ? "text-[#64748B]" : "text-slate-400"}`}
        >
          Хайх утгаа оруулна уу...
        </div>
        <div
          className={`flex h-full shrink-0 items-center justify-center px-4 xl:px-6 ${isDark ? "text-[#F8FAFC]" : "text-black"}`}
        >
          <Search size={20} strokeWidth={3} />
        </div>
      </div>

      {/* 2. Expanded Search UI */}
      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-60 transition-all duration-500 ease-in-out ${
          isFocused
            ? "translate-y-0 opacity-100 scale-100"
            : "-translate-y-12 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white">
          {/* Search Input Area */}
          <div className="relative flex items-center h-18 px-6 bg-white border-b border-slate-100">
            {/* Context Selector */}
            <div className="relative mr-4">
              <button
                onClick={() => setIsContextOpen(!isContextOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-800"
              >
                <span className="text-sm font-bold whitespace-nowrap">
                  {searchContext}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${isContextOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isContextOpen && (
                <div className="absolute top-12 left-0 w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl py-3 z-70 animate-in fade-in zoom-in duration-200">
                  {contextOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setSearchContext(opt);
                        setIsContextOpen(false);
                      }}
                      className={`w-full px-5 py-2.5 text-left text-sm hover:bg-orange-50 hover:text-orange-600 transition-colors ${
                        searchContext === opt
                          ? "text-orange-600 font-bold bg-orange-50/50"
                          : "text-slate-600"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Search size={24} className="text-orange-500 mr-4 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              autoFocus={isFocused}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
              placeholder="Хайлт хийх..."
              className="flex-1 h-full outline-none text-xl text-slate-800 placeholder-slate-300 font-medium bg-transparent"
            />

            <div className="flex items-center gap-3">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
              <button
                onClick={() => handleSearchSubmit()}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 active:scale-95"
              >
                Хайх
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div className="flex flex-col md:flex-row h-125 bg-white">
            {/* Left: Search Suggestions / Recent */}
            <div
              className="flex-1 p-8 overflow-y-auto overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              {searchQuery ? (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                    Хайлтын үр дүн
                  </h3>
                  {trimmedSearchQuery.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <Search
                        size={48}
                        strokeWidth={1}
                        className="mb-4 opacity-20"
                      />
                      <p>Илэрц олдсонгүй</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      <div
                        onClick={() => handleSearchSubmit()}
                        className="p-4 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-50 text-orange-500 rounded-xl">
                            <Search size={20} />
                          </div>
                          <span className="font-semibold text-slate-700">
                            “{searchQuery}” хайх
                          </span>
                        </div>
                        <ArrowRight
                          size={18}
                          className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Clock size={32} className="text-slate-300" />
                  </div>
                  <h4 className="text-slate-800 font-bold mb-2">
                    Сүүлд үзсэн бараа байхгүй
                  </h4>
                  <p className="text-slate-400 text-sm max-w-60">
                    Таны саяхан сонирхсон бүтээгдэхүүнүүд энд харагдах болно.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Categories & Brands from API */}
            <div
              className="w-full md:w-[320px] bg-slate-50/80 p-8 border-l border-slate-100 overflow-y-auto overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              {rightLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
              ) : (
                <>
                  {/* Categories */}
                  <div className="mb-8">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-4">
                      Ангиллууд
                    </h4>
                    <div className="space-y-1">
                      {filteredCategories.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          Ангилал олдсонгүй
                        </p>
                      ) : (
                        filteredCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              router.push(`/products?category=${cat.id}`);
                              closeSearch();
                            }}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-orange-600 group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-orange-200 overflow-hidden">
                              {cat.icon ? (
                                cat.icon.startsWith("data:image") ||
                                cat.icon.startsWith("http") ? (
                                  <img
                                    src={cat.icon}
                                    alt={cat.name}
                                    className="w-5 h-5 object-contain"
                                  />
                                ) : (
                                  <span className="text-sm">{cat.icon}</span>
                                )
                              ) : (
                                <Tag
                                  size={14}
                                  className="text-slate-300 group-hover:text-orange-500"
                                />
                              )}
                            </div>
                            <span className="text-sm font-bold text-left">
                              {cat.name}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-4">
                      Байгууллагууд
                    </h4>
                    <div className="grid grid-cols-1 gap-1">
                      {filteredBrands.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          Байгууллага олдсонгүй
                        </p>
                      ) : (
                        filteredBrands.map((brand) => (
                          <button
                            key={brand.id}
                            onClick={() => {
                              router.push(organizationPath(brand));
                              closeSearch();
                            }}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-orange-600 group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center text-[10px] font-black group-hover:bg-orange-500 shrink-0">
                              {brand.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold truncate">
                              {brand.name}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-50 px-8 py-3 border-t border-slate-100 flex justify-between items-center">
            <div className="flex gap-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                ESC - Хаах
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                ENTER - Хайх
              </span>
            </div>
            <div
              onClick={() => {
                router.push("/organizations");
                closeSearch();
              }}
              className="text-[10px] text-orange-500 font-black flex items-center gap-1 cursor-pointer hover:underline"
            >
              БҮХ БРЭНДҮҮД <ArrowRight size={10} strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
