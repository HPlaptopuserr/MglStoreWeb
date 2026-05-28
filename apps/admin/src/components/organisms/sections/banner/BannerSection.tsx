import { useRef, useState } from "react";
import {
  CheckCircle2,
  ImagePlus,
  Layers3,
  Loader2,
  Palette,
  Trash2,
  Type,
  Upload,
  Wand2,
} from "lucide-react";
import { BannerCard } from "@/components/molecules/sections/banner/BannerCard";
import { MAX_BANNERS } from "@/lib/sections/constants";
import { API, adminFetch } from "@/lib/api";

// Banner-г canvas-р 1920px хүртэл resize хийж JPEG 82% чанараар буцаана
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_W = 1920;
      const scale = img.width > MAX_W ? MAX_W / img.width : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Compress алдаа")), "image/jpeg", 0.82);
    };
    img.onerror = reject;
    img.src = url;
  });
}

type Props = {
  banners: string[];
  setBanners: React.Dispatch<React.SetStateAction<string[]>>;
};

type BannerMode = "upload" | "template";

const TEMPLATE_PALETTES = [
  {
    id: "gold",
    label: "Gold luxury",
    bg: "#0f172a",
    bg2: "#1e293b",
    accent: "#f59e0b",
    accent2: "#fde68a",
    text: "#ffffff",
    muted: "#cbd5e1",
  },
  {
    id: "emerald",
    label: "Emerald premium",
    bg: "#052e2b",
    bg2: "#0f766e",
    accent: "#34d399",
    accent2: "#ccfbf1",
    text: "#ffffff",
    muted: "#ccfbf1",
  },
  {
    id: "white",
    label: "Clean commerce",
    bg: "#fff7ed",
    bg2: "#ffffff",
    accent: "#ea580c",
    accent2: "#fed7aa",
    text: "#111827",
    muted: "#64748b",
  },
];

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const createTemplateBanner = ({
  eyebrow,
  title,
  subtitle,
  cta,
  paletteId,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  paletteId: string;
}) => {
  const palette =
    TEMPLATE_PALETTES.find((item) => item.id === paletteId) ?? TEMPLATE_PALETTES[0];
  const safeEyebrow = escapeSvgText(eyebrow.trim() || "MGL Store");
  const safeTitle = escapeSvgText(title.trim() || "Таны бизнесийн шинэ боломж");
  const safeSubtitle = escapeSvgText(
    subtitle.trim() || "Худалдаа, үйлчилгээ, хамтын ажиллагааг нэг платформоос удирдаарай.",
  );
  const safeCta = escapeSvgText(cta.trim() || "Дэлгэрэнгүй");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="640" viewBox="0 0 1920 640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.bg}"/>
      <stop offset="1" stop-color="${palette.bg2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="16%" r="62%">
      <stop offset="0" stop-color="${palette.accent2}" stop-opacity="0.36"/>
      <stop offset="0.42" stop-color="${palette.accent}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.22"/>
    </filter>
    <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
      <path d="M 54 0 L 0 0 0 54" fill="none" stroke="#ffffff" stroke-opacity="0.045" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1920" height="640" fill="url(#bg)"/>
  <rect width="1920" height="640" fill="url(#glow)"/>
  <rect width="1920" height="640" fill="url(#grid)"/>
  <circle cx="1620" cy="72" r="280" fill="${palette.accent}" opacity="0.10"/>
  <circle cx="1510" cy="532" r="360" fill="${palette.accent2}" opacity="0.12"/>
  <path d="M1208 86 C1390 126 1530 250 1676 476" fill="none" stroke="${palette.accent2}" stroke-width="2" opacity="0.24"/>
  <path d="M1262 150 C1418 184 1530 292 1628 444" fill="none" stroke="${palette.accent}" stroke-width="3" opacity="0.22"/>

  <g transform="translate(156,116)">
    <rect x="0" y="0" width="230" height="46" rx="23" fill="${palette.accent}" opacity="0.14"/>
    <text x="26" y="30" fill="${palette.accent}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="850" letter-spacing="4">${safeEyebrow}</text>
    <text x="0" y="154" fill="${palette.text}" font-family="Inter, Arial, sans-serif" font-size="76" font-weight="920" letter-spacing="-2">
      ${safeTitle}
    </text>
    <text x="0" y="224" fill="${palette.muted}" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="520">
      ${safeSubtitle}
    </text>
    <g transform="translate(0,310)" filter="url(#shadow)">
      <rect width="268" height="66" rx="20" fill="${palette.accent}"/>
      <text x="36" y="42" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="920" letter-spacing="1.2">${safeCta}</text>
      <path d="M220 33 H238 M230 25 L238 33 L230 41" stroke="#111827" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>

  <g transform="translate(1135,126)" filter="url(#shadow)">
    <rect width="512" height="372" rx="42" fill="#ffffff" opacity="0.14"/>
    <rect x="34" y="36" width="444" height="300" rx="32" fill="#ffffff" opacity="0.11"/>
    <rect x="76" y="82" width="210" height="22" rx="11" fill="${palette.accent2}" opacity="0.80"/>
    <rect x="76" y="138" width="332" height="18" rx="9" fill="#ffffff" opacity="0.46"/>
    <rect x="76" y="182" width="286" height="18" rx="9" fill="#ffffff" opacity="0.32"/>
    <rect x="76" y="242" width="146" height="48" rx="16" fill="${palette.accent}" opacity="0.94"/>
    <circle cx="390" cy="244" r="54" fill="${palette.accent2}" opacity="0.18"/>
    <circle cx="428" cy="104" r="22" fill="${palette.accent}" opacity="0.42"/>
  </g>
</svg>`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export function BannerSection({ banners, setBanners }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<BannerMode>("upload");
  const [templateOpen, setTemplateOpen] = useState(true);
  const [templatePalette, setTemplatePalette] = useState(TEMPLATE_PALETTES[0].id);
  const [templateEyebrow, setTemplateEyebrow] = useState("MGL Store");
  const [templateTitle, setTemplateTitle] = useState("Таны бизнесийн шинэ боломж");
  const [templateSubtitle, setTemplateSubtitle] = useState(
    "Худалдаа, үйлчилгээ, хамтын ажиллагааг нэг платформоос удирдаарай.",
  );
  const [templateCta, setTemplateCta] = useState("Дэлгэрэнгүй");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || banners.length >= MAX_BANNERS) return;
    setUploading(true);
    setUploadError(null);
    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.append("image", compressed, "banner.jpg");
      const res = await adminFetch(`${API}/site-settings/banner-upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Upload алдаа");
      const { url } = await res.json() as { url: string };
      setBanners((prev) => [...prev, url]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload алдаа гарлаа");
    } finally {
      setUploading(false);
    }
  };

  const removeBanner = (index: number) => {
    setBanners((prev) => prev.filter((_, i) => i !== index));
  };

  const swapBanners = (i: number, j: number) => {
    setBanners((prev) => {
      const next = [...prev];
      const temp = next[i];
      next[i] = next[j];
      next[j] = temp;
      return next;
    });
  };

  const templatePreview = createTemplateBanner({
    eyebrow: templateEyebrow,
    title: templateTitle,
    subtitle: templateSubtitle,
    cta: templateCta,
    paletteId: templatePalette,
  });

  const addTemplateBanner = () => {
    if (banners.length >= MAX_BANNERS) return;
    setBanners((prev) => [...prev, templatePreview]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r lg:p-6">
            <div className="mb-5">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                <Layers3 size={13} />
                Banner studio
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                Промо баннер
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Зураг upload хийх эсвэл premium default загвараар text banner үүсгээд
                нүүр хуудасны slider-т нэмнэ.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                {
                  key: "upload" as const,
                  title: "Зураг upload",
                  desc: "Бэлэн дизайнтай PNG, JPG, WEBP banner оруулах",
                  icon: Upload,
                },
                {
                  key: "template" as const,
                  title: "Default загвар",
                  desc: "Text болон palette сонгоод banner автоматаар үүсгэх",
                  icon: Type,
                },
              ].map(({ key, title, desc, icon: Icon }) => {
                const active = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? "border-violet-200 bg-violet-50 ring-2 ring-violet-100"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        active
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-white"
                      }`}
                    >
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-slate-900">{title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{desc}</span>
                    </span>
                    {active && <CheckCircle2 size={18} className="mt-1 text-violet-600" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Banner slots
                </p>
                <p className="text-sm font-black text-slate-900">
                  {banners.length}/{MAX_BANNERS}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {Array.from({ length: MAX_BANNERS }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full ${
                      index < banners.length ? "bg-violet-600" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#fbfcff] p-5 lg:p-6">
            {mode === "upload" ? (
              <div className="flex h-full min-h-[360px] flex-col">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">Upload banner</p>
                    <p className="text-xs text-slate-500">1920x640 орчим ratio санал болгож байна.</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                    Image mode
                  </span>
                </div>

                <div
                  onClick={() => !uploading && banners.length < MAX_BANNERS && fileRef.current?.click()}
                  className={`flex flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-white p-8 text-center shadow-sm transition-all ${
                    uploading
                      ? "cursor-wait border-violet-200 opacity-70"
                      : banners.length >= MAX_BANNERS
                        ? "cursor-not-allowed border-slate-200 opacity-60"
                        : "cursor-pointer border-slate-300 hover:border-violet-400 hover:bg-violet-50/35"
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 shadow-sm">
                    {uploading ? <Loader2 size={28} className="animate-spin" /> : <ImagePlus size={28} />}
                  </div>
                  <p className="mt-4 text-base font-black text-slate-900">
                    {uploading ? "Зураг оруулж байна..." : "Banner зураг сонгох"}
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    PNG, JPG, WEBP файл дэмжинэ. Upload хийх үед автоматаар шахаж,
                    storage-д хадгална.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">Template editor</p>
                      <p className="text-xs text-slate-500">Text-ээ бичээд live preview харна.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTemplateOpen((prev) => !prev)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                    >
                      {templateOpen ? "Хураах" : "Нээх"}
                    </button>
                  </div>

                  {templateOpen && (
                    <>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                          <Palette size={13} />
                          Загвар
                        </label>
                        <div className="grid gap-2">
                          {TEMPLATE_PALETTES.map((palette) => (
                            <button
                              key={palette.id}
                              type="button"
                              onClick={() => setTemplatePalette(palette.id)}
                              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${
                                templatePalette === palette.id
                                  ? "border-violet-300 bg-violet-50"
                                  : "border-slate-200 bg-white hover:bg-slate-50"
                              }`}
                            >
                              <span className="text-sm font-bold text-slate-700">{palette.label}</span>
                              <span className="flex gap-1.5">
                                {[palette.bg, palette.accent, palette.accent2].map((color) => (
                                  <span
                                    key={color}
                                    className="h-5 w-5 rounded-full border border-white shadow-sm ring-1 ring-slate-200"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {[
                        { label: "Eyebrow", value: templateEyebrow, set: setTemplateEyebrow, placeholder: "MGL Store" },
                        { label: "Гарчиг", value: templateTitle, set: setTemplateTitle, placeholder: "Таны бизнесийн шинэ боломж" },
                        { label: "Тайлбар", value: templateSubtitle, set: setTemplateSubtitle, placeholder: "Богино тайлбар" },
                        { label: "Button text", value: templateCta, set: setTemplateCta, placeholder: "Дэлгэрэнгүй" },
                      ].map((field) => (
                        <div key={field.label}>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                            {field.label}
                          </label>
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => field.set(e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          />
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addTemplateBanner}
                        disabled={banners.length >= MAX_BANNERS}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Wand2 size={16} />
                        Banner үүсгэж нэмэх
                      </button>
                    </>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live preview
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                      1920 × 640
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70">
                    <div className="relative aspect-[3/1] overflow-hidden rounded-2xl bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={templatePreview} alt="Default banner preview" className="h-full w-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {uploadError && (
        <p className="text-sm text-red-500">{uploadError}</p>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-black text-slate-950">Одоогийн banner-ууд</h3>
            <p className="text-sm text-slate-500">Дарааллыг сольж, шаардлагагүй banner-ийг устгана.</p>
          </div>
          {banners.length > 0 && (
            <button
              onClick={() => setBanners([])}
              className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100"
            >
              <Trash2 size={14} />
              Бүгдийг устгах
            </button>
          )}
        </div>

        {banners.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <div>
              <ImagePlus className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-500">Banner нэмээгүй байна</p>
              <p className="mt-1 text-xs text-slate-400">Upload эсвэл default загвараар эхний banner-аа үүсгэнэ.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {banners.map((url, i) => (
              <BannerCard
                key={i}
                url={url}
                index={i}
                total={banners.length}
                onRemove={removeBanner}
                onSwap={swapBanners}
              />
            ))}
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
    </div>
  );
}
