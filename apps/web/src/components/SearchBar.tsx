"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, X, Clock, ArrowRight, Tag } from "lucide-react";
import Image from "next/image";

// Төрөл тодорхойлох
interface SearchOption {
  id: string;
  name: string;
}

const mockCategories: SearchOption[] = [
  { id: "1", name: "Хүнс" },
  { id: "2", name: "Цайны газар / Ресторан" },
  { id: "3", name: "Зочид буудал" },
  { id: "4", name: "Эмийн сан" },
  { id: "5", name: "Аялал жуулчлал" },
  { id: "6", name: "Барлига, Үл хөдлөх" },
  { id: "7", name: "Барилгын дэлгүүр" },
];

const mockBrands: SearchOption[] = [
  { id: "b1", name: "IWAKO" },
  { id: "b2", name: "ЦАХИЛДАГ" },
  { id: "b3", name: "FJALLRAVEN" },
  { id: "b4", name: "АЗТАЙ САВАР ТББ" },
  { id: "b5", name: "ENGUM PUZZLE" },
  { id: "b6", name: "SES CREATIVE" },
  { id: "b7", name: "Joan Miro" },
  { id: "b8", name: "URUHAN" },
];

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

export const SearchBar = () => {
  const [searchContext, setSearchContext] = useState("Бүгд");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = useMemo(
    () =>
      mockCategories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  const filteredBrands = useMemo(
    () =>
      mockBrands.filter((brand) =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

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
      document.body.style.overflow = "hidden"; // Scroll-ыг царцаах
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isFocused]);

  const closeSearch = () => {
    setIsFocused(false);
    setIsContextOpen(false);
    setSearchQuery("");
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    alert(`Хайж буй утга: ${searchQuery} \nАнгилал: ${searchContext}`);
    closeSearch();
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Overlay */}
      {isFocused && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[50] transition-opacity duration-300"
          onClick={closeSearch}
        />
      )}

      {/* 1. Жижиг (Normal) Search Bar */}
      <div
        className={`relative flex items-center w-full max-w-3xl mx-auto bg-white rounded-full border-2 border-orange-500 h-[48px] transition-all duration-300 ${
          isFocused
            ? "opacity-0 invisible scale-95"
            : "opacity-100 visible scale-100"
        } cursor-text shadow-md overflow-hidden`}
        onClick={() => setIsFocused(true)}
      >
        <div className="flex items-center px-4 h-full border-r border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors group">
          <span className="text-sm font-bold text-slate-700 mr-2">
            {searchContext}
          </span>
          <ChevronDown
            size={14}
            className="text-slate-400 group-hover:text-orange-500"
          />
        </div>
        <div className="flex-1 px-4 text-slate-400 text-sm">
          Хайх утгаа оруулна уу...
        </div>
        <div className="h-full px-6 flex items-center justify-center text-black">
          <Search size={20} strokeWidth={3} />
        </div>
      </div>

      {/* 2. Том (Expanded) Search UI */}
      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-[60] transition-all duration-500 ease-in-out ${
          isFocused
            ? "translate-y-0 opacity-100 scale-100"
            : "-translate-y-12 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white">
          {/* Search Input Area */}
          <div className="relative flex items-center h-[72px] px-6 bg-white border-b border-slate-100">
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
                <div className="absolute top-12 left-0 w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl py-3 z-[70] animate-in fade-in zoom-in duration-200">
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
          <div className="flex flex-col md:flex-row h-[500px] bg-white">
            {/* Left: Search Suggestions / Recent */}
            <div className="flex-1 p-8 overflow-y-auto">
              {searchQuery ? (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                    Хайлтын үр дүн
                  </h3>
                  {filteredCategories.length === 0 &&
                  filteredBrands.length === 0 ? (
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
                      {/* Илэрц олдсон үед харуулах жишээ хайлтууд */}
                      <div className="p-4 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center justify-between group transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-50 text-orange-500 rounded-xl">
                            <Search size={20} />
                          </div>
                          <span className="font-semibold text-slate-700">
                            "{searchQuery}" хайх
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
                  <p className="text-slate-400 text-sm max-w-[240px]">
                    Таны саяхан сонирхсон бүтээгдэхүүнүүд энд харагдах болно.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Quick Links (Categories & Brands) */}
            <div className="w-full md:w-[320px] bg-slate-50/80 p-8 border-l border-slate-100 overflow-y-auto">
              {/* Categories */}
              <div className="mb-10">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-4">
                  Ангиллууд
                </h4>
                <div className="space-y-1">
                  {filteredCategories.slice(0, 5).map((cat) => (
                    <button
                      key={cat.id}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-orange-600 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-orange-200">
                        <Tag
                          size={14}
                          className="text-slate-300 group-hover:text-orange-500"
                        />
                      </div>
                      <span className="text-sm font-bold">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brands */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-4">
                  Байгууллагууд
                </h4>
                <div className="grid grid-cols-1 gap-1">
                  {filteredBrands.slice(0, 6).map((brand) => (
                    <button
                      key={brand.id}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-orange-600 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center text-[10px] font-black group-hover:bg-orange-500">
                        {brand.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold truncate">
                        {brand.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="bg-slate-50 px-8 py-3 border-t border-slate-100 flex justify-between items-center">
            <div className="flex gap-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                ESC - Хаах
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                ENTER - Хайх
              </span>
            </div>
            <div className="text-[10px] text-orange-500 font-black flex items-center gap-1 cursor-pointer hover:underline">
              БҮХ БРЭНДҮҮД <ArrowRight size={10} strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
