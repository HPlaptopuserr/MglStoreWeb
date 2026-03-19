"use client";

import { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Tag,
  Save,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  Loader2,
  MoveLeft,
  MoveRight,
} from "lucide-react";
import Image from "next/image";
import { API } from "@/lib/api";

const SECTIONS = [
  { key: "banner", label: "Промо баннер", icon: ImagePlus },
  { key: "categories", label: "Ангилалууд", icon: Tag },
];

type SectionKey = "banner" | "categories";

const MAX_BANNERS = 3;

export default function SectionsPage() {
  const [active, setActive] = useState<SectionKey>("banner");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Banner section state — support up to MAX_BANNERS images
  const [banners, setBanners] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Categories section state
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    fetch(`${API}/site-settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        // Multi-banner key
        if (data["promo-banners"]) {
          try {
            const parsed = JSON.parse(data["promo-banners"]);
            if (Array.isArray(parsed)) {
              setBanners(parsed);
            }
          } catch {}
        } else if (data["promo-banner"]) {
          // Migrate old single-banner setting
          setBanners([data["promo-banner"]]);
        }

        if (data["home-categories"]) {
          try {
            const parsed = JSON.parse(data["home-categories"]);
            if (Array.isArray(parsed)) setCategories(parsed);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (banners.length >= MAX_BANNERS) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setBanners((prev) => [...prev, result]);
    };
    reader.readAsDataURL(file);
    // Reset input so user can pick the same file again
    e.target.value = "";
  };

  const removeBanner = (index: number) => {
    setBanners((prev) => prev.filter((_, i) => i !== index));
  };

  const swapBanners = (index1: number, index2: number) => {
    setBanners((prev) => {
      const newArr = [...prev];
      // Swap items
      const temp = newArr[index1];
      newArr[index1] = newArr[index2];
      newArr[index2] = temp;
      return newArr;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const body: Record<string, string> = {};
    if (active === "banner") {
      body["promo-banners"] = JSON.stringify(banners);
    } else if (active === "categories") {
      body["home-categories"] = JSON.stringify(categories);
    }

    try {
      await fetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const addCategory = () => {
    const trimmed = newCat.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setNewCat("");
    }
  };

  const removeCategory = (cat: string) => {
    setCategories(categories.filter((c) => c !== cat));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Сайтын хэсгүүд</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Нүүр хуудасны агуулгыг удирдана
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle2 size={16} />
          ) : (
            <Save size={16} />
          )}
          {saved ? "Хадгалагдлаа" : "Хадгалах"}
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-0 rounded-3xl border border-slate-100 shadow-sm overflow-hidden bg-white min-h-[600px]">
        {/* Left sidebar */}
        <aside className="w-56 shrink-0 border-r border-slate-100 bg-slate-50 flex flex-col pt-4 pb-6 gap-1 px-3">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key as SectionKey)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                active === key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </aside>

        {/* Right content */}
        <div className="flex-1 p-8">
          {/* ── BANNER SECTION ── */}
          {active === "banner" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                  Промо баннерууд
                </h2>
                <p className="text-sm text-slate-400">
                  Нүүр хуудсанд харагдах слайдер баннер зургууд. Хамгийн ихдээ{" "}
                  {MAX_BANNERS} зураг оруулах боломжтой.
                </p>
              </div>

              {/* Banner list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {banners.map((url, i) => (
                  <div
                    key={i}
                    className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group aspect-[2/1] md:aspect-[5/3] shadow-sm hover:shadow-md transition-all"
                  >
                    <Image
                      src={url}
                      alt={`Баннер ${i + 1}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized={url.startsWith("data:")}
                    />
                    
                    {/* Dark gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Order Controls */}
                    <div className="absolute top-3 left-3 z-10 flex text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl overflow-hidden backdrop-blur-md border border-white/10">
                      <button
                        onClick={() => swapBanners(i, i - 1)}
                        disabled={i === 0}
                        className="p-1.5 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Зүүн тийш зөөх"
                      >
                        <MoveLeft size={16} />
                      </button>
                      <div className="w-px bg-white/20" />
                      <button
                        onClick={() => swapBanners(i, i + 1)}
                        disabled={i === banners.length - 1}
                        className="p-1.5 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Баруун тийш зөөх"
                      >
                        <MoveRight size={16} />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeBanner(i)}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                      title="Устгах"
                    >
                      <Trash2 size={15} />
                    </button>

                    {/* Slide Number */}
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-white/90 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                        Слайд {i + 1}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Add banner button */}
                {banners.length < MAX_BANNERS && (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="relative w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-violet-600 aspect-[2/1] md:aspect-[5/3] group shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImagePlus size={24} className="text-violet-500" strokeWidth={2} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm text-slate-700">Баннер нэмэх</p>
                      <p className="text-xs mt-1 text-slate-500">
                        {banners.length} / {MAX_BANNERS}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {banners.length > 0 && (
                <button
                  onClick={() => setBanners([])}
                  className="self-start inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  <Trash2 size={14} />
                  Бүх баннер устгах
                </button>
              )}
            </div>
          )}

          {/* ── CATEGORIES SECTION ── */}
          {active === "categories" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                  Нүүр хуудасны ангилалууд
                </h2>
                <p className="text-sm text-slate-400">
                  Нүүр хуудасны ангилалын хэсэгт харагдах ангилалуудыг удирдана.
                </p>
              </div>

              {/* Add category input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  placeholder="Ангилал нэмэх..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <button
                  onClick={addCategory}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  <Plus size={16} />
                  Нэмэх
                </button>
              </div>

              {/* Category chips */}
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <Tag size={40} strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-medium">
                    Ангилал байхгүй байна
                  </p>
                  <p className="text-xs mt-1 text-slate-300">
                    Дээд талын оруулах хэсэгт ангилал нэмнэ үү
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <div
                      key={cat}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 group"
                    >
                      <Tag size={13} className="text-violet-500" />
                      {cat}
                      <button
                        onClick={() => removeCategory(cat)}
                        className="p-0.5 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
