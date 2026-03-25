import { MoveLeft, MoveRight, Trash2 } from "lucide-react";
import Image from "next/image";

type Props = {
  url: string;
  index: number;
  total: number;
  onRemove: (index: number) => void;
  onSwap: (i: number, j: number) => void;
};

export function BannerCard({ url, index, total, onRemove, onSwap }: Props) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group aspect-[2/1] md:aspect-[5/3] shadow-sm hover:shadow-md transition-all">
      <Image
        src={url}
        alt={`Баннер ${index + 1}`}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        unoptimized={url.startsWith("data:")}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="absolute top-3 left-3 z-10 flex text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl overflow-hidden backdrop-blur-md border border-white/10">
        <button
          onClick={() => onSwap(index, index - 1)}
          disabled={index === 0}
          className="p-1.5 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Зүүн тийш зөөх"
        >
          <MoveLeft size={16} />
        </button>
        <div className="w-px bg-white/20" />
        <button
          onClick={() => onSwap(index, index + 1)}
          disabled={index === total - 1}
          className="p-1.5 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Баруун тийш зөөх"
        >
          <MoveRight size={16} />
        </button>
      </div>

      <button
        onClick={() => onRemove(index)}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
        title="Устгах"
      >
        <Trash2 size={15} />
      </button>

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="bg-white/90 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
          Слайд {index + 1}
        </span>
      </div>
    </div>
  );
}
