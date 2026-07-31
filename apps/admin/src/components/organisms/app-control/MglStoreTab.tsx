"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Smartphone,
  Building2,
  ImagePlus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  X,
  Plus,
  MapPin,
  Navigation,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

const MAX_BANNERS = 6;
const MAX_WIDE_BANNERS = 8;

type StoreBanner = {
  url: string;
  caption: string;
  promotionType: PromotionType;
};

type PromotionType = "all" | "1+1" | "3+1" | "2+1";

type WideBanner = {
  url: string;
  link: string;
};

const PROMOTION_TYPES: ReadonlyArray<{
  value: PromotionType;
  label: string;
}> = [
  { value: "all", label: "Ердийн" },
  { value: "1+1", label: "1+1" },
  { value: "3+1", label: "3+1" },
  { value: "2+1", label: "2+1" },
];

type BusinessCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  parentId: string | null;
  level: number;
};

type StoreBranchLocation = {
  id: string;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
};

/* ── icon helper: data URI / URL → <img>, otherwise emoji/text ── */
function CatIcon({ icon, size = 20 }: { icon: string | null; size?: number }) {
  if (!icon) return <Package size={size} className="text-slate-400" />;
  if (icon.startsWith("data:") || icon.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt=""
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return <span style={{ fontSize: size * 0.85 }}>{icon}</span>;
}

export function MglStoreTab() {
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [wideBanners, setWideBanners] = useState<WideBanner[]>([]);
  const [allCategories, setAllCategories] = useState<BusinessCategory[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [showLocations, setShowLocations] = useState(true);
  const [branchLocations, setBranchLocations] = useState<StoreBranchLocation[]>(
    [],
  );
  const [branchSearch, setBranchSearch] = useState("");
  const [branchLoading, setBranchLoading] = useState(true);
  const [branchError, setBranchError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingWideBanner, setUploadingWideBanner] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set(),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const wideBannerFileRef = useRef<HTMLInputElement>(null);

  /* ── load ALL categories (flat) ── */
  useEffect(() => {
    Promise.all([
      adminFetch(`${API}/site-settings/admin`, {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : {})),
      fetch(`${API}/business-categories`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(
        ([settings, cats]: [Record<string, string>, BusinessCategory[]]) => {
          if (settings["app-promo-banners"]) {
            try {
              const p = JSON.parse(settings["app-promo-banners"]);
              if (Array.isArray(p)) {
                setBanners(
                  p
                    .map((item): StoreBanner | null => {
                      if (typeof item === "string") {
                        return {
                          url: item,
                          caption: "",
                          promotionType: "all",
                        };
                      }
                      if (
                        item &&
                        typeof item === "object" &&
                        typeof item.url === "string"
                      ) {
                        return {
                          url: item.url,
                          caption:
                            typeof item.caption === "string"
                              ? item.caption
                              : "",
                          promotionType: PROMOTION_TYPES.some(
                            (type) => type.value === item.promotionType,
                          )
                            ? (item.promotionType as PromotionType)
                            : "all",
                        };
                      }
                      return null;
                    })
                    .filter((item): item is StoreBanner => item !== null),
                );
              }
            } catch {}
          }
          if (settings["app-home-categories"]) {
            try {
              const p = JSON.parse(settings["app-home-categories"]);
              if (Array.isArray(p)) setSelectedCatIds(p);
            } catch {}
          }
          if (settings["app-wide-banners"]) {
            try {
              const parsed: unknown = JSON.parse(
                settings["app-wide-banners"],
              );
              if (Array.isArray(parsed)) {
                setWideBanners(
                  parsed
                    .map((item): WideBanner | null => {
                      if (typeof item === "string") {
                        return { url: item, link: "" };
                      }
                      if (
                        item &&
                        typeof item === "object" &&
                        "url" in item &&
                        typeof item.url === "string"
                      ) {
                        return {
                          url: item.url,
                          link:
                            "link" in item && typeof item.link === "string"
                              ? item.link
                              : "",
                        };
                      }
                      return null;
                    })
                    .filter((item): item is WideBanner => item !== null),
                );
              }
            } catch {}
          }
          const showLocationsRaw =
            settings["app-show-branch-locations"] ??
            settings["show-branch-map"];
          setShowLocations(
            !["false", "0", "off"].includes(
              String(showLocationsRaw || "").toLowerCase(),
            ),
          );
          setAllCategories(cats);
        },
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setBranchLoading(true);
    setBranchError("");
    fetch(`${API}/store/branches`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setBranchLocations(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setBranchLocations([]);
        setBranchError("Салбарын байршил татахад алдаа гарлаа");
      })
      .finally(() => setBranchLoading(false));
  }, []);

  /* ── derived: roots + children map ── */
  const rootCats = allCategories.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) =>
    allCategories.filter((c) => c.parentId === parentId);
  const toggleExpand = (id: string) =>
    setExpandedParents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ── banner ── */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || banners.length >= MAX_BANNERS || uploadingBanner) return;

    setUploadingBanner(true);
    setBannerError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await adminFetch(`${API}/site-settings/banner-upload`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string;
      } | null;
      if (!response.ok || !body?.url) {
        throw new Error(body?.message || "Banner upload хийхэд алдаа гарлаа");
      }
      setBanners((current) =>
        current.length < MAX_BANNERS
          ? [
              ...current,
              { url: body.url!, caption: "", promotionType: "all" },
            ]
          : current,
      );
    } catch (error) {
      setBannerError(
        error instanceof Error
          ? error.message
          : "Banner upload хийхэд алдаа гарлаа",
      );
    } finally {
      setUploadingBanner(false);
    }
  };
  const removeBanner = (i: number) =>
    setBanners((p) => p.filter((_, k) => k !== i));
  const updateBannerCaption = (i: number, caption: string) =>
    setBanners((current) =>
      current.map((banner, index) =>
        index === i ? { ...banner, caption } : banner,
      ),
    );
  const updateBannerPromotionType = (
    i: number,
    promotionType: PromotionType,
  ) =>
    setBanners((current) =>
      current.map((banner, index) =>
        index === i ? { ...banner, promotionType } : banner,
      ),
    );
  const swapBanners = (i: number, j: number) => {
    if (j < 0 || j >= banners.length) return;
    setBanners((p) => {
      const n = [...p];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  };

  const handleWideBannerFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (
      !file ||
      wideBanners.length >= MAX_WIDE_BANNERS ||
      uploadingWideBanner
    ) {
      return;
    }
    setUploadingWideBanner(true);
    setBannerError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await adminFetch(`${API}/site-settings/banner-upload`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string;
      } | null;
      if (!response.ok || !body?.url) {
        throw new Error(body?.message || "Өргөн banner upload амжилтгүй");
      }
      setWideBanners((current) => [
        ...current,
        { url: body.url!, link: "" },
      ]);
    } catch (error) {
      setBannerError(
        error instanceof Error ? error.message : "Өргөн banner upload амжилтгүй",
      );
    } finally {
      setUploadingWideBanner(false);
    }
  };

  const moveWideBanner = (index: number, direction: -1 | 1) =>
    setWideBanners((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  /* ── category ── */
  const toggleCat = (id: string) =>
    setSelectedCatIds((p) =>
      p.includes(id) ? p.filter((c) => c !== id) : [...p, id],
    );
  const moveCat = (id: string, dir: -1 | 1) => {
    setSelectedCatIds((p) => {
      const i = p.indexOf(id);
      const t = i + dir;
      if (t < 0 || t >= p.length) return p;
      const n = [...p];
      [n[i], n[t]] = [n[t], n[i]];
      return n;
    });
  };

  /* ── save ── */
  const handleSave = useCallback(async () => {
    if (uploadingBanner || uploadingWideBanner) return;
    setSaving(true);
    try {
      const response = await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "app-promo-banners": JSON.stringify(banners),
          "app-wide-banners": JSON.stringify(wideBanners),
          "app-home-categories": JSON.stringify(selectedCatIds),
          "app-show-branch-locations": showLocations ? "true" : "false",
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Хадгалахад алдаа гарлаа");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Хадгалахад алдаа гарлаа");
    }
    setSaving(false);
  }, [
    banners,
    wideBanners,
    selectedCatIds,
    showLocations,
    uploadingBanner,
    uploadingWideBanner,
  ]);

  const selectedCats = selectedCatIds
    .map((id) => allCategories.find((c) => c.id === id))
    .filter(Boolean) as BusinessCategory[];
  const normalizedBranchSearch = branchSearch.trim().toLowerCase();
  const filteredBranchLocations = branchLocations.filter((branch) => {
    if (!normalizedBranchSearch) return true;
    const haystack = [
      branch.name,
      branch.address,
      branch.organization?.name,
      branch.organization?.slug,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedBranchSearch);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="flex gap-8 p-6">
      {/* ════════ LEFT CONTROLS ════════ */}
      <div className="flex-1 min-w-0 space-y-8">
        {/* Header + Save */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-200/50">
              <Smartphone size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                MGL Store — Нүүр хуудас
              </h2>
              <p className="text-xs text-slate-400">
                Баннер болон ангиллын тохиргоог энд удирдана
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || uploadingBanner || uploadingWideBanner}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-60 ${
              saved
                ? "bg-emerald-500 shadow-emerald-200/50"
                : "bg-violet-600 shadow-violet-200/50 hover:bg-violet-700"
            }`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}
            {saved ? "Хадгалагдлаа" : "Хадгалах"}
          </button>
        </div>

        {/* ── BANNERS ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Промо баннерууд
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Нүүрэнд 2 багана × 3 мөрөөр харагдана. Ихдээ {MAX_BANNERS}{" "}
                зураг.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
              {banners.length}/{MAX_BANNERS}
            </span>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {banners.map((banner, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="group relative aspect-square overflow-hidden bg-slate-100">
                  <span className="absolute left-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-lg bg-slate-950/75 px-1.5 text-[11px] font-black text-white shadow-sm">
                    {i + 1}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.url}
                    alt={`Banner ${i + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex gap-1">
                      <button
                        onClick={() => swapBanners(i, i - 1)}
                        disabled={i === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-white disabled:opacity-30"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => swapBanners(i, i + 1)}
                        disabled={i === banners.length - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-white disabled:opacity-30"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeBanner(i)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <label
                    htmlFor={`banner-promotion-${i}`}
                    className="mb-1.5 block text-[11px] font-bold text-slate-600"
                  >
                    Урамшууллын төрөл
                  </label>
                  <select
                    id={`banner-promotion-${i}`}
                    value={banner.promotionType}
                    onChange={(event) =>
                      updateBannerPromotionType(
                        i,
                        event.target.value as PromotionType,
                      )
                    }
                    className="mb-3 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                  >
                    {PROMOTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <label
                    htmlFor={`banner-caption-${i}`}
                    className="mb-1.5 block text-[11px] font-bold text-slate-600"
                  >
                    Banner тайлбар
                  </label>
                  <textarea
                    id={`banner-caption-${i}`}
                    value={banner.caption}
                    onChange={(event) =>
                      updateBannerCaption(i, event.target.value.slice(0, 120))
                    }
                    rows={2}
                    maxLength={120}
                    placeholder="Жишээ: 1+1 урамшуулал 08/31 хүртэл"
                    className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                  />
                  <p className="mt-1 text-right text-[10px] text-slate-400">
                    {banner.caption.length}/120
                  </p>
                </div>
              </div>
            ))}

            {banners.length < MAX_BANNERS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingBanner}
                className="group flex aspect-square flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 transition-all hover:border-violet-400 hover:bg-violet-50/40 disabled:cursor-wait disabled:opacity-60"
              >
                <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  {uploadingBanner ? (
                    <Loader2
                      size={18}
                      className="animate-spin text-violet-500"
                    />
                  ) : (
                    <ImagePlus size={18} className="text-violet-500" />
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-violet-600 transition-colors">
                  {uploadingBanner ? "Upload хийж байна..." : "Баннер нэмэх"}
                </span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          {bannerError && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              <span>{bannerError}</span>
              <button
                type="button"
                onClick={() => setBannerError("")}
                className="shrink-0 rounded-md p-1 hover:bg-red-100"
                aria-label="Алдааг хаах"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {banners.length > 0 && (
            <button
              onClick={() => setBanners([])}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
            >
              <Trash2 size={12} /> Бүгдийг устгах
            </button>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Ангиллын доорх өргөн banner
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                App дээр зүүн, баруун swipe хийдэг carousel хэлбэрээр харагдана.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
              {wideBanners.length}/{MAX_WIDE_BANNERS}
            </span>
          </div>

          <div className="space-y-3">
            {wideBanners.map((banner, index) => (
              <div
                key={`${banner.url}-${index}`}
                className="overflow-hidden rounded-xl bg-slate-50"
              >
                <div className="relative aspect-[2.6/1] overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.url}
                    alt={`Өргөн banner ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-lg bg-slate-950/75 px-2 py-1 text-[10px] font-black text-white">
                    {index + 1}
                  </span>
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveWideBanner(index, -1)}
                      disabled={index === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow disabled:opacity-35"
                      aria-label="Урагшлуулах"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveWideBanner(index, 1)}
                      disabled={index === wideBanners.length - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow disabled:opacity-35"
                      aria-label="Хойшлуулах"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setWideBanners((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white shadow"
                      aria-label="Устгах"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <label
                    htmlFor={`wide-banner-link-${index}`}
                    className="mb-1.5 block text-[11px] font-bold text-slate-600"
                  >
                    Холбоос
                  </label>
                  <input
                    id={`wide-banner-link-${index}`}
                    type="text"
                    value={banner.link}
                    onChange={(event) =>
                      setWideBanners((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, link: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="https://... эсвэл /catalog"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>
            ))}

            {wideBanners.length < MAX_WIDE_BANNERS && (
              <button
                type="button"
                onClick={() => wideBannerFileRef.current?.click()}
                disabled={uploadingWideBanner}
                className="flex h-24 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 transition hover:border-violet-400 hover:text-violet-600 disabled:opacity-60"
              >
                {uploadingWideBanner ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <ImagePlus size={17} />
                )}
                {uploadingWideBanner
                  ? "Upload хийж байна..."
                  : "Өргөн banner нэмэх"}
              </button>
            )}
          </div>
          <input
            ref={wideBannerFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleWideBannerFile}
          />
        </section>

        {/* ── CATEGORIES ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Ангиллууд</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Үндсэн болон дэд ангиллуудыг сонгож, дарааллыг тохируулна.
            </p>
          </div>

          {/* Category tree */}
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Ангилал сонгох
          </p>
          <div className="space-y-1 mb-5">
            {rootCats.map((parent) => {
              const children = childrenOf(parent.id);
              const hasChildren = children.length > 0;
              const isExpanded = expandedParents.has(parent.id);
              const parentOn = selectedCatIds.includes(parent.id);
              const selectedChildCount = children.filter((c) =>
                selectedCatIds.includes(c.id),
              ).length;

              return (
                <div key={parent.id}>
                  {/* Parent row */}
                  <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-1.5 hover:bg-white hover:border-slate-200 transition-all">
                    {/* Expand toggle */}
                    <button
                      onClick={() => hasChildren && toggleExpand(parent.id)}
                      className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                        hasChildren
                          ? "hover:bg-slate-200 text-slate-500"
                          : "text-transparent cursor-default"
                      }`}
                    >
                      {hasChildren && (
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${
                            isExpanded ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                      )}
                    </button>
                    {/* Icon + Name */}
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                      <CatIcon icon={parent.icon} size={17} />
                    </div>
                    <span className="flex-1 text-sm font-semibold text-slate-700 min-w-0 truncate">
                      {parent.name}
                    </span>
                    {/* Child count badge */}
                    {hasChildren && (
                      <span className="text-[10px] font-medium text-slate-400 mr-1">
                        {selectedChildCount > 0 && (
                          <span className="text-violet-500 font-bold">
                            {selectedChildCount}/
                          </span>
                        )}
                        {children.length} дэд
                      </span>
                    )}
                    {/* Select toggle */}
                    <button
                      onClick={() => toggleCat(parent.id)}
                      className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-bold border transition-all ${
                        parentOn
                          ? "border-violet-300 bg-violet-500 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-600"
                      }`}
                    >
                      {parentOn ? (
                        <span className="flex items-center gap-1">
                          <Check size={11} /> Сонгосон
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Plus size={11} /> Сонгох
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Children */}
                  {hasChildren && isExpanded && (
                    <div className="ml-8 mt-1 mb-1 space-y-1 border-l-2 border-slate-100 pl-3">
                      {children.map((child) => {
                        const childOn = selectedCatIds.includes(child.id);
                        const grandchildren = childrenOf(child.id);
                        return (
                          <div key={child.id} className="space-y-1">
                            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-all">
                              <div className="h-7 w-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                                <CatIcon icon={child.icon} size={14} />
                              </div>
                              <span className="flex-1 text-[13px] font-medium text-slate-600 min-w-0 truncate">
                                {child.name}
                              </span>
                              {grandchildren.length > 0 && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  {grandchildren.length} дэд
                                </span>
                              )}
                              <button
                                onClick={() => toggleCat(child.id)}
                                className={`h-6 shrink-0 rounded-md px-2 text-[10px] font-bold border transition-all ${
                                  childOn
                                    ? "border-violet-300 bg-violet-500 text-white"
                                    : "border-slate-200 bg-white text-slate-400 hover:border-violet-300 hover:text-violet-600"
                                }`}
                              >
                                {childOn ? (
                                  <Check size={10} />
                                ) : (
                                  <Plus size={10} />
                                )}
                              </button>
                            </div>
                            {grandchildren.length > 0 && (
                              <div className="ml-7 space-y-1 border-l border-slate-100 pl-3">
                                {grandchildren.map((grandchild) => {
                                  const grandchildOn = selectedCatIds.includes(
                                    grandchild.id,
                                  );
                                  return (
                                    <div
                                      key={grandchild.id}
                                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-all"
                                    >
                                      <div className="h-6 w-6 rounded-md bg-white border border-slate-100 flex items-center justify-center shrink-0">
                                        <CatIcon
                                          icon={grandchild.icon}
                                          size={13}
                                        />
                                      </div>
                                      <span className="flex-1 text-[12px] font-medium text-slate-500 min-w-0 truncate">
                                        {grandchild.name}
                                      </span>
                                      <button
                                        onClick={() => toggleCat(grandchild.id)}
                                        className={`h-6 shrink-0 rounded-md px-2 text-[10px] font-bold border transition-all ${
                                          grandchildOn
                                            ? "border-violet-300 bg-violet-500 text-white"
                                            : "border-slate-200 bg-white text-slate-400 hover:border-violet-300 hover:text-violet-600"
                                        }`}
                                      >
                                        {grandchildOn ? (
                                          <Check size={10} />
                                        ) : (
                                          <Plus size={10} />
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Сонгосон дараалал */}
          {selectedCatIds.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Сонгосон дараалал ({selectedCats.length})
              </p>
              <div className="space-y-1.5">
                {selectedCats.map((cat, i) => {
                  const isChild = !!cat.parentId;
                  const parentName = isChild
                    ? allCategories.find((c) => c.id === cat.parentId)?.name
                    : null;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-150 bg-slate-50/50 px-3 py-2 group hover:bg-white hover:border-slate-200 transition-all"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-[11px] font-bold text-violet-600">
                        {i + 1}
                      </span>
                      <div className="h-7 w-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                        <CatIcon icon={cat.icon} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-slate-700 block truncate">
                          {cat.name}
                        </span>
                        {parentName && (
                          <span className="text-[10px] text-slate-400">
                            {parentName} →
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveCat(cat.id, -1)}
                          disabled={i === 0}
                          className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center disabled:opacity-30 hover:bg-slate-200 transition-colors"
                        >
                          <ArrowUp size={12} className="text-slate-600" />
                        </button>
                        <button
                          onClick={() => moveCat(cat.id, 1)}
                          disabled={i === selectedCats.length - 1}
                          className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center disabled:opacity-30 hover:bg-slate-200 transition-colors"
                        >
                          <ArrowDown size={12} className="text-slate-600" />
                        </button>
                        <button
                          onClick={() => toggleCat(cat.id)}
                          className="h-6 w-6 rounded-md bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors ml-1"
                        >
                          <X size={12} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* ── BRANCH LOCATIONS ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Байршил</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                MGL Store app-ийн байршил хэсэгт харагдах салбарууд.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLocations((prev) => !prev)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                showLocations
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              {showLocations ? "Идэвхтэй" : "Нуусан"}
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              placeholder="Салбар, байгууллага, хаягаар хайх"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">
              {filteredBranchLocations.length}/{branchLocations.length}
            </span>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {branchLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-8 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                Байршил ачаалж байна...
              </div>
            ) : branchError ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-4 text-sm text-rose-600">
                {branchError}
              </div>
            ) : filteredBranchLocations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm text-slate-400">
                Байршил олдсонгүй
              </div>
            ) : (
              filteredBranchLocations.map((branch) => {
                const lat = branch.latitude ?? branch.lat;
                const lng = branch.longitude ?? branch.lng;
                return (
                  <div
                    key={branch.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {branch.name}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        {branch.address}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Building2 size={12} />
                          {branch.organization?.name || "Байгууллага"}
                        </span>
                        {typeof lat === "number" && typeof lng === "number" && (
                          <span>
                            {lat.toFixed(4)}, {lng.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                    {branch.mapsUrl && (
                      <a
                        href={branch.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:text-rose-500"
                      >
                        <Navigation size={14} />
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ════════ RIGHT: PHONE PREVIEW ════════ */}
      <div className="hidden lg:block w-[320px] shrink-0">
        <div className="sticky top-6">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
            Урьдчилж харах
          </p>

          {/* Phone shell */}
          <div className="mx-auto w-[280px] rounded-[2.8rem] bg-gradient-to-b from-slate-800 to-slate-900 p-[5px] shadow-2xl shadow-slate-900/30">
            <div className="rounded-[2.4rem] bg-slate-900 pt-3 pb-2 overflow-hidden">
              {/* Dynamic Island */}
              <div className="mx-auto mb-2 h-[22px] w-[90px] rounded-full bg-black" />

              {/* Screen */}
              <div className="mx-1 rounded-b-[2rem] bg-white overflow-hidden">
                <div
                  className="h-[500px] overflow-y-auto"
                  style={{ scrollbarWidth: "none" }}
                >
                  {/* App bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-md bg-white/20" />
                      <span className="text-[10px] font-extrabold text-white tracking-wide">
                        MGL Store
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-white/20" />
                      <div className="w-4 h-4 rounded-full bg-white/20" />
                    </div>
                  </div>

                  {/* Banner grid */}
                  <div className="grid grid-cols-2 gap-2 px-3 py-3">
                    {banners.length > 0 ? (
                      banners.map((banner, index) => (
                        <div
                          key={index}
                          className="overflow-hidden rounded-xl bg-white shadow-sm"
                        >
                          <div className="relative aspect-square overflow-hidden bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={banner.url}
                              alt={`Banner ${index + 1}`}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          </div>
                          {banner.caption && (
                            <p className="line-clamp-2 px-2 py-1.5 text-[7px] font-bold leading-tight text-slate-600">
                              {banner.caption}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 aspect-[2/1] flex flex-col items-center justify-center gap-1 border border-dashed border-slate-200">
                        <ImagePlus size={16} className="text-slate-300" />
                        <span className="text-[9px] text-slate-300 font-medium">
                          Баннер нэмнэ үү
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Categories */}
                  {selectedCats.length > 0 && (
                    <div className="px-3 pb-3">
                      <p className="text-[9px] font-bold text-slate-500 mb-2">
                        Ангиллууд
                      </p>
                      <div className="flex gap-3 overflow-x-hidden pb-0.5">
                        {selectedCats.slice(0, 5).map((cat) => (
                          <div
                            key={cat.id}
                            className="flex flex-col items-center gap-1 shrink-0 w-[44px]"
                          >
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-100/50 flex items-center justify-center shadow-sm">
                              <CatIcon icon={cat.icon} size={18} />
                            </div>
                            <span className="text-[7px] font-medium text-slate-500 max-w-[44px] truncate text-center leading-tight">
                              {cat.name}
                            </span>
                          </div>
                        ))}
                        {selectedCats.length > 5 && (
                          <div className="flex flex-col items-center gap-1 shrink-0 w-[44px]">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                              <Plus size={14} className="text-slate-400" />
                            </div>
                            <span className="text-[7px] font-medium text-slate-400">
                              +{selectedCats.length - 5}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Product skeleton */}
                  <div className="px-3 pb-4">
                    <p className="text-[9px] font-bold text-slate-500 mb-2">
                      Бүтээгдэхүүн
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden"
                        >
                          <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50" />
                          <div className="p-2 space-y-1.5">
                            <div className="h-1.5 w-4/5 rounded-full bg-slate-200" />
                            <div className="h-1.5 w-3/5 rounded-full bg-slate-100" />
                            <div className="h-2 w-2/5 rounded-full bg-amber-200/60 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Home bar */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-[100px] h-[4px] rounded-full bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
