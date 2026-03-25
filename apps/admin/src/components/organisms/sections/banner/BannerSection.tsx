import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { BannerCard } from "@/components/molecules/sections/banner/BannerCard";
import { MAX_BANNERS } from "@/lib/sections/constants";

type Props = {
  banners: string[];
  setBanners: React.Dispatch<React.SetStateAction<string[]>>;
};

export function BannerSection({ banners, setBanners }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || banners.length >= MAX_BANNERS) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setBanners((prev) => [...prev, result]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
  );
}
