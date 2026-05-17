"use client";

import { useState } from "react";
import { ImageIcon, X, Loader2, GripHorizontal } from "lucide-react";
import { authFetch, API } from "@/lib/api";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUploadGrid({ images, onChange, maxImages = 5 }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadToServer = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await authFetch(`${API}/products/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url as string;
    } catch {
      return null;
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";

    setUploading(true);
    const current = [...images];
    for (const file of files) {
      if (current.length >= maxImages) break;
      const url = await uploadToServer(file);
      if (url) current.push(url);
    }
    onChange(current.slice(0, maxImages));
    setUploading(false);
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const moveImage = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const slots = Array.from({ length: maxImages });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">
          Зурагнууд <span className="text-slate-400 font-normal ml-1">({images.length}/{maxImages})</span>
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {slots.map((_, idx) => {
          const img = images[idx];
          const isFirst = idx === 0;

          if (img) {
            return (
              <div
                key={idx}
                draggable
                onDragStart={() => setDragging(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging !== null && dragging !== idx) {
                    moveImage(dragging, idx);
                  }
                  setDragging(null);
                }}
                className={`relative group aspect-square rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-300 ${
                  isFirst ? "ring-2 ring-indigo-500 ring-offset-2" : "border border-slate-200"
                } ${dragging === idx ? "opacity-40 scale-95" : "hover:shadow-md"}`}
              >
                <img
                  src={img}
                  alt={`Зураг ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {isFirst && (
                  <div className="absolute top-2 left-2 bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md shadow-sm">
                    Үндсэн
                  </div>
                )}

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-[-10px] group-hover:translate-y-0">
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="bg-white/90 backdrop-blur-sm text-slate-700 hover:text-red-500 rounded-full p-1.5 shadow-sm transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-white/80 transition-all duration-300 translate-y-[10px] group-hover:translate-y-0">
                  <GripHorizontal size={18} />
                </div>
              </div>
            );
          }

          const canAdd = idx === images.length && !uploading;
          const isUploadingSlot = idx === images.length && uploading;

          return (
            <label
              key={idx}
              className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 ${
                canAdd
                  ? "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer text-slate-500 hover:text-indigo-600"
                  : isUploadingSlot
                  ? "border-indigo-300 bg-indigo-50/50 text-indigo-500"
                  : "border-slate-100 bg-slate-50/50 text-slate-300 cursor-not-allowed"
              }`}
            >
              {isUploadingSlot ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs font-medium">Хуулж байна...</span>
                </div>
              ) : canAdd ? (
                <div className="flex flex-col items-center gap-2 group">
                  <div className="p-3 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                    <ImageIcon size={20} className="text-slate-400 group-hover:text-indigo-500" />
                  </div>
                  <span className="text-xs font-medium">Зураг нэмэх</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={handleInputChange}
                  />
                </div>
              ) : (
                <span className="text-sm font-medium">{idx + 1}</span>
              )}
            </label>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100 inline-flex">
        <GripHorizontal size={14} className="text-slate-400" />
        Зурагнуудыг чирэх замаар дахин эрэмбэлж болно.
      </p>
    </div>
  );
}
