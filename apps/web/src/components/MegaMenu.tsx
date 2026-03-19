"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Menu,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Tag,
  Loader2,
} from "lucide-react";
import { API } from "@/lib/api";

/* ── Types from API ── */
type ApiTreeNode = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  parentId: string | null;
  level: number;
  children: ApiTreeNode[];
};

/* ── MegaMenu display types ── */
type MegaCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  subgroups: {
    id: string;
    title: string;
    items: { id: string; name: string }[];
  }[];
};

/* ── Convert API tree → MegaMenu format ── */
function apiTreeToMega(tree: ApiTreeNode[]): MegaCategory[] {
  return tree.map((root) => ({
    id: root.id,
    slug: root.slug,
    name: root.name,
    icon: root.icon,
    subgroups: root.children.map((sub) => ({
      id: sub.id,
      title: sub.name,
      items: sub.children.map((item) => ({ id: item.id, name: item.name })),
    })),
  }));
}

const buildProductUrl = (categorySlug: string, subSlug?: string) => {
  const params = new URLSearchParams();
  params.set("category", categorySlug);
  if (subSlug) params.set("sub", subSlug);
  return `/products?${params.toString()}`;
};

/* ── Icon renderer for string icons ── */
function CategoryIcon({
  icon,
  isActive,
  size = 18,
}: {
  icon: string | null;
  isActive: boolean;
  size?: number;
}) {
  if (!icon) {
    return (
      <Tag
        size={size}
        strokeWidth={isActive ? 2 : 1.5}
        className={isActive ? "text-white" : "text-slate-400"}
      />
    );
  }
  if (icon.startsWith("data:image") || icon.startsWith("http")) {
    return (
      <img
        src={icon}
        alt=""
        className="object-contain"
        style={{
          width: size,
          height: size,
          filter: isActive ? "brightness(0) invert(1)" : "none",
        }}
      />
    );
  }
  // Emoji
  return <span style={{ fontSize: size - 2 }}>{icon}</span>;
}

export const MegaMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<MegaCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<MegaCategory | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories from API
  useEffect(() => {
    fetch(`${API}/business-categories/tree`)
      .then((r) => r.json())
      .then((data: ApiTreeNode[]) => {
        const mega = apiTreeToMega(data);
        setCategories(mega);
        if (mega.length > 0) {
          setActiveCategory(mega[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const closeMenu = () => {
    setIsOpen(false);
    setSearchQuery("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const toggleMenu = () => {
    if (isOpen) closeMenu();
    else setIsOpen(true);
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter((cat) => {
      if (cat.name.toLowerCase().includes(q)) return true;
      return cat.subgroups.some(
        (sg) =>
          sg.title.toLowerCase().includes(q) ||
          sg.items.some((item) => item.name.toLowerCase().includes(q)),
      );
    });
  }, [searchQuery, categories]);

  const getFilteredSubgroups = (subgroups: MegaCategory["subgroups"]) => {
    if (!searchQuery.trim()) return subgroups;
    const q = searchQuery.toLowerCase();
    return subgroups
      .map((sg) => ({
        ...sg,
        items: sg.items.filter((item) => item.name.toLowerCase().includes(q)),
      }))
      .filter(
        (sg) => sg.title.toLowerCase().includes(q) || sg.items.length > 0,
      );
  };

  useEffect(() => {
    if (
      filteredCategories.length > 0 &&
      activeCategory &&
      !filteredCategories.find((c) => c.id === activeCategory.id)
    ) {
      setActiveCategory(filteredCategories[0]);
    }
  }, [filteredCategories, activeCategory]);

  return (
    <div className="relative h-full flex items-center" ref={containerRef}>
      <button
        type="button"
        onClick={toggleMenu}
        className={`flex items-center gap-2 text-sm font-bold transition-colors h-full px-4 rounded-xl cursor-pointer ${
          isOpen ? "bg-black text-white" : "text-gray-900 hover:bg-slate-50"
        }`}
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
        <span className="hidden xl:inline-block">Бүх ангилал</span>
        <ChevronDown
          size={14}
          className={`ml-1 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white/60" : "text-gray-400"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-12 left-0 w-[900px] min-h-[500px] max-h-[750px] bg-white rounded-r-2xl rounded-bl-2xl shadow-xl border border-slate-200 z-50 flex overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          {/* ── Left sidebar: Categories ── */}
          <div className="w-[260px] bg-white border-r border-slate-100 flex flex-col pb-6 shrink-0">
            <div className="px-3 pt-3 pb-2 border-b border-slate-100">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Ангилал хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffad02]/40 focus:border-[#ffad02] transition-colors placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide px-3 pt-2 relative"
              data-lenis-prevent="true"
            >
              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Search size={24} className="mb-2 opacity-50" />
                  <span className="text-sm">Илэрц олдсонгүй</span>
                </div>
              ) : (
                filteredCategories.map((category) => {
                  const isActive = activeCategory?.id === category.id;
                  return (
                    <div
                      key={category.id}
                      className={`flex items-center justify-between px-4 py-2.5 mt-1 rounded-lg cursor-pointer text-sm transition-colors ${
                        isActive
                          ? "bg-[#ffad02] text-white font-medium shadow-sm transition-none"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      onClick={() => setActiveCategory(category)}
                      onMouseEnter={() => setActiveCategory(category)}
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon
                          icon={category.icon}
                          isActive={isActive}
                        />
                        <span>{category.name}</span>
                      </div>
                      {isActive && (
                        <ChevronRight
                          size={16}
                          className="text-white opacity-80"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Content: Subgroups + Items ── */}
          <div
            className="flex-1 bg-white p-6 overflow-y-auto overscroll-contain"
            data-lenis-prevent="true"
          >
            {activeCategory ? (
              <>
                <div className="flex justify-between items-center bg-slate-50 px-5 py-3 rounded-lg mb-6">
                  <h2 className="text-lg font-bold text-slate-800">
                    {activeCategory.name}
                  </h2>
                  <Link
                    href={buildProductUrl(activeCategory.slug)}
                    onClick={closeMenu}
                    className="text-sm font-medium text-[#ffad02] hover:underline transition-colors shrink-0"
                  >
                    Бүгдийг үзэх
                  </Link>
                </div>

                {getFilteredSubgroups(activeCategory.subgroups).length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-12 gap-y-10 pl-2">
                    {getFilteredSubgroups(activeCategory.subgroups).map(
                      (group) => (
                        <div key={group.id} className="flex flex-col">
                          <h3 className="text-[13px] uppercase tracking-wide font-bold text-slate-900 mb-4">
                            {group.title}
                          </h3>
                          {group.items.length > 0 ? (
                            <ul className="space-y-3 mb-4">
                              {group.items.map((item) => (
                                <li key={item.id}>
                                  <Link
                                    href={buildProductUrl(
                                      activeCategory.slug,
                                      item.name,
                                    )}
                                    onClick={closeMenu}
                                    className="text-[13px] text-slate-500 hover:text-[#ffad02] transition-colors"
                                  >
                                    {item.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-300 mb-4">
                              Бүтээгдэхүүний төрөл нэмэгдээгүй
                            </p>
                          )}
                          <Link
                            href={buildProductUrl(activeCategory.slug)}
                            onClick={closeMenu}
                            className="text-[13px] font-semibold text-[#ffad02] group flex items-center gap-1 mt-auto shrink-0 w-fit"
                          >
                            Бүгдийг үзэх{" "}
                            <span className="transform group-hover:translate-x-1 transition-transform">
                              →
                            </span>
                          </Link>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                    <Tag size={32} className="opacity-30" />
                    <p>Дэд ангилал нэмэгдээгүй байна</p>
                    <p className="text-xs text-slate-300">
                      Админ хэсгээс дэд ангилал нэмнэ үү
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  "Ангилал сонгоно уу"
                )}
              </div>
            )}
          </div>

          {/* ── Right sidebar: Banner + trending ── */}
          <div className="w-[280px] border-l border-slate-100 bg-white p-6 flex flex-col shrink-0">
            <div className="relative h-72 bg-slate-100 rounded-xl overflow-hidden mb-6 group cursor-pointer shrink-0">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage:
                    'url("https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800")',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-serif text-4xl font-extrabold tracking-[0.2em] text-white/95 drop-shadow-lg scale-y-110">
                  LIU•JO
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-5 shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Хамгийн их үзсэн
              </h3>
              <div className="flex gap-3 text-[11px] font-bold">
                <button className="text-[#ffad02]">1D</button>
                <button className="text-slate-400 hover:text-slate-800 transition-colors">
                  1W
                </button>
                <button className="text-slate-400 hover:text-slate-800 transition-colors">
                  1M
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 flex-1 overflow-hidden min-h-0">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-100 rounded-lg overflow-hidden group cursor-pointer relative pb-[120%]"
                >
                  <img
                    src={`https://images.unsplash.com/photo-${1550000000000 + i * 140000}?auto=format&fit=crop&q=80&w=200`}
                    alt="placeholder"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=200";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
