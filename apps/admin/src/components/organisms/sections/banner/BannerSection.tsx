import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
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

export function BannerSection({ banners, setBanners }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Промо баннерууд</h2>
        <p className="text-sm text-slate-400">
          Нүүр хуудсанд харагдах слайдер баннер зургууд. Хамгийн ихдээ {MAX_BANNERS} зураг
          оруулах боломжтой.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

        {banners.length < MAX_BANNERS && (
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className={`relative w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 transition-all flex flex-col items-center justify-center gap-3 text-slate-400 aspect-[2/1] md:aspect-[5/3] group shadow-sm ${uploading ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 hover:text-violet-600"}`}
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              {uploading
                ? <Loader2 size={24} className="text-violet-500 animate-spin" />
                : <ImagePlus size={24} className="text-violet-500" strokeWidth={2} />}
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm text-slate-700">{uploading ? "Зураг оруулж байна..." : "Баннер нэмэх"}</p>
              <p className="text-xs mt-1 text-slate-500">{banners.length} / {MAX_BANNERS}</p>
            </div>
          </div>
        )}
        {uploadError && (
          <p className="col-span-full text-sm text-red-500">{uploadError}</p>
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
  );
}
