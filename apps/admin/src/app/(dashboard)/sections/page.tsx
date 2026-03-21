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
  CreditCard,
  Printer,
} from "lucide-react";
import Image from "next/image";
import { API } from "@/lib/api";
import {
  BusinessCardFront,
  BusinessCardBack,
  CARD_COLOR_SCHEMES,
  type CardColorScheme,
  type BusinessCardData,
} from "@mgl/ui";

const SECTIONS = [
  { key: "banner", label: "Промо баннер", icon: ImagePlus },
  { key: "categories", label: "Ангилалууд", icon: Tag },
  { key: "cards", label: "Карт хэвлэх", icon: CreditCard },
];

type SectionKey = "banner" | "categories" | "cards";

type CardPartner = {
  id: string;
  name: string;
  slug: string;
  type?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  businessCategory?: string | null;
  phone?: string | null;
  address?: string | null;
};

const SCHEME_ORDER: CardColorScheme[] = [
  "default",
  "dark",
  "charcoal",
  "navy",
  "forest",
];

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

  // Cards section state
  const [cardPartners, setCardPartners] = useState<CardPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [cardScheme, setCardScheme] = useState<CardColorScheme>("default");
  const [webBaseUrl, setWebBaseUrl] = useState<string>("https://mglstore.mn");
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_WEB_URL;
    if (envUrl && envUrl.trim()) {
      setWebBaseUrl(envUrl.trim());
      return;
    }

    if (typeof window !== "undefined") {
      const { protocol, hostname } = window.location;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        // Admin runs on 3001, web runs on 3000 in local dev
        setWebBaseUrl("http://localhost:3000");
        return;
      }
      setWebBaseUrl(`${protocol}//${hostname}`);
      return;
    }

    setWebBaseUrl("https://mglstore.mn");
  }, []);

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

  // Fetch partners when cards tab is activated
  useEffect(() => {
    if (active !== "cards") return;
    fetch(`${API}/partners`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CardPartner[]) => {
        setCardPartners(data);
        if (!selectedPartnerId && data.length > 0) {
          setSelectedPartnerId(data[0].id);
        }
      })
      .catch(() => {});
  }, [active]);

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "card-print-override";
    style.textContent = `
      @media print {
        @page { margin: 8mm; }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body > * { visibility: hidden !important; }
        #card-print-area, #card-print-area * { visibility: visible !important; }
        #card-print-area {
          position: fixed !important;
          inset: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 24px !important;
          background: white !important;
          z-index: 99999 !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    window.addEventListener(
      "afterprint",
      () => {
        const existing = document.getElementById("card-print-override");
        if (existing) existing.remove();
      },
      { once: true }
    );
  };

  const selectedPartner = cardPartners.find((p) => p.id === selectedPartnerId);
  const profileTarget = selectedPartner
    ? (selectedPartner.slug?.trim() || selectedPartner.id)
    : "";
  const cardData: BusinessCardData | null = selectedPartner
    ? {
        name: selectedPartner.name,
        type: selectedPartner.type ?? undefined,
        slug: profileTarget,
        profileTarget,
        profileId: selectedPartner.id,
        category: selectedPartner.businessCategory ?? undefined,
        phone: selectedPartner.phone ?? undefined,
        address: selectedPartner.address ?? undefined,
        logoUrl: selectedPartner.logoUrl ?? undefined,
        bannerUrl: selectedPartner.bannerUrl ?? undefined,
      }
    : null;
  const qrPreviewUrl = cardData
    ? `${webBaseUrl}/organizations/${encodeURIComponent(cardData.profileTarget || cardData.slug)}${cardData.profileId ? `?oid=${encodeURIComponent(cardData.profileId)}` : ""}`
    : "";

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
        {active === "cards" ? (
          <button
            onClick={handlePrint}
            disabled={!cardData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 shadow-sm"
          >
            <Printer size={16} />
            Карт хэвлэх
          </button>
        ) : (
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
        )}
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

          {/* ── CARDS SECTION ── */}
          {active === "cards" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                  Бизнесийн карт хэвлэх
                </h2>
                <p className="text-sm text-slate-400">
                  Гишүүн байгууллагын бизнес карт үүсгэж хэвлэнэ. QR код уншуулахад
                  байгууллагын профайл руу хөтлөнө.
                </p>
              </div>

              {cardPartners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={40} strokeWidth={1.5} className="animate-spin text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-400">
                    Байгууллагуудыг татаж байна...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Left: controls */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Байгууллага сонгох
                      </label>
                      <select
                        value={selectedPartnerId}
                        onChange={(e) => setSelectedPartnerId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                      >
                        {cardPartners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Өнгөний хоршил
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {SCHEME_ORDER.map((key) => {
                          const s = CARD_COLOR_SCHEMES[key];
                          const isActive = cardScheme === key;
                          return (
                            <button
                              key={key}
                              onClick={() => setCardScheme(key)}
                              title={s.label}
                              className={`flex flex-col items-center gap-1.5 transition-all ${
                                isActive
                                  ? "scale-110"
                                  : "opacity-60 hover:opacity-100 hover:scale-105"
                              }`}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 44,
                                  height: 44,
                                  borderRadius: 10,
                                  background: s.bg,
                                  border: isActive
                                    ? `3px solid ${s.accent}`
                                    : "2px solid #e5e7eb",
                                  boxShadow: isActive
                                    ? `0 0 0 3px ${s.accent}40`
                                    : undefined,
                                  position: "relative",
                                  overflow: "hidden",
                                }}
                              >
                                <span
                                  style={{
                                    position: "absolute",
                                    bottom: 0,
                                    right: 0,
                                    width: "55%",
                                    height: "55%",
                                    background: s.accent,
                                    borderTopLeftRadius: 5,
                                  }}
                                />
                              </span>
                              <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight max-w-[52px]">
                                {s.label.split(" ")[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {cardData && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 space-y-1.5">
                        <p>
                          <span className="font-semibold text-slate-800">Нэр: </span>
                          {cardData.name}
                        </p>
                        {cardData.category && (
                          <p>
                            <span className="font-semibold text-slate-800">Ангилал: </span>
                            {cardData.category}
                          </p>
                        )}
                        {cardData.phone && (
                          <p>
                            <span className="font-semibold text-slate-800">Утас: </span>
                            {cardData.phone}
                          </p>
                        )}
                        {cardData.address && (
                          <p>
                            <span className="font-semibold text-slate-800">Хаяг: </span>
                            {cardData.address}
                          </p>
                        )}
                        <div className="pt-2 mt-2 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-500 mb-1">
                            QR шалгах линк (хэвлэгдэхгүй)
                          </p>
                          <a
                            href={qrPreviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 break-all underline underline-offset-2"
                          >
                            {qrPreviewUrl}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: card preview */}
                  <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/70 p-6 flex flex-col gap-6 items-center justify-start pt-6">
                    {cardData ? (
                      <>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                            Нүүр тал
                          </p>
                          <BusinessCardFront data={cardData} scheme={cardScheme} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                            Ар тал
                          </p>
                          <BusinessCardBack
                            data={cardData}
                            scheme={cardScheme}
                            webBaseUrl={webBaseUrl}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <CreditCard size={48} strokeWidth={1.5} />
                        <p className="mt-3 text-sm font-medium text-slate-400">
                          Байгууллага сонгоно уу
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {cardData && (
                <div
                  id="card-print-area"
                  ref={printAreaRef}
                  style={{ display: "none" }}
                >
                  <BusinessCardFront data={cardData} scheme={cardScheme} />
                  <BusinessCardBack
                    data={cardData}
                    scheme={cardScheme}
                    webBaseUrl={webBaseUrl}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
